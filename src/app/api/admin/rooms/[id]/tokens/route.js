// src/app/api/admin/rooms/[id]/tokens/route.js
// FIXED - Returns lowercase status for consistency

import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function GET(request, { params }) {
    try {
        console.log('🔍 GET /api/admin/rooms/[id]/tokens called');
        
        const { id: roomId } = await params;
        console.log('Room ID:', roomId);
        
        const pool = getPool();

        // Get the room
        const roomResult = await pool.query(
            'SELECT * FROM rooms WHERE id = $1',
            [roomId]
        );

        if (roomResult.rows.length === 0) {
            console.log('❌ Room not found');
            return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        }

        console.log('✅ Room found:', roomResult.rows[0].name);

        // ✅ FIX: Convert status to lowercase using LOWER()
        const tokensResult = await pool.query(
            `SELECT t.id, t.token_number, t.room_id, t.user_id, 
                    LOWER(t.status) as status, 
                    t.created_at, t.updated_at,
                    u.name as user_name, u.email as user_email 
             FROM tokens t
             LEFT JOIN users u ON t.user_id = u.id
             WHERE t.room_id = $1
             ORDER BY 
                CASE LOWER(t.status)
                    WHEN 'active' THEN 1
                    WHEN 'waiting' THEN 2
                    WHEN 'completed' THEN 3
                    ELSE 4
                END,
                t.token_number ASC`,
            [roomId]
        );

        console.log('✅ Tokens found:', tokensResult.rows.length);
        console.log('Token statuses:', tokensResult.rows.map(t => t.status));

        return NextResponse.json({ 
            success: true,
            tokens: tokensResult.rows,
            room: roomResult.rows[0]
        });
    } catch (error) {
        console.error('❌ Error fetching tokens:', error.message);
        console.error('Stack:', error.stack);
        return NextResponse.json({ 
            error: 'Failed to fetch tokens',
            message: error.message
        }, { status: 500 });
    }
}

export async function POST(request, { params }) {
    try {
        console.log('📝 POST /api/admin/rooms/[id]/tokens called');
        
        const { id: roomId } = await params;
        const body = await request.json();
        const { action, tokenId } = body;
        
        console.log('Room ID:', roomId);
        console.log('Action:', action);
        console.log('Token ID:', tokenId);
        
        const pool = getPool();

        // Verify room exists
        const roomResult = await pool.query(
            'SELECT * FROM rooms WHERE id = $1',
            [roomId]
        );

        if (roomResult.rows.length === 0) {
            return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        }

        if (action === 'call-next') {
            console.log('🔔 Calling next token...');
            
            // Get next waiting token (case-insensitive)
            const waitingResult = await pool.query(
                `SELECT * FROM tokens 
                 WHERE room_id = $1 AND UPPER(status) = 'WAITING'
                 ORDER BY token_number ASC LIMIT 1`,
                [roomId]
            );

            if (waitingResult.rows.length === 0) {
                console.log('⚠️ No tokens in queue');
                return NextResponse.json({ error: 'No tokens in queue' }, { status: 400 });
            }

            const nextToken = waitingResult.rows[0];
            console.log('Next token:', nextToken.token_number);

            // Mark current active token as completed
            await pool.query(
                `UPDATE tokens 
                 SET status = 'COMPLETED', updated_at = NOW()
                 WHERE room_id = $1 AND UPPER(status) = 'ACTIVE'`,
                [roomId]
            );

            // Activate next token
            await pool.query(
                `UPDATE tokens 
                 SET status = 'ACTIVE', updated_at = NOW()
                 WHERE id = $1`,
                [nextToken.id]
            );

            // Update room's current_token
            await pool.query(
                `UPDATE rooms 
                 SET current_token = $1, updated_at = NOW()
                 WHERE id = $2`,
                [nextToken.token_number, roomId]
            );

            console.log('✅ Token activated');
            return NextResponse.json({ success: true, token: nextToken });
        }

        if (action === 'complete' && tokenId) {
            console.log('✅ Completing token:', tokenId);
            
            await pool.query(
                `UPDATE tokens 
                 SET status = 'COMPLETED', updated_at = NOW()
                 WHERE id = $1 AND room_id = $2`,
                [tokenId, roomId]
            );

            return NextResponse.json({ success: true });
        }

        if (action === 'skip' && tokenId) {
            console.log('⏭️ Skipping token:', tokenId);
            
            // Set back to waiting
            await pool.query(
                `UPDATE tokens 
                 SET status = 'WAITING', updated_at = NOW()
                 WHERE id = $1 AND room_id = $2`,
                [tokenId, roomId]
            );

            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ 
            error: 'Invalid action',
            received: action 
        }, { status: 400 });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
        return NextResponse.json({ 
            error: 'Failed to manage tokens',
            message: error.message
        }, { status: 500 });
    }
}