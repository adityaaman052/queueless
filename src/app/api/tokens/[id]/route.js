import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { verifyAuth } from '@/middleware/auth';

export async function GET(request, { params }) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult.error) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    const tokenId = params.id;
    const pool = getPool();

    // Get token details
    const tokenResult = await pool.query(
      `SELECT t.*, r.name as room_name, r.is_open as room_open
       FROM tokens t
       JOIN rooms r ON t.room_id = r.id
       WHERE t.id = $1 AND t.user_id = $2`,
      [tokenId, authResult.user.id]
    );

    if (tokenResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Token not found' },
        { status: 404 }
      );
    }

    const token = tokenResult.rows[0];

    // Get current active token
    const currentTokenResult = await pool.query(
      `SELECT token_number FROM tokens 
       WHERE room_id = $1 
       AND status = 'ACTIVE' 
       AND DATE(created_at) = CURRENT_DATE
       ORDER BY token_number DESC 
       LIMIT 1`,
      [token.room_id]
    );

    const currentToken = currentTokenResult.rows.length > 0 
      ? currentTokenResult.rows[0].token_number 
      : 0;

    // Get tokens ahead
    const tokensAheadResult = await pool.query(
      `SELECT COUNT(*) as count FROM tokens 
       WHERE room_id = $1 
       AND token_number < $2 
       AND status IN ('WAITING', 'ACTIVE')
       AND DATE(created_at) = CURRENT_DATE`,
      [token.room_id, token.token_number]
    );

    const tokensAhead = parseInt(tokensAheadResult.rows[0].count);

    return NextResponse.json({
      success: true,
      token: {
        ...token,
        currentToken,
        tokensAhead,
        estimatedWaitMinutes: tokensAhead * 5
      }
    });
  } catch (error) {
    console.error('Error fetching token:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch token' },
      { status: 500 }
    );
  }
}
