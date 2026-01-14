'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function RoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchRooms();
  }, [user, router]);

  const fetchRooms = async (searchQuery = '') => {
    try {
      setLoading(true);
      const response = await fetch(`/api/rooms?search=${searchQuery}`);
      const data = await response.json();

      if (data.success) {
        setRooms(data.rooms);
      } else {
        toast.error('Failed to load rooms');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchRooms(search);
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Search Queue Rooms</h1>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by clinic, office, service..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              Search
            </button>
          </form>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="text-xl text-gray-600">Loading rooms...</div>
          </div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">No rooms found</h3>
            <p className="text-gray-600">Try a different search or check back later</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => (
              <Link 
                key={room.id} 
                href={`/rooms/${room.id}`}
                className="block"
              >
                <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition border-2 border-transparent hover:border-indigo-500 cursor-pointer">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-xl font-bold text-gray-900">
                      {room.name}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      room.is_open 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {room.is_open ? '🟢 OPEN' : '🔴 CLOSED'}
                    </span>
                  </div>

                  <p className="text-gray-600 mb-4 line-clamp-2">
                    {room.description || 'No description'}
                  </p>

                  <div className="flex justify-between text-sm text-gray-500">
                    <span>👥 {room.waiting_count || 0} waiting</span>
                    <span>📋 Limit: {room.daily_limit}</span>
                  </div>

                  {room.is_open && (
                    <div className="mt-4 text-center">
                      <span className="text-indigo-600 font-semibold">
                        Click to join queue →
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}