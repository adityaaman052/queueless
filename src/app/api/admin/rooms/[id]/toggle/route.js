// src/app/api/admin/rooms/[id]/toggle/route.js
// Toggle room open/closed status

import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function POST(request, { params }) {
    try {
        console.log('🔄 POST /api/admin/rooms/[id]/toggle called');
        
        const { id: roomId } = await params;
        console.log('Room ID:', roomId);
        
        const pool = getPool();

        // Get current room status
        const roomResult = await pool.query(
            'SELECT * FROM rooms WHERE id = $1',
            [roomId]
        );

        if (roomResult.rows.length === 0) {
            return NextResponse.json({ 
                error: 'Room not found' 
            }, { status: 404 });
        }

        const room = roomResult.rows[0];
        const newStatus = !room.is_open;

        console.log(`Toggling room from ${room.is_open} to ${newStatus}`);

        // Toggle the is_open status
        await pool.query(
            `UPDATE rooms 
             SET is_open = $1, updated_at = NOW()
             WHERE id = $2`,
            [newStatus, roomId]
        );

        console.log(`✅ Room ${newStatus ? 'opened' : 'closed'}`);

        return NextResponse.json({ 
            success: true,
            is_open: newStatus,
            message: `Room ${newStatus ? 'opened' : 'closed'} successfully`
        });
        
    } catch (error) {
        console.error('❌ Error toggling room:', error.message);
        return NextResponse.json({ 
            error: 'Failed to toggle room',
            message: error.message
        }, { status: 500 });
    }
}