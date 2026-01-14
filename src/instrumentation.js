// src/instrumentation.js
// This file runs ONCE when the Next.js server starts
// Perfect for starting cron jobs!

export async function register() {
  // Only run on server side (not in browser)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('🚀 Server starting...');
    
    // Import cron jobs (dynamic import for server-only code)
    const { startCronJobs } = await import('./lib/cronJobs');
    
    // Start all scheduled jobs
    startCronJobs();
    
    console.log('✅ Cron jobs initialized');
  }
}

// Optional: Cleanup on shutdown
export async function onExit() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('🛑 Server shutting down...');
    
    const { stopCronJobs } = await import('./lib/cronJobs');
    stopCronJobs();
    
    console.log('✅ Cron jobs stopped');
  }
}