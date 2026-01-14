import { NextResponse } from 'next/server';
import { verifyAuth } from '@/middleware/auth';
import { getPool } from '@/lib/db';

export async function GET(request) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error });
    }

    const pool = getPool();
    
    // Get user's rooms
    const roomsResult = await pool.query(
      'SELECT * FROM rooms WHERE admin_id = $1',
      [authResult.user.id]
    );

    return NextResponse.json({
      user: authResult.user,
      rooms: roomsResult.rows
    });
  } catch (error) {
    return NextResponse.json({ error: error.message });
  }
}