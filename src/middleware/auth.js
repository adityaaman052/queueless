import { adminAuth } from '@/lib/firebaseAdmin';
import { getPool } from '@/lib/db';

export async function verifyAuth(request) {
  try {
    const token = request.headers.get('Authorization')?.split('Bearer ')[1];
    
    if (!token) {
      return { error: 'No token provided', status: 401 };
    }

    const decodedToken = await adminAuth.verifyIdToken(token);
    const pool = getPool();
    
    // Check if user exists in database
    const result = await pool.query(
      'SELECT * FROM users WHERE firebase_uid = $1',
      [decodedToken.uid]
    );

    let user;
    
    if (result.rows.length === 0) {
      // Create user if doesn't exist
      const insertResult = await pool.query(
        'INSERT INTO users (firebase_uid, email, role) VALUES ($1, $2, $3) RETURNING *',
        [decodedToken.uid, decodedToken.email, 'USER']
      );
      
      user = insertResult.rows[0];
    } else {
      user = result.rows[0];
    }

    return { user };
  } catch (error) {
    console.error('Auth error:', error);
    return { error: 'Invalid token', status: 401 };
  }
}