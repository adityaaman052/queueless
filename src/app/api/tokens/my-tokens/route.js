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

    // Get all user's tokens (today and past)
    const tokensResult = await pool.query(
      `SELECT t.*, r.name as room_name, r.is_open as room_open
       FROM tokens t
       JOIN rooms r ON t.room_id = r.id
       WHERE t.user_id = $1
       ORDER BY t.created_at DESC
       LIMIT 50`,
      [authResult.user.id]
    );

    // Separate active and past tokens
    const activeTokens = tokensResult.rows.filter(
      t => t.status === 'WAITING' || t.status === 'ACTIVE'
    );
    
    const pastTokens = tokensResult.rows.filter(
      t => t.status === 'COMPLETED' || t.status === 'SKIPPED'
    );

    // For each active token, get position info
    const enrichedActiveTokens = await Promise.all(
      activeTokens.map(async (token) => {
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

        const tokensAheadResult = await pool.query(
          `SELECT COUNT(*) as count FROM tokens 
           WHERE room_id = $1 
           AND token_number < $2 
           AND status IN ('WAITING', 'ACTIVE')
           AND DATE(created_at) = CURRENT_DATE`,
          [token.room_id, token.token_number]
        );

        const tokensAhead = parseInt(tokensAheadResult.rows[0].count);

        return {
          ...token,
          currentToken,
          tokensAhead,
          estimatedWaitMinutes: tokensAhead * 5
        };
      })
    );

    return NextResponse.json({
      success: true,
      activeTokens: enrichedActiveTokens,
      pastTokens
    });
  } catch (error) {
    console.error('Error fetching tokens:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tokens' },
      { status: 500 }
    );
  }
}
