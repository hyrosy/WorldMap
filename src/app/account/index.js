import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabaseClient";

export default function AccountScreen() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/auth");
  };

  return (
    <View className="flex-1 justify-center items-center bg-black p-6">
      <Text className="text-3xl font-black text-white mb-8">My Account</Text>
      <TouchableOpacity
        onPress={handleLogout}
        className="bg-red-500/20 border border-red-500 px-8 py-4 rounded-xl active:bg-red-500/40"
      >
        <Text className="text-red-500 font-bold text-lg">Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}
