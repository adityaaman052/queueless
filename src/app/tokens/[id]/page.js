// ========================================
// FILE: src/app/tokens/[id]/page.js
// FIXED VERSION - Using useParams hook
// ========================================
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function TokenDetailPage() {
  const params = useParams(); // ✅ Use hook instead of props
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    
    if (params?.id) {
      fetchToken();
      
      // Auto-refresh every 5 seconds
      const interval = setInterval(fetchToken, 5000);
      return () => clearInterval(interval);
    }
  }, [user, router, params]);

  const fetchToken = async () => {
    if (!params?.id) return;
    
    try {
      const userToken = await user.getIdToken();
      const tokenId = params.id;
      const response = await fetch(`/api/tokens/${tokenId}`, {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });
      const data = await response.json();

      if (data.success) {
        setToken(data.token);
      } else {
        toast.error('Token not found');
        router.push('/my-tokens');
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!token) return null;

  const getStatusColor = (status) => {
    switch (status) {
      case 'WAITING': return 'bg-yellow-100 text-yellow-800';
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'COMPLETED': return 'bg-blue-100 text-blue-800';
      case 'SKIPPED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'WAITING': return '⏳';
      case 'ACTIVE': return '🔔';
      case 'COMPLETED': return '✅';
      case 'SKIPPED': return '⏭️';
      default: return '🎟️';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-2xl font-bold text-indigo-600">
            QueueLess
          </Link>
          <Link href="/my-tokens" className="text-indigo-600 hover:underline">
            My Tokens
          </Link>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-600 mb-2">Your Token</h1>
            <div className="text-8xl font-bold text-indigo-600 mb-4">
              #{token.token_number}
            </div>
            <span className={`inline-block px-6 py-2 rounded-full text-lg font-semibold ${getStatusColor(token.status)}`}>
              {getStatusIcon(token.status)} {token.status}
            </span>
          </div>

          <div className="space-y-4 mb-8">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Room</div>
              <div className="text-lg font-semibold">{token.room_name}</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-blue-600">
                  #{token.currentToken || 0}
                </div>
                <div className="text-sm text-gray-600">Current Token</div>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-yellow-600">
                  {token.tokensAhead}
                </div>
                <div className="text-sm text-gray-600">Ahead of You</div>
              </div>
            </div>

            {token.status === 'WAITING' && (
              <div className="bg-purple-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-purple-600">
                  ~{token.estimatedWaitMinutes} min
                </div>
                <div className="text-sm text-gray-600">Estimated Wait Time</div>
              </div>
            )}

            {token.status === 'ACTIVE' && (
              <div className="bg-green-50 p-6 rounded-lg text-center border-2 border-green-500">
                <div className="text-4xl mb-2">🔔</div>
                <div className="text-2xl font-bold text-green-800 mb-2">
                  It's Your Turn!
                </div>
                <div className="text-green-700">Please proceed to the counter</div>
              </div>
            )}

            {token.status === 'COMPLETED' && (
              <div className="bg-blue-50 p-6 rounded-lg text-center">
                <div className="text-4xl mb-2">✅</div>
                <div className="text-xl font-bold text-blue-800">
                  Service Completed
                </div>
              </div>
            )}
          </div>

          <div className="text-sm text-gray-500 text-center">
            <p>Created: {new Date(token.created_at).toLocaleString()}</p>
            <p className="mt-2 text-xs">Auto-refreshing every 5 seconds...</p>
          </div>
        </div>

        <Link
          href="/rooms"
          className="block mt-6 text-center text-indigo-600 hover:underline"
        >
          ← Back to rooms
        </Link>
      </div>
    </div>
  );
}