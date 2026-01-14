// src/lib/dailyReset.js
// Logic for daily midnight reset and token archiving

import { getPool } from './db.js';

/**
 * Main function: Archive yesterday's tokens and reset for new day
 * Called at midnight IST (00:00)
 */
async function performDailyReset() {
  const pool = getPool();
  const startTime = Date.now();
  
  console.log('🌙 Starting daily reset at:', new Date().toISOString());
  
  // ✅ FIX: Don't destructure pool.query result
  const logResult = await pool.query(
    `INSERT INTO cron_logs (job_name, status, started_at)
     VALUES ('daily_reset', 'RUNNING', NOW())
     RETURNING id`
  );
  const logId = logResult.rows[0].id;
  
  let totalRoomsProcessed = 0;
  let totalTokensArchived = 0;
  let totalTokensCarriedForward = 0;
  
  try {
    // Get all rooms
    const roomsResult = await pool.query('SELECT id FROM rooms');
    const rooms = roomsResult.rows;
    
    console.log(`📋 Processing ${rooms.length} rooms...`);
    
    // Process each room
    for (const room of rooms) {
      const roomId = room.id;
      
      try {
        const result = await resetRoomForNewDay(roomId);
        totalRoomsProcessed++;
        totalTokensArchived += result.archived;
        totalTokensCarriedForward += result.carriedForward;
        
        console.log(`✅ Room ${roomId}: Archived ${result.archived}, Carried forward ${result.carriedForward}`);
      } catch (error) {
        console.error(`❌ Error processing room ${roomId}:`, error);
        // Continue with other rooms even if one fails
      }
    }
    
    const duration = Math.floor((Date.now() - startTime) / 1000);
    
    // Update cron log as SUCCESS
    await pool.query(
      `UPDATE cron_logs 
       SET status = 'SUCCESS', 
           completed_at = NOW(),
           duration_seconds = $1,
           rooms_processed = $2,
           tokens_archived = $3,
           tokens_carried_forward = $4
       WHERE id = $5`,
      [duration, totalRoomsProcessed, totalTokensArchived, totalTokensCarriedForward, logId]
    );
    
    console.log('✅ Daily reset completed successfully!');
    console.log(`   Rooms: ${totalRoomsProcessed}, Archived: ${totalTokensArchived}, Carried: ${totalTokensCarriedForward}`);
    
    return {
      success: true,
      roomsProcessed: totalRoomsProcessed,
      tokensArchived: totalTokensArchived,
      tokensCarriedForward: totalTokensCarriedForward,
      duration
    };
    
  } catch (error) {
    console.error('❌ Daily reset failed:', error);
    
    // Update cron log as FAILED
    await pool.query(
      `UPDATE cron_logs 
       SET status = 'FAILED', 
           completed_at = NOW(),
           error_message = $1,
           rooms_processed = $2,
           tokens_archived = $3
       WHERE id = $4`,
      [error.message, totalRoomsProcessed, totalTokensArchived, logId]
    );
    
    throw error;
  }
}

/**
 * Reset a single room for new day
 * 1. Archive completed/expired tokens to history
 * 2. Keep waiting tokens for next day
 * 3. Update daily stats
 * 4. Reset current_token to 0
 */
