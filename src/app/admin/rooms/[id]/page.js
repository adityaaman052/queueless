'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function AdminRoomManagePage() {
  const params = useParams();
  const [room, setRoom] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calling, setCalling] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (params?.id) {
      fetchRoomData();
      const interval = setInterval(fetchRoomData, 3000);
      return () => clearInterval(interval);
    }
  }, [user, router, params?.id]);

  const fetchRoomData = async () => {
    if (!params?.id || !user) return;
    
    try {
      const token = await user.getIdToken();
      const roomId = params.id;
      
      // Fetch room details
      const roomResponse = await fetch(`/api/rooms/${roomId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const roomData = await roomResponse.json();
      
      if (roomData.success) {
        setRoom(roomData.room);
      }

      // Fetch today's tokens
      const tokensResponse = await fetch(`/api/admin/rooms/${roomId}/tokens`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const tokensData = await tokensResponse.json();
      
      if (tokensData.success) {
        setTokens(tokensData.tokens || []);
      }
    } catch (error) {
      console.error('Error fetching room:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRoomStatus = async () => {
    if (!params?.id) return;
    
    try {
      const token = await user.getIdToken();
      const roomId = params.id;
      
      const response = await fetch(`/api/admin/rooms/${roomId}/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        fetchRoomData();
      } else {
        toast.error(data.error || 'Failed to update room');
      }
    } catch (error) {
      console.error('Toggle error:', error);
      toast.error('Failed to update room status');
    }
  };

  const handleCallNext = async () => {
    if (!params?.id) return;
    
    setCalling(true);
    try {
      const token = await user.getIdToken();
      const roomId = params.id;
      
      const response = await fetch(`/api/admin/rooms/${roomId}/tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'call-next' })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Token #${data.token.token_number} is now active!`);
        fetchRoomData();
      } else {
        toast.error(data.error || 'No tokens in queue');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to call next token');
    } finally {
      setCalling(false);
    }
  };

  const handleCompleteToken = async (tokenId) => {
    try {
      const token = await user.getIdToken();
      const roomId = params.id;
      
      const response = await fetch(`/api/admin/rooms/${roomId}/tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'complete', tokenId })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Token completed');
        fetchRoomData();
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to complete token');
    }
  };

  const handleSkipToken = async (tokenId) => {
    if (!confirm('Are you sure you want to skip this token?')) return;

    try {
      const token = await user.getIdToken();
      const roomId = params.id;
      
      const response = await fetch(`/api/admin/rooms/${roomId}/tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'skip', tokenId })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Token moved to end of queue');
        fetchRoomData();
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to skip token');
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold mb-2">Room not found</h2>
          <Link href="/admin/rooms" className="text-indigo-600 hover:underline">
            ← Back to my rooms
          </Link>
        </div>
      </div>
    );
  }

  // ✅ FIX: Convert status to lowercase for comparison
  const activeToken = tokens.find(t => t.status?.toLowerCase() === 'active');
  const waitingTokens = tokens.filter(t => t.status?.toLowerCase() === 'waiting');
  const completedTokens = tokens.filter(t => t.status?.toLowerCase() === 'completed');

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/admin/rooms" className="text-2xl font-bold text-indigo-600">
            QueueLess Admin
          </Link>
          <span className="text-gray-600">{user.email}</span>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <Link href="/admin/rooms" className="text-indigo-600 hover:underline mb-6 inline-block">
          ← Back to my rooms
        </Link>

        {/* Room Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">{room.name}</h1>
              <p className="text-gray-600">{room.description || 'No description'}</p>
            </div>
            <button
              onClick={toggleRoomStatus}
              className={`px-6 py-3 rounded-lg font-semibold transition ${
                room.is_open
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              {room.is_open ? '🔴 Close Queue' : '🟢 Open Queue'}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-6 rounded-xl shadow text-center">
            <div className="text-4xl font-bold text-blue-600">{tokens.length}</div>
            <div className="text-gray-600">Total Today</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow text-center">
            <div className="text-4xl font-bold text-yellow-600">{waitingTokens.length}</div>
            <div className="text-gray-600">Waiting</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow text-center">
            <div className="text-4xl font-bold text-green-600">
              {room.current_token || 0}
            </div>
            <div className="text-gray-600">Current Token</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow text-center">
            <div className="text-4xl font-bold text-purple-600">{room.daily_limit}</div>
            <div className="text-gray-600">Daily Limit</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Active Token */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4">🔔 Current Token</h2>
            
            {activeToken ? (
              <div className="bg-green-50 border-2 border-green-500 rounded-xl p-8 text-center">
                <div className="text-7xl font-bold text-green-600 mb-4">
                  #{activeToken.token_number}
                </div>
                <div className="text-lg text-gray-700 mb-4">
                  {activeToken.user_name || 'Guest'}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCompleteToken(activeToken.id)}
                    className="flex-1 py-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
                  >
                    ✅ Complete
                  </button>
                  <button
                    onClick={() => handleSkipToken(activeToken.id)}
                    className="flex-1 py-4 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600"
                  >
                    ⏭ Skip
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">⏸️</div>
                <p className="text-gray-600 mb-6">No active token</p>
                <button
                  onClick={handleCallNext}
                  disabled={calling || waitingTokens.length === 0}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {calling ? 'Calling...' : 
                   waitingTokens.length === 0 ? 'No Tokens in Queue' : 
                   `Call Next Token (${waitingTokens.length} waiting)`}
                </button>
              </div>
            )}
          </div>

          {/* Waiting Queue */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4">
              ⏳ Waiting Queue 
              <span className="ml-2 text-lg text-yellow-600">({waitingTokens.length})</span>
            </h2>
            
            {waitingTokens.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {waitingTokens.map((token) => (
                  <div
                    key={token.id}
                    className="flex justify-between items-center p-4 bg-yellow-50 rounded-lg"
                  >
                    <div>
                      <div className="text-2xl font-bold text-yellow-700">
                        #{token.token_number}
                      </div>
                      <div className="text-sm text-gray-600">
                        {token.user_name || 'Guest'}
                      </div>
                    </div>
                    <span className="text-yellow-600 font-semibold">WAITING</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <div className="text-6xl mb-4">🎉</div>
                <p>No tokens waiting</p>
              </div>
            )}
          </div>
        </div>

        {/* Completed Today */}
        <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4">✅ Completed Today ({completedTokens.length})</h2>
          
          {completedTokens.length > 0 ? (
            <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
              {completedTokens.map((token) => (
                <div
                  key={token.id}
                  className="bg-blue-50 p-3 rounded-lg text-center text-blue-700 font-semibold"
                >
                  #{token.token_number}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No completed tokens yet</p>
          )}
        </div>

        <div className="mt-4 text-sm text-gray-500 text-center">
          🔄 Auto-refreshing every 3 seconds...
        </div>
      </div>
    </div>
  );
}