'use client';

import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';

export default function TestUser() {
  const { user } = useAuth();
  const [dbUser, setDbUser] = useState(null);

  useEffect(() => {
    if (user) {
      checkUser();
    }
  }, [user]);

  const checkUser = async () => {
    const token = await user.getIdToken();
    const response = await fetch('/api/test-user', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    setDbUser(data);
  };

  if (!user) return <div>Not logged in</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">User Debug Info</h1>
      
      <div className="bg-gray-100 p-4 rounded mb-4">
        <h2 className="font-bold">Firebase User:</h2>
        <p>Email: {user.email}</p>
        <p>UID: {user.uid}</p>
      </div>

      {dbUser && (
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-bold">Database User:</h2>
          <pre>{JSON.stringify(dbUser, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}