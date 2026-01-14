'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function MyRoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    dailyLimit: 100
  });
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchMyRooms();
  }, [user, router]);

  const fetchMyRooms = async () => {
    try {
      setLoading(true);
      const token = await user.getIdToken();
      const response = await fetch('/api/rooms/my-rooms', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();

      if (data.success) {
        setRooms(data.rooms);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();

    if (!formData.name) {
      toast.error('Room name is required');
      return;
    }

    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Room created successfully!');
        setShowCreateModal(false);
        setFormData({ name: '', description: '', dailyLimit: 100 });
        fetchMyRooms();
      } else {
        toast.error(data.error || 'Failed to create room');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to create room');
    }
  };

  const toggleRoomStatus = async (roomId, currentStatus) => {
    try {
      const token = await user.getIdToken();
      
      // ✅ FIXED: Use correct toggle endpoint
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
        fetchMyRooms();
      } else {
        toast.error(data.error || 'Failed to update room');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to update room');
    }
  };

  if (!user) return null;

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
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">My Rooms</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
          >
            + Create New Room
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-lg">
            <div className="text-6xl mb-4">🏥</div>
            <h3 className="text-2xl font-bold mb-2">No rooms yet</h3>
            <p className="text-gray-600 mb-6">Create your first queue room to get started</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              Create Room
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => (
              <div key={room.id} className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold">{room.name}</h3>
                  <button
                    onClick={() => toggleRoomStatus(room.id, room.is_open)}
                    className={`px-3 py-1 rounded-full text-sm font-semibold transition ${
                      room.is_open 
                        ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    {room.is_open ? '🟢 OPEN' : '⚪ CLOSED'}
                  </button>
                </div>

                <p className="text-gray-600 mb-4 line-clamp-2 min-h-12">
                  {room.description || 'No description'}
                </p>

                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex justify-between">
                    <span>📋 Daily Limit:</span>
                    <span className="font-semibold">{room.daily_limit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>🎟️ Tokens Today:</span>
                    <span className="font-semibold">{room.total_tokens_today || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>🔢 Current Token:</span>
                    <span className="font-semibold">{room.current_token || '-'}</span>
                  </div>
                </div>

                <Link
                  href={`/admin/rooms/${room.id}`}
                  className="block w-full text-center px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold"
                >
                  Manage Queue →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-6">Create New Room</h2>
            
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Room Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g., Naman's Clinic"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows="3"
                  placeholder="Describe your service..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Daily Token Limit
                </label>
                <input
                  type="number"
                  value={formData.dailyLimit}
                  onChange={(e) => setFormData({...formData, dailyLimit: parseInt(e.target.value)})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  min="1"
                  max="1000"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({ name: '', description: '', dailyLimit: 100 });
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold transition"
                >
                  Create Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}