async function resetRoomForNewDay(roomId) {
  const pool = getPool();
  const yesterday = getYesterdayDate();
  
  console.log(`  Processing room ${roomId} for date ${yesterday}...`);
  
  // Start transaction
  await pool.query('BEGIN');
  
  try {
    // 1. Get all tokens from yesterday
    const tokensResult = await pool.query(
      `SELECT t.*, u.name as user_name, u.email as user_email, u.firebase_uid
       FROM tokens t
       LEFT JOIN users u ON t.user_id = u.id
       WHERE t.room_id = $1 
         AND DATE(t.created_at) < CURRENT_DATE`,
      [roomId]
    );
    
    const tokens = tokensResult.rows;
    
    if (tokens.length === 0) {
      await pool.query('COMMIT');
      return { archived: 0, carriedForward: 0 };
    }
    
    let archivedCount = 0;
    let carriedForwardCount = 0;
    let completedCount = 0;
    let expiredCount = 0;
    
    let totalWaitTime = 0;
    let totalServiceTime = 0;
    let waitTimeCount = 0;
    let serviceTimeCount = 0;
    
    // 2. Process each token
    for (const token of tokens) {
      const status = token.status.toUpperCase();
      
      if (status === 'WAITING') {
        // Carry forward to today - just update created_at to today
        await pool.query(
          `UPDATE tokens 
           SET created_at = NOW(),
               updated_at = NOW()
           WHERE id = $1`,
          [token.id]
        );
        carriedForwardCount++;
        
      } else {
        // Archive completed/active/expired tokens
        let finalStatus = status;
        if (status === 'ACTIVE') {
          finalStatus = 'EXPIRED'; // Active tokens that weren't completed
        }
        
        // Calculate wait time (created to called)
        let waitTimeMinutes = null;
        if (token.called_at) {
          waitTimeMinutes = Math.floor(
            (new Date(token.called_at) - new Date(token.created_at)) / 60000
          );
          totalWaitTime += waitTimeMinutes;
          waitTimeCount++;
        }
        
        // Calculate service duration (called to completed)
        let serviceDurationMinutes = null;
        if (token.called_at && token.completed_at) {
          serviceDurationMinutes = Math.floor(
            (new Date(token.completed_at) - new Date(token.called_at)) / 60000
          );
          totalServiceTime += serviceDurationMinutes;
          serviceTimeCount++;
        }
        
        // Insert into history
        await pool.query(
          `INSERT INTO token_history 
           (room_id, user_id, token_number, service_date, final_status,
            wait_time_minutes, service_duration_minutes,
            created_at, called_at, completed_at,
            user_name, user_email, user_firebase_uid, archived_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())`,
          [
            token.room_id,
            token.user_id,
            token.token_number,
            yesterday,
            finalStatus,
            waitTimeMinutes,
            serviceDurationMinutes,
            token.created_at,
            token.called_at || null,
            token.completed_at || null,
            token.user_name,
            token.user_email,
            token.firebase_uid
          ]
        );
        
        // Delete from tokens table
        await pool.query('DELETE FROM tokens WHERE id = $1', [token.id]);
        
        archivedCount++;
        if (finalStatus === 'COMPLETED') completedCount++;
        if (finalStatus === 'EXPIRED') expiredCount++;
      }
    }
    
    // 3. Create or update daily_stats
    const avgWaitTime = waitTimeCount > 0 ? totalWaitTime / waitTimeCount : null;
    const avgServiceTime = serviceTimeCount > 0 ? totalServiceTime / serviceTimeCount : null;
    
    await pool.query(
      `INSERT INTO daily_stats 
       (room_id, service_date, total_tokens, completed_tokens, expired_tokens,
        active_tokens, avg_wait_time_minutes, avg_service_duration_minutes, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       ON CONFLICT (room_id, service_date) 
       DO UPDATE SET
         total_tokens = $3,
         completed_tokens = $4,
         expired_tokens = $5,
         active_tokens = $6,
         avg_wait_time_minutes = $7,
         avg_service_duration_minutes = $8,
         updated_at = NOW()`,
      [
        roomId,
        yesterday,
        tokens.length,
        completedCount,
        expiredCount,
        carriedForwardCount,
        avgWaitTime,
        avgServiceTime
      ]
    );
    
    // 4. Reset room's current_token to 0
    await pool.query(
      `UPDATE rooms SET current_token = 0, updated_at = NOW() WHERE id = $1`,
      [roomId]
    );
    
    // Commit transaction
    await pool.query('COMMIT');
    
    return {
      archived: archivedCount,
      carriedForward: carriedForwardCount
    };
    
  } catch (error) {
    // Rollback on error
    await pool.query('ROLLBACK');
    throw error;
  }
}

/**
 * Get yesterday's date in YYYY-MM-DD format (IST timezone)
 */
function getYesterdayDate() {
  const now = new Date();
  // Adjust to IST (UTC+5:30)
  const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
  ist.setDate(ist.getDate() - 1);
  return ist.toISOString().split('T')[0];
}

/**
 * Check if any room needs reset (called on app startup)
 */
async function checkAndResetIfNeeded() {
  const pool = getPool();
  
  try {
    // Check if we already ran today
    const today = new Date().toISOString().split('T')[0];
    
    // ✅ FIX: Don't destructure, get the result object
    const lastRun = await pool.query(
      `SELECT * FROM cron_logs 
       WHERE job_name = 'daily_reset' 
         AND status = 'SUCCESS'
         AND DATE(started_at) = $1
       ORDER BY started_at DESC 
       LIMIT 1`,
      [today]
    );
    
    // ✅ FIX: Access .rows property
    if (lastRun.rows.length === 0) {
      console.log('⚠️ Daily reset not run today. Running now...');
      await performDailyReset();
    } else {
      console.log('✅ Daily reset already completed today');
    }
  } catch (error) {
    console.error('Error checking reset status:', error);
  }
}

export {
  performDailyReset,
  resetRoomForNewDay,
  checkAndResetIfNeeded
};