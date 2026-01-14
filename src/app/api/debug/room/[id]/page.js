// ========================================
// FILE: src/app/api/debug-room/[id]/route.js
// Debug endpoint to check room access
// ========================================
import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { verifyAuth } from '@/middleware/auth';

export async function GET(request, { params }) {
  try {
    const { id: roomId } = await params;
    
    // Check auth
    const authResult = await verifyAuth(request);
    const pool = getPool();

    // Get room
    const roomResult = await pool.query(
      'SELECT * FROM rooms WHERE id = $1',
      [roomId]
    );

    // Get user's rooms
    const myRoomsResult = await pool.query(
      'SELECT * FROM rooms WHERE admin_id = $1',
      [authResult.user?.id]
    );

    return NextResponse.json({
      success: true,
      debug: {
        requestedRoomId: roomId,
        currentUser: authResult.user,
        authError: authResult.error,
        roomFound: roomResult.rows.length > 0,
        room: roomResult.rows[0] || null,
        myRooms: myRoomsResult.rows,
        isMyRoom: roomResult.rows.length > 0 && roomResult.rows[0].admin_id === authResult.user?.id
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
}