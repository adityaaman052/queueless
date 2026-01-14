import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { verifyAuth } from '@/middleware/auth';

// GET /api/rooms - Get all open rooms
export async function GET(request) {
  try {
    const pool = getPool();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    
    const query = `
      SELECT 
        r.*,
        u.email as admin_email,
        COUNT(t.id) as waiting_count
      FROM rooms r
      LEFT JOIN users u ON r.admin_id = u.id
      LEFT JOIN tokens t ON r.id = t.room_id 
        AND t.status = 'WAITING' 
        AND DATE(t.created_at) = CURRENT_DATE
      WHERE r.name ILIKE $1
      GROUP BY r.id, u.email
      ORDER BY r.created_at DESC
    `;
    
    const result = await pool.query(query, [`%${search}%`]);

    return NextResponse.json({ success: true, rooms: result.rows });
  } catch (error) {
    console.error('Error fetching rooms:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch rooms' },
      { status: 500 }
    );
  }
}

// POST /api/rooms - Create new room (Admin only)
export async function POST(request) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult.error) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const { name, description, dailyLimit } = await request.json();

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Room name is required' },
        { status: 400 }
      );
    }

    const pool = getPool();

    // Update user role to ADMIN if creating first room
    await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2',
      ['ADMIN', authResult.user.id]
    );

    const result = await pool.query(
      'INSERT INTO rooms (name, description, admin_id, daily_limit, is_open) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [name, description || '', authResult.user.id, dailyLimit || 100, false]
    );

    return NextResponse.json({
      success: true,
      message: 'Room created successfully',
      roomId: result.rows[0].id
    });
  } catch (error) {
    console.error('Error creating room:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create room' },
      { status: 500 }
    );
  }
}