// src/components/AuthPanel.js
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from 'lucide-react'; // For a close icon


export default function AuthPanel({ onClose }) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      alert(error.error_description || error.message);
    } else {
      // Login successful, close the panel
      onClose();
    }
    setLoading(false);
  };

  const handleSignup = async (event) => {
    event.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      alert(error.error_description || error.message);
    } else {
      // A confirmation email will be sent.
      alert('Check your email for the login link!');
      onClose();
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-sm">
        <h2 className="text-2xl font-bold mb-6 text-center">Join Hyrosy</h2>
        <form>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </div>
          <div className="mt-6 space-y-2">
            <Button onClick={handleLogin} disabled={loading} className="w-full">
              {loading ? 'Signing In...' : 'Sign In'}
            </Button>
            <Button onClick={handleSignup} disabled={loading} variant="secondary" className="w-full">
              {loading ? 'Signing Up...' : 'Sign Up'}
            </Button>
          </div>
        </form>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800">&times;</button>
      </div>
    </div>
  );
}