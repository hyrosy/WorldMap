import { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session'; // <-- FIXED: Added missing import
import { supabase as supabaseWeb } from '../lib/supabaseClient'; 

// Conditionally import the mobile client to avoid web errors
let supabaseMobile;
if (Platform.OS !== 'web') {
  supabaseMobile = require('../lib/supabaseMobile').supabase;
}

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null); // <-- FIXED: Added session state
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Select the correct client based on the platform
  const supabase = Platform.OS === 'web' ? supabaseWeb : supabaseMobile;

  useEffect(() => {
    // Check active session
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const signInWithGoogle = async () => {
    try {
      if (Platform.OS === 'web') {
        await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        });
      } else {
        // Mobile Google Auth using expo-auth-session
        const redirectUri = AuthSession.makeRedirectUri({
          preferLocalhost: true, // <-- FIXED: useProxy is deprecated in modern Expo
        });

        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUri,
          },
        });

        if (error) {
          console.error('Mobile Google Auth error:', error);
        } else {
          console.log('Mobile Google Auth initiated:', data);
        }
      }
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    // <-- FIXED: Added 'session' to the provided values so PinDetailsModal doesn't crash
    <AuthContext.Provider value={{ session, user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}