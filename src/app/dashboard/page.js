'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  if (!user) return null;

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-indigo-600">QueueLess</h1>
          <div className="flex gap-4 items-center">
            <span className="text-gray-600">{user.email}</span>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold mb-8">Dashboard</h2>

        <div className="grid md:grid-cols-2 gap-6">
          {/* User Actions */}
          <Link href="/rooms" className="block">
            <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition cursor-pointer border-2 border-transparent hover:border-indigo-500">
              <div className="text-5xl mb-4">🔍</div>
              <h3 className="text-2xl font-bold mb-2">Search Rooms</h3>
              <p className="text-gray-600">Find and join available queues</p>
            </div>
          </Link>

          {/* Admin Actions */}
          <Link href="/admin/rooms" className="block">
            <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition cursor-pointer border-2 border-transparent hover:border-green-500">
              <div className="text-5xl mb-4">🏥</div>
              <h3 className="text-2xl font-bold mb-2">My Rooms</h3>
              <p className="text-gray-600">Create and manage your queue rooms</p>
            </div>
          </Link>

          {/* My Tokens */}
          <Link href="/my-tokens" className="block">
            <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition cursor-pointer border-2 border-transparent hover:border-blue-500">
              <div className="text-5xl mb-4">🎟️</div>
              <h3 className="text-2xl font-bold mb-2">My Tokens</h3>
              <p className="text-gray-600">View your active and past tokens</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
