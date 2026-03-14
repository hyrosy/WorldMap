import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { supabase } from "@/lib/supabaseClient";
import { X, Mail, Lock, User, KeyRound } from "lucide-react-native";
import { toast } from "sonner";

export default function AuthModal({ isOpen, onClose }) {
  const [mode, setMode] = useState("login"); // 'login', 'signup', or 'verify'

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSignIn = async () => {
    if (!email || !password)
      return toast.error("Please enter email and password");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Welcome back, Traveler!");
      onClose();
    }
  };

  const handleSignUp = async () => {
    if (!email || !password || !username)
      return toast.error("Please fill all fields");
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { username: username.trim() },
      },
    });

    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      // If Supabase requires email confirmation, it returns user but no session
      if (data?.user && !data?.session) {
        toast.success("Verification code sent to your email!");
        setMode("verify");
      } else {
        // If email confirmation is disabled in Supabase, they log in instantly
        toast.success("Account created!");
        onClose();
      }
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode) return toast.error("Please enter the 6-digit code");
    setLoading(true);

    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otpCode.trim(),
      type: "signup", // Verifies the signup token specifically
    });

    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Identity verified! Welcome to the Guild.");
      onClose();
    }
  };

  const resetAndClose = () => {
    setMode("login");
    setEmail("");
    setPassword("");
    setUsername("");
    setOtpCode("");
    onClose();
  };

  return (
    <View className="absolute inset-0 z-[200] items-center justify-center bg-black/80 p-4 pointer-events-auto animate-in fade-in duration-200">
      <View className="bg-[#2e3142] border border-[#3b3e52] rounded-3xl p-8 w-full max-w-sm shadow-[0_0_50px_rgba(211,188,142,0.1)] relative">
        {/* Close Button */}
        <TouchableOpacity
          onPress={resetAndClose}
          className="absolute top-4 right-4 p-2 bg-[#1c1d28] rounded-full border border-[#3b3e52]"
        >
          <X color="#9ca3af" size={16} />
        </TouchableOpacity>

        {/* Header Icon */}
        <View className="items-center mb-6 mt-2">
          <View className="w-16 h-16 bg-[#1c1d28] rounded-full items-center justify-center mb-4 border-2 border-[#d3bc8e] shadow-[0_0_15px_rgba(211,188,142,0.3)]">
            <Text className="text-[#d3bc8e] font-black text-3xl">H</Text>
          </View>
          <Text className="text-2xl font-black text-white text-center">
            {mode === "login"
              ? "Welcome Back"
              : mode === "signup"
              ? "Join the Guild"
              : "Verify Identity"}
          </Text>
          <Text className="text-gray-400 text-center font-medium mt-1 text-sm px-2">
            {mode === "login"
              ? "Log in to access your inventory and friends."
              : mode === "signup"
              ? "Create an account to save your exploration."
              : "Enter the 6-digit code sent to your email."}
          </Text>
        </View>

        {/* --- INPUT FIELDS --- */}
        <View className="space-y-4 mb-6">
          {mode === "verify" ? (
            // VERIFY UI
            <View className="bg-[#1c1d28] border border-[#3b3e52] rounded-xl flex-row items-center px-4 h-14 focus-within:border-[#d3bc8e]">
              <KeyRound color="#6b7280" size={20} />
              <TextInput
                placeholder="6-Digit Code"
                placeholderTextColor="#6b7280"
                value={otpCode}
                onChangeText={setOtpCode}
                keyboardType="numeric"
                maxLength={6}
                className="flex-1 ml-3 text-white font-bold text-lg tracking-[0.25em] outline-none"
              />
            </View>
          ) : (
            // LOGIN & SIGNUP UI
            <>
              {mode === "signup" && (
                <View className="bg-[#1c1d28] border border-[#3b3e52] rounded-xl flex-row items-center px-4 h-14 focus-within:border-[#d3bc8e]">
                  <User color="#6b7280" size={20} />
                  <TextInput
                    placeholder="Traveler Name"
                    placeholderTextColor="#6b7280"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    className="flex-1 ml-3 text-white font-medium outline-none"
                  />
                </View>
              )}
              <View className="bg-[#1c1d28] border border-[#3b3e52] rounded-xl flex-row items-center px-4 h-14 focus-within:border-[#d3bc8e]">
                <Mail color="#6b7280" size={20} />
                <TextInput
                  placeholder="Email Address"
                  placeholderTextColor="#6b7280"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  className="flex-1 ml-3 text-white font-medium outline-none"
                />
              </View>
              <View className="bg-[#1c1d28] border border-[#3b3e52] rounded-xl flex-row items-center px-4 h-14 focus-within:border-[#d3bc8e]">
                <Lock color="#6b7280" size={20} />
                <TextInput
                  placeholder="Password"
                  placeholderTextColor="#6b7280"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  className="flex-1 ml-3 text-white font-medium outline-none"
                />
              </View>
            </>
          )}
        </View>

        {/* --- ACTION BUTTONS --- */}
        <TouchableOpacity
          onPress={
            mode === "login"
              ? handleSignIn
              : mode === "signup"
              ? handleSignUp
              : handleVerifyOtp
          }
          disabled={loading}
          className="w-full bg-[#e6ce9a] h-14 rounded-xl items-center justify-center shadow-[0_0_15px_rgba(230,206,154,0.4)] active:scale-95 transition-transform mb-4"
        >
          {loading ? (
            <ActivityIndicator color="#1c1d28" />
          ) : (
            <Text className="text-[#1c1d28] font-black text-lg uppercase tracking-wider">
              {mode === "login"
                ? "Enter Realm"
                : mode === "signup"
                ? "Create Profile"
                : "Confirm Code"}
            </Text>
          )}
        </TouchableOpacity>

        {/* --- TOGGLE MODES --- */}
        {mode !== "verify" && (
          <TouchableOpacity
            onPress={() => setMode(mode === "login" ? "signup" : "login")}
            className="items-center py-2"
          >
            <Text className="text-gray-400 font-medium">
              {mode === "login" ? "New to the guild? " : "Already a traveler? "}
              <Text className="text-[#d3bc8e] font-bold">
                {mode === "login" ? "Sign Up" : "Log In"}
              </Text>
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
