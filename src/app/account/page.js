// src/app/account/page.js
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AccountPage() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');

  // Use useCallback to memoize the function
  const getProfile = useCallback(async () => {
    try {
      setLoading(true);
      if (!session?.user) throw new Error('No user on the session!');

      const { data, error, status } = await supabase
        .from('profiles')
        .select(`username`)
        .eq('id', session.user.id)
        .single();

      if (error && status !== 406) {
        throw error;
      }

      if (data) {
        setUsername(data.username || '');
      }
    } catch (error) {
      setMessage('Error loading user data!');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [session]);

  // useEffect to run getProfile when the component mounts or session changes
  useEffect(() => {
    if (session) {
      getProfile();
    }
  }, [session, getProfile]);

  async function updateProfile(event) {
    event.preventDefault();
    try {
      setLoading(true);
      if (!session?.user) throw new Error('No user on the session!');

      const updates = {
        id: session.user.id,
        username,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('profiles').upsert(updates);

      if (error) {
        throw error;
      }
      setMessage('Profile updated successfully!');
    } catch (error) {
      setMessage('Error updating the data!');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-20">
      <h1 className="text-3xl font-bold mb-8">My Account</h1>
      <div className="bg-white p-6 rounded-lg shadow-md text-black max-w-md mx-auto">
        <h2 className="text-xl font-semibold mb-6">Profile Information</h2>
        
        {loading ? (
          <p>Loading...</p>
        ) : (
          <form onSubmit={updateProfile} className="space-y-6">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="text" value={session.user.email} disabled />
            </div>
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your public username"
              />
            </div>
            
            <div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Saving...' : 'Update Profile'}
              </Button>
            </div>
          </form>
        )}
        
        {message && <p className="mt-4 text-center text-sm text-green-600">{message}</p>}
      </div>
    </div>
  );
}