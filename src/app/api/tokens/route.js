import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { verifyAuth } from '@/middleware/auth';

export async function POST(request) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult.error) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const { roomId } = await request.json();

    if (!roomId) {
      return NextResponse.json(
        { success: false, error: 'Room ID is required' },
        { status: 400 }
      );
    }

    const pool = getPool();

    // Check if room exists and is open
    const roomResult = await pool.query(
      'SELECT * FROM rooms WHERE id = $1',
      [roomId]
    );

    if (roomResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Room not found' },
        { status: 404 }
      );
    }

    const room = roomResult.rows[0];

    if (!room.is_open) {
      return NextResponse.json(
        { success: false, error: 'Room is closed for new tokens' },
        { status: 400 }
      );
    }

    // Check if user already has an active token for this room today
    const existingTokenResult = await pool.query(
      `SELECT * FROM tokens 
       WHERE room_id = $1 
       AND user_id = $2 
       AND status IN ('WAITING', 'ACTIVE')
       AND DATE(created_at) = CURRENT_DATE`,
      [roomId, authResult.user.id]
    );

    if (existingTokenResult.rows.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'You already have an active token for this room',
          existingToken: existingTokenResult.rows[0]
        },
        { status: 400 }
      );
    }

    // Check daily limit
    const todayTokensResult = await pool.query(
      `SELECT COUNT(*) as count FROM tokens 
       WHERE room_id = $1 AND DATE(created_at) = CURRENT_DATE`,
      [roomId]
    );

    const todayCount = parseInt(todayTokensResult.rows[0].count);

    if (todayCount >= room.daily_limit) {
      return NextResponse.json(
        { success: false, error: 'Daily token limit reached for this room' },
        { status: 400 }
      );
    }

    // Get the next token number
    const maxTokenResult = await pool.query(
      `SELECT COALESCE(MAX(token_number), 0) as max_token 
       FROM tokens 
       WHERE room_id = $1 AND DATE(created_at) = CURRENT_DATE`,
      [roomId]
    );

    const nextTokenNumber = parseInt(maxTokenResult.rows[0].max_token) + 1;

    // Create token
    const tokenResult = await pool.query(
      `INSERT INTO tokens (room_id, user_id, token_number, status) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [roomId, authResult.user.id, nextTokenNumber, 'WAITING']
    );

    const token = tokenResult.rows[0];

    // Get tokens ahead count
    const tokensAheadResult = await pool.query(
      `SELECT COUNT(*) as count FROM tokens 
       WHERE room_id = $1 
       AND token_number < $2 
       AND status IN ('WAITING', 'ACTIVE')
       AND DATE(created_at) = CURRENT_DATE`,
      [roomId, nextTokenNumber]
    );

    const tokensAhead = parseInt(tokensAheadResult.rows[0].count);

    return NextResponse.json({
      success: true,
      message: 'Token created successfully',
      token: {
        ...token,
        tokensAhead,
        estimatedWaitMinutes: tokensAhead * 5 // Assume 5 min per token
      }
    });
  } catch (error) {
    console.error('Error creating token:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create token' },
      { status: 500 }
    );
  }
}
