'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function RoomDetailPage() {
  const params = useParams(); // ✅ Use useParams hook instead
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (params?.id) {
      fetchRoom();
    }
  }, [user, router, params]);

  const fetchRoom = async () => {
    try {
      setLoading(true);
      const roomId = params.id;
      const response = await fetch(`/api/rooms/${roomId}`);
      const data = await response.json();

      if (data.success) {
        setRoom(data.room);
      } else {
        toast.error('Room not found');
        router.push('/rooms');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load room');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinQueue = async () => {
    try {
      setJoining(true);
      const token = await user.getIdToken();
      const roomId = params.id;
      const response = await fetch('/api/tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ roomId: parseInt(roomId) })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Token created successfully!');
        router.push(`/tokens/${data.token.id}`);
      } else {
        toast.error(data.error || 'Failed to join queue');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to join queue');
    } finally {
      setJoining(false);
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

  if (!room) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/rooms" className="text-2xl font-bold text-indigo-600">
            QueueLess
          </Link>
          <span className="text-gray-600">{user.email}</span>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Link href="/rooms" className="text-indigo-600 hover:underline mb-6 inline-block">
          ← Back to rooms
        </Link>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-4xl font-bold mb-2">{room.name}</h1>
              <p className="text-gray-600">{room.description || 'No description'}</p>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
              room.is_open 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {room.is_open ? '🟢 OPEN' : '🔴 CLOSED'}
            </span>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-blue-600">
                {room.stats?.current_token || 0}
              </div>
              <div className="text-sm text-gray-600">Current Token</div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-yellow-600">
                {room.stats?.waiting_count || 0}
              </div>
              <div className="text-sm text-gray-600">Waiting</div>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-purple-600">
                {room.daily_limit}
              </div>
              <div className="text-sm text-gray-600">Daily Limit</div>
            </div>
          </div>

          {room.is_open ? (
            <button
              onClick={handleJoinQueue}
              disabled={joining}
              className="w-full py-4 bg-indigo-600 text-white rounded-xl text-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {joining ? 'Joining Queue...' : '🎟️ Join Queue & Get Token'}
            </button>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-xl">
              <div className="text-6xl mb-4">🔒</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Queue Closed</h3>
              <p className="text-gray-600">This room is not accepting new tokens right now</p>
            </div>
          )}

          <div className="mt-6 text-sm text-gray-500">
            <p>👤 Managed by: {room.admin_email}</p>
          </div>
        </div>
      </div>
    </div>
  );
}