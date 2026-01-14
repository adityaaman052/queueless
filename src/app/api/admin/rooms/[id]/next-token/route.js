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

    // Mark current ACTIVE token as COMPLETED
    await pool.query(
      `UPDATE tokens 
       SET status = 'COMPLETED' 
       WHERE room_id = $1 
       AND status = 'ACTIVE' 
       AND DATE(created_at) = CURRENT_DATE`,
      [roomId]
    );

    // Get next WAITING token
    const nextTokenResult = await pool.query(
      `SELECT * FROM tokens 
       WHERE room_id = $1 
       AND status = 'WAITING' 
       AND DATE(created_at) = CURRENT_DATE
       ORDER BY token_number ASC 
       LIMIT 1`,
      [roomId]
    );

    if (nextTokenResult.rows.length === 0) {
      return NextResponse.json(
        { success: true, message: 'No more tokens in queue', nextToken: null }
      );
    }

    // Mark next token as ACTIVE
    const nextToken = nextTokenResult.rows[0];
    await pool.query(
      'UPDATE tokens SET status = $1 WHERE id = $2',
      ['ACTIVE', nextToken.id]
    );

    // Update room's current_token
    await pool.query(
      'UPDATE rooms SET current_token = $1 WHERE id = $2',
      [nextToken.token_number, roomId]
    );

    return NextResponse.json({
      success: true,
      message: 'Next token called successfully',
      nextToken: {
        ...nextToken,
        status: 'ACTIVE'
      }
    });
  } catch (error) {
    console.error('Error calling next token:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to call next token' },
      { status: 500 }
    );
  }
}

