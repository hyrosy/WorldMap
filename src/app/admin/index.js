import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import {
  ShieldCheck,
  MessageSquare,
  MapPin,
  Users,
  ArrowLeft,
  Trash2,
  Edit, // <-- Added Edit Icon
} from "lucide-react-native";
import { supabase } from "@/lib/supabaseClient";

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("comments");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- NEW EDITING STATE ---
  const [editingPin, setEditingPin] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    category: "",
    description: "",
  });
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch data whenever you click a different tab
  useEffect(() => {
    setEditingPin(null); // Reset the editing view if we switch tabs
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    if (activeTab === "comments") {
      const { data: commentsData } = await supabase
        .from("comments")
        .select("*, locations(name)")
        .order("created_at", { ascending: false });
      setData(commentsData || []);
    } else if (activeTab === "pins") {
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
    if (
      window.confirm(
        `Are you sure you want to delete this record? This cannot be undone.`
      )
    ) {
      await supabase.from(table).delete().eq("id", id);
      fetchData();
    }
  };

  // --- NEW: Handle opening the edit form ---
  const handleEditClick = (pin) => {
    setEditingPin(pin.id);
    setEditFormData({
      name: pin.name,
      category: pin.category || "",
      description: pin.description || "",
    });
  };

  // --- NEW: Save updates to Supabase ---
  const savePinUpdate = async () => {
    setIsUpdating(true);
    const { error } = await supabase
      .from("locations")
      .update({
        name: editFormData.name,
        category: editFormData.category,
        description: editFormData.description,
      })
      .eq("id", editingPin);

    setIsUpdating(false);

    if (error) {
      alert("Error updating pin: " + error.message);
    } else {
      setEditingPin(null); // Close the edit form
      fetchData(); // Refresh the data to show the new changes!
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
      // 🌟 IF WE ARE EDITING A PIN, SHOW THE FORM 🌟
      if (editingPin) {
        return (
          <View className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
            <Text className="text-2xl font-black text-white mb-6">
              Edit Pin Details
            </Text>

            <Text className="text-gray-400 text-xs font-bold uppercase mb-2 ml-1">
              Location Name
            </Text>
            <TextInput
              className="bg-gray-900 text-white p-4 rounded-xl mb-4 border border-gray-700 focus:border-cyan-500"
              value={editFormData.name}
              onChangeText={(text) =>
                setEditFormData({ ...editFormData, name: text })
              }
            />

            <Text className="text-gray-400 text-xs font-bold uppercase mb-2 ml-1">
              Category
            </Text>
            <TextInput
              className="bg-gray-900 text-white p-4 rounded-xl mb-4 border border-gray-700 focus:border-cyan-500"
              value={editFormData.category}
              onChangeText={(text) =>
                setEditFormData({ ...editFormData, category: text })
              }
            />

            <Text className="text-gray-400 text-xs font-bold uppercase mb-2 ml-1">
              Description
            </Text>
            <TextInput
              className="bg-gray-900 text-white p-4 rounded-xl mb-8 border border-gray-700 focus:border-cyan-500"
              value={editFormData.description}
              onChangeText={(text) =>
                setEditFormData({ ...editFormData, description: text })
              }
              multiline
              numberOfLines={4}
              style={{ minHeight: 100 }} // Ensure it's tall enough for a paragraph
            />

            <View className="flex-row gap-4">
              <TouchableOpacity
                className="flex-1 bg-gray-700 p-4 rounded-xl items-center border border-gray-600"
                onPress={() => setEditingPin(null)}
              >
                <Text className="text-white font-bold text-lg">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-cyan-500 p-4 rounded-xl items-center flex-row justify-center active:bg-cyan-600"
                onPress={savePinUpdate}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator color="black" />
                ) : (
                  <Text className="text-black font-bold text-lg">
                    Save Changes
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        );
      }

      // 🌟 OTHERWISE, SHOW THE LIST WITH THE NEW EDIT BUTTON 🌟
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
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => handleEditClick(pin)}
              className="p-3 bg-blue-900/20 rounded-lg border border-blue-900/50 active:bg-blue-900/40"
            >
              <Edit size={20} color="#3b82f6" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => deleteRecord("locations", pin.id)}
              className="p-3 bg-red-900/20 rounded-lg border border-red-900/50 active:bg-red-900/40"
            >
              <Trash2 size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
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
