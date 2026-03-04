import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import {
  ShieldCheck,
  MessageSquare,
  MapPin,
  Users,
  ArrowLeft,
  Trash2,
} from "lucide-react-native";
import { supabase } from "@/lib/supabaseClient";

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("comments");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch data whenever you click a different tab
  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    if (activeTab === "comments") {
      // Fetch comments and grab the associated location name using a Supabase join!
      const { data: commentsData } = await supabase
        .from("comments")
        .select("*, locations(name)")
        .order("created_at", { ascending: false });
      setData(commentsData || []);
    } else if (activeTab === "pins") {
      // Fetch all map pins
      const { data: pinsData } = await supabase
        .from("locations")
        .select("*")
        .order("created_at", { ascending: false });
      setData(pinsData || []);
    } else {
      setData([]);
    }
    setLoading(false);
  };

  const deleteRecord = async (table, id) => {
    // We use window.confirm here because it works flawlessly in Expo Web builds
    if (
      window.confirm(
        `Are you sure you want to delete this record? This cannot be undone.`
      )
    ) {
      await supabase.from(table).delete().eq("id", id);
      fetchData(); // Refresh the list instantly after deleting
    }
  };

  const renderContent = () => {
    if (loading)
      return (
        <ActivityIndicator size="large" color="#22d3ee" className="mt-10" />
      );

    if (data.length === 0)
      return (
        <Text className="text-gray-500 italic mt-5">No records found.</Text>
      );

    if (activeTab === "comments") {
      return data.map((comment) => (
        <View
          key={comment.id}
          className="bg-gray-800 p-5 rounded-xl mb-4 border border-gray-700 flex-row justify-between items-center shadow-sm"
        >
          <View className="flex-1 pr-4">
            <Text className="text-gray-400 text-xs mb-1 font-bold tracking-wider uppercase">
              📍 On: {comment.locations?.name || "Unknown Pin"}
            </Text>
            <Text className="text-white font-medium text-base mb-2">
              "{comment.content || comment.text}"
            </Text>
            <Text className="text-gray-500 text-xs">
              User ID: {comment.user_id}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => deleteRecord("comments", comment.id)}
            className="p-3 bg-red-900/20 rounded-lg border border-red-900/50 active:bg-red-900/40"
          >
            <Trash2 size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      ));
    }

    if (activeTab === "pins") {
      return data.map((pin) => (
        <View
          key={pin.id}
          className="bg-gray-800 p-5 rounded-xl mb-4 border border-gray-700 flex-row justify-between items-center shadow-sm"
        >
          <View className="flex-1 pr-4">
            <Text className="text-white font-bold text-lg mb-1">
              {pin.name}
            </Text>
            <Text className="text-cyan-400 text-sm font-medium mb-1">
              {pin.category}
            </Text>
            <Text className="text-gray-500 text-xs">
              {pin.lat}, {pin.lng}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => deleteRecord("locations", pin.id)}
            className="p-3 bg-red-900/20 rounded-lg border border-red-900/50 active:bg-red-900/40"
          >
            <Trash2 size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      ));
    }

    return (
      <Text className="text-gray-500 italic">
        User management coming soon...
      </Text>
    );
  };

  return (
    <View className="flex-1 flex-row bg-black">
      {/* Admin Sidebar */}
      <View className="w-64 bg-gray-900 border-r border-gray-800 p-5 pt-12">
        <View className="flex-row items-center mb-10">
          <ShieldCheck size={32} color="#22d3ee" />
          <Text className="text-2xl font-black text-white ml-3 tracking-tight">
            Admin
          </Text>
        </View>

        <View className="space-y-4 flex-1">
          <TouchableOpacity
            onPress={() => setActiveTab("comments")}
            className={`flex-row items-center p-4 rounded-xl ${
              activeTab === "comments"
                ? "bg-cyan-500/20 border border-cyan-500/50"
                : "bg-transparent"
            }`}
          >
            <MessageSquare
              size={20}
              color={activeTab === "comments" ? "#22d3ee" : "#9ca3af"}
            />
            <Text
              className={`ml-3 font-bold ${
                activeTab === "comments" ? "text-cyan-400" : "text-gray-400"
              }`}
            >
              Comments
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab("pins")}
            className={`flex-row items-center p-4 rounded-xl ${
              activeTab === "pins"
                ? "bg-cyan-500/20 border border-cyan-500/50"
                : "bg-transparent"
            }`}
          >
            <MapPin
              size={20}
              color={activeTab === "pins" ? "#22d3ee" : "#9ca3af"}
            />
            <Text
              className={`ml-3 font-bold ${
                activeTab === "pins" ? "text-cyan-400" : "text-gray-400"
              }`}
            >
              Map Pins
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab("users")}
            className={`flex-row items-center p-4 rounded-xl ${
              activeTab === "users"
                ? "bg-cyan-500/20 border border-cyan-500/50"
                : "bg-transparent"
            }`}
          >
            <Users
              size={20}
              color={activeTab === "users" ? "#22d3ee" : "#9ca3af"}
            />
            <Text
              className={`ml-3 font-bold ${
                activeTab === "users" ? "text-cyan-400" : "text-gray-400"
              }`}
            >
              Users
            </Text>
          </TouchableOpacity>
        </View>

        {/* Exit Button */}
        <TouchableOpacity
          onPress={() => router.replace("/")}
          className="flex-row items-center p-4 bg-gray-800 rounded-xl mt-auto border border-gray-700"
        >
          <ArrowLeft size={20} color="white" />
          <Text className="ml-3 font-bold text-white">Exit to Map</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content Area */}
      <ScrollView className="flex-1 p-10 bg-black">
        <Text className="text-3xl font-black text-white mb-8 capitalize">
          {activeTab} Moderation
        </Text>
        <View className="flex-1 bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl min-h-[500px]">
          {renderContent()}
        </View>
      </ScrollView>
    </View>
  );
}
