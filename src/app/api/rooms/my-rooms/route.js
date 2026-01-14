import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { verifyAuth } from '@/middleware/auth';

export async function GET(request) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult.error) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const pool = getPool();
    const result = await pool.query(
      `SELECT 
        r.*,
        COUNT(t.id) as total_tokens_today
      FROM rooms r
      LEFT JOIN tokens t ON r.id = t.room_id AND DATE(t.created_at) = CURRENT_DATE
      WHERE r.admin_id = $1
      GROUP BY r.id
      ORDER BY r.created_at DESC`,
      [authResult.user.id]
    );

    return NextResponse.json({ success: true, rooms: result.rows });
  } catch (error) {
    console.error('Error fetching my rooms:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch rooms' },
      { status: 500 }
    );
  }
}