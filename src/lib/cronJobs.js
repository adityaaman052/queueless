// src/lib/cronJobs.js
// Schedules automated jobs (daily reset at midnight IST)
// NEW
import cron from 'node-cron';
import { performDailyReset, checkAndResetIfNeeded } from './dailyReset.js';

let isScheduled = false;

/**
 * Start all cron jobs
 */
function startCronJobs() {
  if (isScheduled) {
    console.log('⚠️ Cron jobs already scheduled');
    return;
  }

  console.log('🕐 Starting cron jobs...');

  // ========================================
  // JOB 1: Daily Reset at Midnight IST
  // Cron syntax: '0 0 * * *' = At 00:00 (midnight) every day
  // Timezone: Asia/Kolkata (IST = UTC+5:30)
  // ========================================
  
  cron.schedule('0 0 * * *', async () => {
    console.log('\n⏰ MIDNIGHT RESET TRIGGERED');
    console.log('Time:', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
    
    try {
      await performDailyReset();
      console.log('✅ Midnight reset completed successfully\n');
    } catch (error) {
      console.error('❌ Midnight reset failed:', error.message);
    }
  }, {
    timezone: 'Asia/Kolkata'  // IST timezone
  });

  console.log('✅ Cron job scheduled: Daily reset at 00:00 IST');

  // ========================================
  // JOB 2: Hourly Health Check (Optional)
  // Runs every hour to check system status
  // ========================================
  
  cron.schedule('0 * * * *', async () => {
    const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    console.log(`🔍 Hourly check at ${now} - System running`);
  }, {
    timezone: 'Asia/Kolkata'
  });

  console.log('✅ Cron job scheduled: Hourly health check');

  // ========================================
  // STARTUP CHECK
  // Check if reset was missed (e.g., server was down at midnight)
  // ========================================
  
  setTimeout(async () => {
    console.log('🔄 Running startup check for missed resets...');
    try {
      await checkAndResetIfNeeded();
    } catch (error) {
      console.error('❌ Startup check failed:', error);
    }
  }, 5000); // Wait 5 seconds after server starts

  isScheduled = true;
}

/**
 * Stop all cron jobs (for graceful shutdown)
 */
function stopCronJobs() {
  if (isScheduled) {
    cron.getTasks().forEach(task => task.stop());
    console.log('🛑 All cron jobs stopped');
    isScheduled = false;
  }
}

/**
 * Get status of cron jobs
 */
function getCronStatus() {
  return {
    scheduled: isScheduled,
    totalJobs: cron.getTasks().size,
    timezone: 'Asia/Kolkata',
    nextMidnight: getNextMidnightIST()
  };
}

/**
 * Calculate next midnight in IST
 */
function getNextMidnightIST() {
  const now = new Date();
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  
  // Set to next midnight
  ist.setHours(24, 0, 0, 0);
  
  return ist.toISOString();
}

// NEW ES Modules
export {
  startCronJobs,
  stopCronJobs,
  getCronStatus
};