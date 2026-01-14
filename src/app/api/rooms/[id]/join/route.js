// src/app/api/rooms/[id]/join/route.js
// Allow users to join room and get a token

import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { cookies } from 'next/headers';

// Simple function to get current user (adjust based on your auth)
async function getCurrentUser() {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('session');
        
        if (!sessionCookie) {
            return null;
        }

        const sessionData = JSON.parse(sessionCookie.value);
        return sessionData.user || null;
    } catch (error) {
        console.error('Session error:', error);
        return null;
    }
}

export async function POST(request, { params }) {
    try {
        console.log('🎫 POST /api/rooms/[id]/join called');
        
        // Get current user
        const user = await getCurrentUser();
        
        if (!user) {
            return NextResponse.json({ 
                error: 'Please login to join the queue' 
            }, { status: 401 });
        }

        const { id: roomId } = await params;
        console.log('Room ID:', roomId);
        console.log('User ID:', user.id);
        
        const pool = getPool();

        // Check if room exists and is open
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

        if (!room.is_open) {
            return NextResponse.json({ 
                error: 'This room is currently closed' 
            }, { status: 400 });
        }

        console.log('✅ Room is open:', room.name);

        // Check if user already has an active token today
        const existingTokenResult = await pool.query(
            `SELECT * FROM tokens 
             WHERE room_id = $1 AND user_id = $2 
             AND DATE(created_at) = CURRENT_DATE
             AND status IN ('waiting', 'active')`,
            [roomId, user.id]
        );

        if (existingTokenResult.rows.length > 0) {
            console.log('⚠️ User already has active token');
            return NextResponse.json({ 
                error: 'You already have an active token for today',
                token: existingTokenResult.rows[0]
            }, { status: 400 });
        }

        // Check daily limit
        const todayCountResult = await pool.query(
            `SELECT COUNT(*) as count FROM tokens 
             WHERE room_id = $1 AND DATE(created_at) = CURRENT_DATE`,
            [roomId]
        );

        const todayCount = Number(todayCountResult.rows[0].count);
        console.log('Today count:', todayCount, '/ Daily limit:', room.daily_limit);

        if (todayCount >= room.daily_limit) {
            return NextResponse.json({ 
                error: 'Daily token limit reached. Please try again tomorrow.' 
            }, { status: 400 });
        }

        // Generate token number
        const tokenNumber = todayCount + 1;
        console.log('Generated token number:', tokenNumber);

        // Create token
        const insertResult = await pool.query(
            `INSERT INTO tokens (room_id, user_id, token_number, status, created_at, updated_at)
             VALUES ($1, $2, $3, 'waiting', NOW(), NOW())
             RETURNING *`,
            [roomId, user.id, tokenNumber]
        );

        const newToken = insertResult.rows[0];
        console.log('✅ Token created:', newToken.id);

        return NextResponse.json({ 
            success: true, 
            token: newToken,
            message: `Token #${tokenNumber} created successfully`
        });
        
    } catch (error) {
        console.error('❌ Error joining room:', error.message);
        console.error('Stack:', error.stack);
        return NextResponse.json({ 
            error: 'Failed to join room',
            message: error.message
        }, { status: 500 });
    }
}