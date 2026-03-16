import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabaseClient";
import MerchantDashboardPanel from "@/components/MerchantDashboardPanel"; // 🌟 NEW
import {
  User,
  Map as MapIcon,
  Settings,
  LogOut,
  ChevronRight,
  CreditCard,
  ArrowLeft,
  Edit2,
  Inbox,
  Users,
  UserPlus,
  Check,
  X as XIcon,
  Store, // 🌟 NEW: Added Store icon
} from "lucide-react-native";

export default function ProfilePanel({ isOpen, onClose }) {
  const router = useRouter();
  const [userAuth, setUserAuth] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  const [userMaps, setUserMaps] = useState([]);
  const [sharedMaps, setSharedMaps] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const [friendsList, setFriendsList] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [addFriendUsername, setAddFriendUsername] = useState("");
  const [isAddingFriend, setIsAddingFriend] = useState(false);

  const [isMerchantDashboardOpen, setIsMerchantDashboardOpen] = useState(false);

  // 🌟 Only fetch data when the panel is opened
  useEffect(() => {
    if (isOpen) {
      fetchUserData();
    }
  }, [isOpen]);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        onClose();
        return;
      }
      setUserAuth(user);

      // This grabs ALL profile data, including our new 'role' column!
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile) {
        setUserProfile(profile);
        setNewUsername(profile.username || "");
      }

      fetchMapsAndInbox(user.id);
      fetchFriends(user.id);
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMapsAndInbox = async (userId) => {
    const { data: maps } = await supabase
      .from("user_maps")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (maps) setUserMaps(maps);

    const { data: inbox } = await supabase
      .from("shared_maps")
      .select(
        `id, created_at, user_maps!inner ( id, title ), sender:profiles!sender_id ( username )`
      )
      .eq("receiver_id", userId)
      .order("created_at", { ascending: false });
    if (inbox) setSharedMaps(inbox);
  };

  const fetchFriends = async (userId) => {
    const { data: incoming } = await supabase
      .from("friendships")
      .select(
        `id, requester:profiles!requester_id ( id, username, avatar_url )`
      )
      .eq("addressee_id", userId)
      .eq("status", "pending");
    if (incoming) setFriendRequests(incoming);

    const { data: accepted } = await supabase
      .from("friendships")
      .select(
        `id, requester:profiles!requester_id ( id, username ), addressee:profiles!addressee_id ( id, username )`
      )
      .eq("status", "accepted")
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

    if (accepted) {
      const formattedFriends = accepted.map((f) =>
        f.requester.id === userId ? f.addressee : f.requester
      );
      setFriendsList(formattedFriends);
    }
  };

  const handleUpdateUsername = async () => {
    if (!newUsername.trim()) return;
    setIsUpdating(true);
    const { error } = await supabase
      .from("profiles")
      .update({ username: newUsername.trim() })
      .eq("id", userAuth.id);
    if (error) {
      Alert.alert("Update Failed", "That username might already be taken.");
    } else {
      setUserProfile({ ...userProfile, username: newUsername.trim() });
      setIsEditingUsername(false);
    }
    setIsUpdating(false);
  };

  const handleSendFriendRequest = async () => {
    if (!addFriendUsername.trim()) return;
    setIsAddingFriend(true);
    try {
      const { data: targetProfile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .ilike("username", addFriendUsername.trim())
        .single();

      if (profileError || !targetProfile) {
        Alert.alert(
          "Traveler Not Found",
          "Check the spelling of their username."
        );
        setIsAddingFriend(false);
        return;
      }
      if (targetProfile.id === userAuth.id) {
        Alert.alert("Oops!", "You can't add yourself as a friend.");
        setIsAddingFriend(false);
        return;
      }

      const { error: insertError } = await supabase.from("friendships").insert([
        {
          requester_id: userAuth.id,
          addressee_id: targetProfile.id,
          status: "pending",
        },
      ]);

      if (insertError) {
        if (insertError.code === "23505")
          Alert.alert(
            "Already Sent",
            "A request already exists between you two."
          );
        else Alert.alert("Error", "Could not send friend request.");
      } else {
        Alert.alert(
          "Request Sent!",
          `A friend request was sent to @${addFriendUsername.trim()}`
        );
        setAddFriendUsername("");
      }
    } catch (err) {}
    setIsAddingFriend(false);
  };

  const handleAcceptRequest = async (requestId) => {
    const { error } = await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("id", requestId);
    if (!error) fetchFriends(userAuth.id);
  };

  const handleDeclineRequest = async (requestId) => {
    const { error } = await supabase
      .from("friendships")
      .delete()
      .eq("id", requestId);
    if (!error) fetchFriends(userAuth.id);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <View className="absolute top-0 left-0 w-full sm:w-[400px] h-full bg-[#1c1d28]/95 backdrop-blur-xl z-[100] border-r border-[#3b3e52] shadow-2xl animate-in slide-in-from-left duration-300 flex-col pointer-events-auto">
      {/* Header */}
      <View className="pt-14 px-6 pb-4 flex-row items-center border-b border-[#3b3e52] bg-transparent">
        <TouchableOpacity
          onPress={onClose}
          className="mr-4 p-2 bg-[#2e3142] rounded-full border border-[#3b3e52] active:scale-95"
        >
          <ArrowLeft size={20} color="#d3bc8e" />
        </TouchableOpacity>
        <Text className="text-2xl font-black text-white tracking-tight">
          Traveler Profile
        </Text>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#d3bc8e" />
        </View>
      ) : (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="p-6 pb-24">
            {/* Profile Avatar & Info */}
            <View className="items-center mt-2 mb-10">
              <View className="bg-[#2e3142] w-28 h-28 rounded-full items-center justify-center border-2 border-[#d3bc8e] mb-4 shadow-[0_0_20px_rgba(211,188,142,0.2)] relative">
                {userProfile?.avatar_url ? (
                  <Image
                    source={{ uri: userProfile.avatar_url }}
                    style={{ width: "100%", height: "100%", borderRadius: 100 }}
                  />
                ) : (
                  <User size={48} color="#d3bc8e" />
                )}
                <View className="absolute -bottom-3 bg-[#e6ce9a] px-3 py-1.5 rounded-full border-2 border-[#1c1d28]">
                  <Text className="text-[#1c1d28] text-[10px] font-black uppercase tracking-wider">
                    {userProfile?.role === "admin"
                      ? "Guild Master"
                      : userProfile?.role === "merchant"
                      ? "Merchant"
                      : "Explorer"}
                  </Text>
                </View>
              </View>

              {isEditingUsername ? (
                <View className="flex-row items-center mt-3 gap-2">
                  <View className="bg-[#1c1d28] border border-[#d3bc8e] rounded-xl px-4 py-2 flex-row items-center h-12">
                    <Text className="text-[#d3bc8e] font-bold mr-1">@</Text>
                    <TextInput
                      value={newUsername}
                      onChangeText={setNewUsername}
                      autoCapitalize="none"
                      className="text-white font-bold text-lg min-w-[120px] outline-none"
                      placeholderTextColor="#6b7280"
                      placeholder="username"
                      autoFocus
                    />
                  </View>
                  <TouchableOpacity
                    onPress={handleUpdateUsername}
                    disabled={isUpdating}
                    className="bg-[#e6ce9a] px-4 h-12 justify-center rounded-xl active:bg-[#d3bc8e]"
                  >
                    <Text className="text-[#1c1d28] font-bold">
                      {isUpdating ? "..." : "Save"}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => setIsEditingUsername(true)}
                  className="flex-row items-center mt-3 active:opacity-70 group"
                >
                  <Text className="text-2xl font-black text-[#d3bc8e] mr-2">
                    @{userProfile?.username || "Traveler"}
                  </Text>
                  <Edit2 size={16} color="#6b7280" />
                </TouchableOpacity>
              )}
              <Text className="text-gray-500 mt-2 font-medium text-sm">
                {userAuth?.email}
              </Text>
            </View>

            {/* 🌟 NEW: THE MERCHANT & ADMIN DASHBOARD BUTTON 🌟 */}
            {(userProfile?.role === "admin" ||
              userProfile?.role === "merchant") && (
              <View className="mb-10 animate-in fade-in duration-500">
                <Text className="text-[#d3bc8e] font-bold uppercase tracking-widest text-xs mb-4 ml-2 border-b border-[#3b3e52] pb-2">
                  Guild Supply ({userProfile.role})
                </Text>
                <TouchableOpacity
                  onPress={() => setIsMerchantDashboardOpen(true)} // 🌟 CHANGED THIS LINE
                  className="w-full bg-[#d3bc8e]/10 border border-[#d3bc8e] rounded-3xl p-5 flex-row items-center justify-between shadow-[0_0_20px_rgba(211,188,142,0.15)] active:bg-[#d3bc8e]/20"
                >
                  <View className="flex-row items-center">
                    <View className="bg-[#1c1d28] p-3 rounded-full border border-[#d3bc8e]/50">
                      <Store size={24} color="#d3bc8e" />
                    </View>
                    <View className="ml-4">
                      <Text className="text-white font-black text-lg">
                        Manage Inventory
                      </Text>
                      <Text className="text-[#d3bc8e] font-medium text-xs mt-1">
                        Upload products & tickets
                      </Text>
                    </View>
                  </View>
                  <ChevronRight size={20} color="#d3bc8e" />
                </TouchableOpacity>
              </View>
            )}

            {/* Travel Buddies */}
            <View className="mb-10">
              <Text className="text-gray-500 font-bold uppercase tracking-widest text-xs mb-4 ml-2 border-b border-[#3b3e52] pb-2">
                Travel Buddies
              </Text>
              <View className="flex-row gap-2 mb-6">
                <View className="flex-1 bg-[#1c1d28] border border-[#3b3e52] rounded-xl px-4 flex-row items-center">
                  <UserPlus size={18} color="#6b7280" />
                  <TextInput
                    placeholder="Add by @username..."
                    placeholderTextColor="#6b7280"
                    value={addFriendUsername}
                    onChangeText={setAddFriendUsername}
                    autoCapitalize="none"
                    className="flex-1 text-white font-medium ml-3 h-12 outline-none"
                  />
                </View>
                <TouchableOpacity
                  onPress={handleSendFriendRequest}
                  disabled={isAddingFriend}
                  className="bg-[#3b3e52] px-5 rounded-xl justify-center items-center active:bg-[#2e3142]"
                >
                  <Text className="text-white font-bold">
                    {isAddingFriend ? "..." : "Add"}
                  </Text>
                </TouchableOpacity>
              </View>

              {friendRequests.length > 0 && (
                <View className="mb-4">
                  <Text className="text-gray-400 text-xs font-bold uppercase mb-2 ml-1">
                    Pending Requests
                  </Text>
                  {friendRequests.map((req) => (
                    <View
                      key={req.id}
                      className="bg-[#2e3142] p-3 rounded-xl border border-[#d3bc8e]/50 mb-2 flex-row items-center justify-between"
                    >
                      <View className="flex-row items-center flex-1">
                        <View className="w-10 h-10 bg-[#1c1d28] rounded-full items-center justify-center border border-[#3b3e52] mr-3">
                          <User size={16} color="#d3bc8e" />
                        </View>
                        <Text className="text-white font-bold">
                          @{req.requester.username}
                        </Text>
                      </View>
                      <View className="flex-row gap-2">
                        <TouchableOpacity
                          onPress={() => handleAcceptRequest(req.id)}
                          className="w-10 h-10 bg-[#e6ce9a] rounded-full items-center justify-center active:bg-[#d3bc8e]"
                        >
                          <Check size={18} color="#1c1d28" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeclineRequest(req.id)}
                          className="w-10 h-10 bg-[#1c1d28] rounded-full items-center justify-center border border-[#3b3e52] active:bg-[#3b3e52]"
                        >
                          <XIcon size={18} color="#9ca3af" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {friendsList.length === 0 && friendRequests.length === 0 ? (
                <View className="bg-[#2e3142]/50 p-6 rounded-3xl border border-[#3b3e52] border-dashed items-center">
                  <Users size={32} color="#4b5563" className="mb-3" />
                  <Text className="text-gray-400 text-center text-sm">
                    You haven't added any travel buddies yet.
                  </Text>
                </View>
              ) : (
                <View>
                  {friendsList.map((friend) => (
                    <View
                      key={friend.id}
                      className="bg-[#2e3142] p-4 rounded-xl border border-[#3b3e52] mb-2 flex-row items-center"
                    >
                      <View className="w-12 h-12 bg-[#1c1d28] rounded-full items-center justify-center border border-[#3b3e52] mr-4">
                        <User size={20} color="#d3bc8e" />
                      </View>
                      <Text className="text-white font-bold text-lg">
                        @{friend.username}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Inbox */}
            <View className="mb-10">
              <Text className="text-gray-500 font-bold uppercase tracking-widest text-xs mb-4 ml-2 border-b border-[#3b3e52] pb-2">
                Inbox: Shared With You
              </Text>
              {sharedMaps.length === 0 ? (
                <View className="bg-[#2e3142]/50 p-6 rounded-3xl border border-[#3b3e52] border-dashed items-center">
                  <Inbox size={32} color="#4b5563" className="mb-3" />
                  <Text className="text-gray-400 text-center text-sm">
                    No itineraries received from friends yet.
                  </Text>
                </View>
              ) : (
                sharedMaps.map((shared) => (
                  <TouchableOpacity
                    key={shared.id}
                    onPress={() => {
                      onClose();
                      router.push(`/map?route=${shared.user_maps.id}`);
                    }}
                    className="bg-[#2e3142] p-5 rounded-2xl border border-[#d3bc8e]/30 mb-3 flex-row items-center justify-between active:bg-[#3b3e52]"
                  >
                    <View className="flex-row items-center flex-1">
                      <View className="bg-[#1c1d28] p-3 rounded-xl mr-4 border border-[#3b3e52]">
                        <Inbox size={20} color="#d3bc8e" />
                      </View>
                      <View className="flex-1 pr-4">
                        <Text
                          className="text-white font-bold text-lg mb-1"
                          numberOfLines={1}
                        >
                          {shared.user_maps.title}
                        </Text>
                        <Text className="text-[#d3bc8e] text-xs font-medium">
                          From: @{shared.sender.username}
                        </Text>
                      </View>
                    </View>
                    <ChevronRight size={20} color="#6b7280" />
                  </TouchableOpacity>
                ))
              )}
            </View>

            {/* Settings */}
            <View className="mb-12">
              <Text className="text-gray-500 font-bold uppercase tracking-widest text-xs mb-4 ml-2 border-b border-[#3b3e52] pb-2">
                Settings & Billing
              </Text>
              <View className="bg-[#2e3142] rounded-3xl border border-[#3b3e52] overflow-hidden">
                <TouchableOpacity className="p-5 border-b border-[#3b3e52] flex-row items-center justify-between active:bg-[#3b3e52]">
                  <View className="flex-row items-center">
                    <CreditCard size={20} color="#9ca3af" />
                    <Text className="text-white font-medium ml-4">
                      Manage Subscription
                    </Text>
                  </View>
                  <ChevronRight size={20} color="#4b5563" />
                </TouchableOpacity>
                <TouchableOpacity className="p-5 border-b border-[#3b3e52] flex-row items-center justify-between active:bg-[#3b3e52]">
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
                  className="p-5 flex-row items-center justify-between active:bg-[#1c1d28]"
                >
                  <View className="flex-row items-center">
                    <LogOut size={20} color="#ef4444" />
                    <Text className="text-red-400 font-bold ml-4">Log Out</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      )}

      <MerchantDashboardPanel
        isOpen={isMerchantDashboardOpen}
        onClose={() => setIsMerchantDashboardOpen(false)}
      />
    </View>
  );
}
