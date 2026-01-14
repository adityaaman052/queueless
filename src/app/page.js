'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-gray-900 mb-6">
            Welcome to <span className="text-indigo-600">QueueLess</span>
          </h1>
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
            Say goodbye to physical queues. Join digital queues, track your position in real-time, 
            and save your precious time.
          </p>

          <div className="flex gap-4 justify-center">
            <Link 
              href="/login"
              className="px-8 py-4 bg-indigo-600 text-white rounded-lg text-lg font-semibold hover:bg-indigo-700 transition"
            >
              Login
            </Link>
            <Link 
              href="/register"
              className="px-8 py-4 bg-white text-indigo-600 rounded-lg text-lg font-semibold border-2 border-indigo-600 hover:bg-indigo-50 transition"
            >
              Register
            </Link>
          </div>
        </div>

        <div className="mt-24 grid md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-xl shadow-lg">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-xl font-bold mb-2">Search Rooms</h3>
            <p className="text-gray-600">Find clinics, offices, and service centers near you</p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-lg">
            <div className="text-4xl mb-4">🎟️</div>
            <h3 className="text-xl font-bold mb-2">Get Token</h3>
            <p className="text-gray-600">Book your digital token and avoid physical queues</p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-lg">
            <div className="text-4xl mb-4">⏱️</div>
            <h3 className="text-xl font-bold mb-2">Track Live</h3>
            <p className="text-gray-600">See your position and estimated wait time in real-time</p>
          </div>
        </div>
      </div>
    </div>
  );
}