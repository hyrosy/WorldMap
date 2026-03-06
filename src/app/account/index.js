import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabaseClient";
import {
  User,
  Map as MapIcon,
  Settings,
  LogOut,
  ChevronRight,
  CreditCard,
  ArrowLeft,
} from "lucide-react-native";

export default function AccountScreen() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [userMaps, setUserMaps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      // 1. Get current logged-in user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUser(user);

        // 2. Fetch their saved maps/quests from Supabase
        const { data: maps, error } = await supabase
          .from("user_maps")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (!error && maps) {
          setUserMaps(maps);
        }
      } else {
        // If not logged in, kick them to auth
        router.replace("/auth");
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/auth");
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-black">
        <ActivityIndicator size="large" color="#22d3ee" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-black">
      {/* Header / Back Button */}
      <View className="pt-12 px-6 pb-4 flex-row items-center border-b border-gray-900">
        <TouchableOpacity
          onPress={() => router.push("/")}
          className="mr-4 p-2 bg-gray-900 rounded-full"
        >
          <ArrowLeft size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-xl font-black text-white">My Account</Text>
      </View>

      <View className="p-6">
        {/* Profile Avatar & Info */}
        <View className="items-center mt-4 mb-10">
          <View className="bg-gray-800 w-28 h-28 rounded-full items-center justify-center border-4 border-gray-700 mb-4 shadow-lg relative">
            <User size={48} color="#9ca3af" />
            {/* Little Pro Badge */}
            <View className="absolute -bottom-2 bg-cyan-500 px-3 py-1 rounded-full border-2 border-black">
              <Text className="text-black text-[10px] font-black uppercase tracking-wider">
                Explorer
              </Text>
            </View>
          </View>
          <Text className="text-2xl font-black text-white mt-2">
            {user?.email}
          </Text>
          <Text className="text-gray-500 mt-1 font-mono text-xs">
            ID: {user?.id.split("-")[0]}...
          </Text>
        </View>

        {/* My Quests Section */}
        <View className="mb-10">
          <Text className="text-gray-400 font-bold uppercase tracking-wider text-xs mb-4 ml-2">
            My Saved Quests
          </Text>
          {userMaps.length === 0 ? (
            <View className="bg-gray-900/50 p-8 rounded-3xl border border-gray-800 border-dashed items-center">
              <MapIcon size={40} color="#4b5563" className="mb-4" />
              <Text className="text-gray-400 text-center mb-6">
                You haven't built any custom quests or saved routes yet.
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/")}
                className="bg-white px-8 py-3 rounded-full active:scale-95 transition-transform"
              >
                <Text className="text-black font-bold">Explore the Map</Text>
              </TouchableOpacity>
            </View>
          ) : (
            userMaps.map((map) => (
              <TouchableOpacity
                key={map.id}
                className="bg-gray-900 p-5 rounded-2xl border border-gray-800 mb-3 flex-row items-center justify-between active:bg-gray-800"
                onPress={() => router.push("/")}
              >
                <View className="flex-row items-center">
                  <View className="bg-cyan-500/10 p-3 rounded-xl mr-4 border border-cyan-500/20">
                    <MapIcon size={24} color="#22d3ee" />
                  </View>
                  <View>
                    <Text className="text-white font-bold text-lg">
                      {map.name || "My Custom Route"}
                    </Text>
                    <Text className="text-gray-500 text-xs mt-1">
                      Created {new Date(map.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                <ChevronRight size={20} color="#4b5563" />
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Account Settings Section */}
        <View className="mb-12">
          <Text className="text-gray-400 font-bold uppercase tracking-wider text-xs mb-4 ml-2">
            Settings & Billing
          </Text>

          <View className="bg-gray-900 rounded-3xl border border-gray-800 overflow-hidden">
            <TouchableOpacity className="p-5 border-b border-gray-800 flex-row items-center justify-between active:bg-gray-800">
              <View className="flex-row items-center">
                <CreditCard size={20} color="#9ca3af" />
                <Text className="text-white font-medium ml-4">
                  Manage Subscription
                </Text>
              </View>
              <ChevronRight size={20} color="#4b5563" />
            </TouchableOpacity>

            <TouchableOpacity className="p-5 border-b border-gray-800 flex-row items-center justify-between active:bg-gray-800">
              <View className="flex-row items-center">
                <Settings size={20} color="#9ca3af" />
                <Text className="text-white font-medium ml-4">
                  App Preferences
                </Text>
              </View>
              <ChevronRight size={20} color="#4b5563" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleLogout}
              className="p-5 flex-row items-center justify-between active:bg-gray-800"
            >
              <View className="flex-row items-center">
                <LogOut size={20} color="#ef4444" />
                <Text className="text-red-500 font-bold ml-4">Log Out</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
