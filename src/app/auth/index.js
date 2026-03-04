import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabaseClient"; // Ensure this path matches your setup

export default function AuthScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) {
      alert("Please enter both email and password.");
      return;
    }

    setLoading(true);
    let error;

    if (isSignUp) {
      // Register a new user
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      error = signUpError;
    } else {
      // Log in an existing user
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      error = signInError;
    }

    setLoading(false);

    if (error) {
      alert(error.message);
    } else {
      // Success! Send them back to the map (or they can manually go to /admin)
      router.replace("/");
    }
  };

  return (
    <View className="flex-1 justify-center items-center bg-black p-6">
      <View className="w-full max-w-md bg-gray-900 p-8 rounded-2xl border border-gray-800 shadow-2xl">
        <Text className="text-3xl font-black text-white mb-2 text-center">
          {isSignUp ? "Join Hyrosy" : "Welcome Back"}
        </Text>
        <Text className="text-gray-400 mb-8 text-center">
          {isSignUp
            ? "Create an account to save your quests."
            : "Sign in to continue your journey."}
        </Text>

        <TextInput
          className="bg-gray-800 text-white px-4 py-3 rounded-xl mb-4 border border-gray-700 focus:border-cyan-500"
          placeholder="Email"
          placeholderTextColor="#6b7280"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          className="bg-gray-800 text-white px-4 py-3 rounded-xl mb-6 border border-gray-700 focus:border-cyan-500"
          placeholder="Password"
          placeholderTextColor="#6b7280"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          onPress={handleAuth}
          disabled={loading}
          className="bg-cyan-500 py-4 rounded-xl items-center mb-4 active:bg-cyan-600"
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text className="text-black font-bold text-lg">
              {isSignUp ? "Sign Up" : "Log In"}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setIsSignUp(!isSignUp)}
          className="items-center mt-2"
        >
          <Text className="text-gray-400">
            {isSignUp ? "Already have an account? " : "Don't have an account? "}
            <Text className="text-cyan-400 font-bold">
              {isSignUp ? "Log In" : "Sign Up"}
            </Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
