'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function MyTokensPage() {
  const [activeTokens, setActiveTokens] = useState([]);
  const [pastTokens, setPastTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchTokens();
  }, [user, router]);

  const fetchTokens = async () => {
    try {
      setLoading(true);
      const token = await user.getIdToken();
      const response = await fetch('/api/tokens/my-tokens', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();

      if (data.success) {
        setActiveTokens(data.activeTokens);
        setPastTokens(data.pastTokens);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load tokens');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const getStatusColor = (status) => {
    switch (status) {
      case 'WAITING': return 'bg-yellow-100 text-yellow-800';
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'COMPLETED': return 'bg-blue-100 text-blue-800';
      case 'SKIPPED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-2xl font-bold text-indigo-600">
            QueueLess
          </Link>
          <span className="text-gray-600">{user.email}</span>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">My Tokens</h1>

        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : (
          <>
            {/* Active Tokens */}
            {activeTokens.length > 0 && (
              <div className="mb-12">
                <h2 className="text-2xl font-bold mb-4">🔔 Active Tokens</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  {activeTokens.map((token) => (
                    <Link
                      key={token.id}
                      href={`/tokens/${token.id}`}
                      className="block bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition border-2 border-transparent hover:border-indigo-500"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="text-4xl font-bold text-indigo-600 mb-2">
                            #{token.token_number}
                          </div>
                          <div className="font-semibold">{token.room_name}</div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(token.status)}`}>
                          {token.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-gray-600">Current Token</div>
                          <div className="font-bold">#{token.currentToken || 0}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Ahead of You</div>
                          <div className="font-bold">{token.tokensAhead}</div>
                        </div>
                      </div>

                      {token.status === 'ACTIVE' && (
                        <div className="mt-4 p-3 bg-green-50 rounded-lg text-center font-semibold text-green-800">
                          🔔 It's your turn!
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Past Tokens */}
            {pastTokens.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4">📜 Past Tokens</h2>
                <div className="bg-white rounded-xl shadow overflow-hidden">
                  <div className="divide-y">
                    {pastTokens.map((token) => (
                      <div key={token.id} className="p-4 hover:bg-gray-50">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-semibold">
                              Token #{token.token_number} - {token.room_name}
                            </div>
                            <div className="text-sm text-gray-600">
                              {new Date(token.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(token.status)}`}>
                            {token.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTokens.length === 0 && pastTokens.length === 0 && (
              <div className="text-center py-12 bg-white rounded-xl">
                <div className="text-6xl mb-4">🎟️</div>
                <h3 className="text-2xl font-bold mb-2">No tokens yet</h3>
                <p className="text-gray-600 mb-6">Join a queue to get your first token</p>
                <Link
                  href="/rooms"
                  className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                >
                  Browse Rooms
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}