// src/app/api/rooms/[id]/route.js
// CORRECT VERSION - Matches your actual database schema!

import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function GET(request, { params }) {
    try {
        console.log('🔍 GET /api/rooms/[id] called');
        
        const { id: roomId } = await params;
        console.log('Room ID:', roomId);
        
        const pool = getPool();

        // Get room (using is_open instead of is_active)
        const roomResult = await pool.query(
            'SELECT id, name, description, is_open, daily_limit, current_token FROM rooms WHERE id = $1',
            [roomId]
        );
        console.log('Rooms found:', roomResult.rows.length);

        if (roomResult.rows.length === 0) {
            return NextResponse.json({ 
                error: 'Room not found',
                roomId 
            }, { status: 404 });
        }

        const room = roomResult.rows[0];
        console.log('Room:', room.name);
        console.log('Is open:', room.is_open);

        // Get today's stats
        const statsResult = await pool.query(
            `SELECT 
                COUNT(*) as total_today,
                SUM(CASE WHEN status = 'waiting' THEN 1 ELSE 0 END) as waiting,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active
             FROM tokens 
             WHERE room_id = $1 AND DATE(created_at) = CURRENT_DATE`,
            [roomId]
        );
        console.log('Stats:', statsResult.rows[0]);

        const stats = statsResult.rows[0];

        return NextResponse.json({
            success: true,
            room,
            stats: {
                totalToday: Number(stats?.total_today) || 0,
                waiting: Number(stats?.waiting) || 0,
                currentToken: room.current_token
            }
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
        
        return NextResponse.json({ 
            error: 'Server error',
            message: error.message
        }, { status: 500 });
    }
}