import { useEffect, useState } from "react";
import { Stack, useRouter } from "expo-router";
import { ActivityIndicator, View, Text } from "react-native";
import { supabase } from "@/lib/supabaseClient"; // 🌟 Import Supabase directly!

export default function AdminLayout() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const verifyAdmin = async () => {
      // 1. Force the app to wait and ask Supabase directly for the token
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      // 2. If there truly is no token, boot them out
      if (!currentSession?.user) {
        setTimeout(() => {
          router.replace("/auth");
        }, 1);
        return;
      }

      // 3. The REAL check: Is this your admin email?
      const myAdminEmail = "support@hyrosy.com"; // 🌟 PUT YOUR EXACT EMAIL HERE 🌟

      if (currentSession.user.email === myAdminEmail) {
        setIsAdmin(true);
      } else {
        alert("Unauthorized: You must be an admin to view Mission Control.");
        setTimeout(() => {
          router.replace("/");
        }, 1);
      }
      setIsChecking(false);
    };

    verifyAdmin();
  }, []); // <-- Empty array means it only runs exactly once when the page loads

  if (isChecking) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-900">
        <ActivityIndicator size="large" color="#22d3ee" />
        <Text className="text-white mt-4 font-bold">
          Securing Mission Control...
        </Text>
      </View>
    );
  }

  if (!isAdmin) return null;

  // If they pass the check, render the Admin screens!
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
