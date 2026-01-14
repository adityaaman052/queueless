import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { verifyAuth } from '@/middleware/auth';

export async function POST(request, { params }) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult.error) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const roomId = params.id;
    const { tokenId } = await request.json();

    const pool = getPool();

    // Verify user is admin of this room
    const roomResult = await pool.query(
      'SELECT * FROM rooms WHERE id = $1 AND admin_id = $2',
      [roomId, authResult.user.id]
    );

    if (roomResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized or room not found' },
        { status: 403 }
      );
    }

    // Mark token as SKIPPED
    await pool.query(
      'UPDATE tokens SET status = $1 WHERE id = $2 AND room_id = $3',
      ['SKIPPED', tokenId, roomId]
    );

    return NextResponse.json({
      success: true,
      message: 'Token skipped successfully'
    });
  } catch (error) {
    console.error('Error skipping token:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to skip token' },
      { status: 500 }
    );
  }
}