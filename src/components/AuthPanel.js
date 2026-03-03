import React, { useState } from 'react';
import { 
    View, 
    Text, 
    TextInput, 
    TouchableOpacity, 
    ActivityIndicator, 
    Platform, 
    Alert, 
    Modal, 
    KeyboardAvoidingView 
} from 'react-native';
import { X } from 'lucide-react-native'; 

// Conditionally import the correct Supabase client to prevent crashes
import { supabase as supabaseWeb } from '@/lib/supabaseClient';
let supabaseMobile;
if (Platform.OS !== 'web') {
  supabaseMobile = require('@/lib/supabaseMobile').supabase;
}
const supabase = Platform.OS === 'web' ? supabaseWeb : supabaseMobile;

// Helper for cross-platform alerts
const showAlert = (title, message) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}: ${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export default function AuthPanel({ onClose }) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
        showAlert("Missing Info", "Please enter both email and password.");
        return;
    }
    setLoading(true);
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        showAlert("Login Failed", error.error_description || error.message);
    } else {
        // Login successful, close the panel
        onClose();
    }
    setLoading(false);
  };

  const handleSignup = async () => {
    if (!email || !password) {
        showAlert("Missing Info", "Please enter both email and password.");
        return;
    }
    setLoading(true);
    
    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
        showAlert("Signup Failed", error.error_description || error.message);
    } else {
        // A confirmation email will be sent.
        showAlert("Check your email", "A confirmation link has been sent to your inbox!");
        onClose();
    }
    setLoading(false);
  };

  return (
    <Modal 
        visible={true} 
        transparent={true} 
        animationType="fade" 
        onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 bg-black/80 items-center justify-center px-4">
          <View className="bg-gray-900 border border-gray-800 p-8 rounded-3xl shadow-2xl w-full max-w-sm relative">
            
            {/* Close Button */}
            <TouchableOpacity 
                onPress={onClose} 
                className="absolute top-5 right-5 p-2 bg-gray-800 rounded-full active:bg-gray-700 z-10"
            >
              <X size={20} color="#9ca3af" />
            </TouchableOpacity>

            <Text className="text-3xl font-black text-white mb-8 text-center tracking-tight">
                Join <Text className="text-[#d3bc8e]">Hyrosy</Text>
            </Text>

            <View className="space-y-5 mb-8">
              <View>
                <Text className="text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider ml-1">Email</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor="#6b7280"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 h-14 text-base focus:border-[#d3bc8e]"
                />
              </View>
              
              <View>
                <Text className="text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider ml-1">Password</Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor="#6b7280"
                  secureTextEntry
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 h-14 text-base focus:border-[#d3bc8e]"
                />
              </View>
            </View>

            <View className="space-y-3">
              <TouchableOpacity 
                onPress={handleLogin} 
                disabled={loading} 
                className={`w-full h-14 rounded-xl flex-row items-center justify-center shadow-lg ${loading ? 'bg-gray-700' : 'bg-[#d3bc8e] active:bg-[#c2a977]'}`}
              >
                {loading ? <ActivityIndicator color="#000" /> : <Text className="text-black font-bold text-lg">Sign In</Text>}
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={handleSignup} 
                disabled={loading} 
                className="w-full h-14 rounded-xl border border-gray-600 bg-transparent flex-row items-center justify-center active:bg-gray-800"
              >
                <Text className="text-gray-300 font-bold text-lg">Create Account</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}