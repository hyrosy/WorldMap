import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { useRouteBuilder } from "@/context/RouteBuilderContext";
import { useCart } from "@/context/CartContext";
import useShare from "@/hooks/useShare";
import { toast } from "sonner";
import {
  X,
  Search,
  PlusCircle,
  ArrowLeft,
  ChevronDown,
  MapPin,
  Trash2,
  Edit,
  Share2,
  Link,
  Globe,
  Swords,
  Map as MapIcon,
  UserPlus,
  List,
  Route,
  Radar,
  Users,
} from "lucide-react-native";

// --- SUB-COMPONENTS ---
const SearchResultItem = ({ pin, onSelect }) => (
  <TouchableOpacity
    onPress={onSelect}
    className="w-full flex-row items-center gap-3 p-3 rounded-xl mb-2 bg-[#2e3142] active:bg-[#3b3e52] border border-[#3b3e52] shadow-sm"
  >
    <View className="relative w-12 h-12 flex-shrink-0">
      <Image
        source={{ uri: pin.image_url || "https://placehold.co/100" }}
        className="w-full h-full rounded-lg object-cover bg-[#1c1d28]"
      />
    </View>
    <View className="flex-1">
      <Text className="font-semibold text-sm text-white" numberOfLines={2}>
        {pin.name}
      </Text>
      <Text className="text-xs text-gray-400" numberOfLines={1}>
        {pin.category}
      </Text>
    </View>
  </TouchableOpacity>
);

const QuestCard = ({ quest, onQuestSelect, exploredSteps }) => {
  const totalSteps = quest.steps?.length || 0;
  const completedSteps = Array.from(exploredSteps).filter((stepId) =>
    quest.steps?.some((step) => step.id === stepId)
  ).length;
  const progressPercentage =
    totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  return (
    <TouchableOpacity
      className="bg-[#2e3142] p-4 rounded-2xl border border-[#3b3e52] mb-3 active:border-[#d3bc8e]/50 shadow-sm"
      onPress={() => onQuestSelect(quest)}
    >
      <Text className="font-bold text-lg text-white">{quest.title}</Text>
      <Text
        className="text-sm text-gray-400 my-1.5 leading-5"
        numberOfLines={2}
      >
        {quest.description || "Explore this curated route."}
      </Text>
      {totalSteps > 0 && (
        <View className="mt-4">
          <View className="flex-row justify-between items-center mb-1.5">
            <Text className="text-xs font-semibold text-gray-400">
              Progress
            </Text>
            <Text className="text-xs font-bold text-[#d3bc8e]">
              {Math.round(progressPercentage)}%
            </Text>
          </View>
          <View className="w-full bg-[#1c1d28] rounded-full h-2 overflow-hidden border border-[#3b3e52]">
            <View
              className="bg-[#d3bc8e] h-full rounded-full"
              style={{ width: `${progressPercentage}%` }}
            />
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

export default function QuestPanel({
  isOpen,
  onClose,
  activeQuest,
  quests,
  currentStepIndex,
  onStepSelect,
  exploredSteps,
  onToggleStepExplored,
  selectedCity,
  allPins,
  onViewExperience,
  onEnterWorld,
  onQuestSelect,
  dynamicPins, // 🌟 NEW PROP
  currentWorld, // 🌟 NEW PROP
  onRequestAuth,
}) {
  const safeQuests = quests || [];
  const questsByCity = safeQuests.reduce((acc, quest) => {
    if (quest.quest_type !== "multi_city") {
      const city = quest.city || "Unknown";
      if (!acc[city]) acc[city] = [];
      acc[city].push(quest);
    }
    return acc;
  }, {});

  const multiCityQuests = safeQuests.filter(
    (q) => q.quest_type === "multi_city"
  );
  const premiumQuests = safeQuests.filter((q) => q.is_pro === true);

  const [mainTab, setMainTab] = useState("routes");
  const { session } = useAuth();

  // --- ROUTES & LISTS STATE ---
  const [customSubTab, setCustomSubTab] = useState("routes"); // 🌟 NEW: Toggles Routes vs Lists
  const [openListAccordion, setOpenListAccordion] = useState(null); // 🌟 NEW: Accordion for Lists
  const { stops, addStop, removeStop, clearRoute } = useRouteBuilder();
  const { shareWithFriend, isSending } = useShare();
  const [experiencesView, setExperiencesView] = useState("list");
  const [myRoutes, setMyRoutes] = useState([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [newRouteName, setNewRouteName] = useState("");
  const [isSavingRoute, setIsSavingRoute] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedExperience, setSelectedExperience] = useState(null);
  const [experienceStops, setExperienceStops] = useState({
    status: "idle",
    data: [],
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editedStops, setEditedStops] = useState([]);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [friendUsername, setFriendUsername] = useState("");

  // --- WORLDS STATE ---
  const [worldView, setWorldView] = useState("list");
  const [myWorlds, setMyWorlds] = useState([]);
  const [loadingWorlds, setLoadingWorlds] = useState(false);
  const [newWorldName, setNewWorldName] = useState("");
  const [newWorldDesc, setNewWorldDesc] = useState("");
  const [isSavingWorld, setIsSavingWorld] = useState(false);
  const [selectedWorld, setSelectedWorld] = useState(null);
  const [isWorldShareOpen, setIsWorldShareOpen] = useState(false);
  const [worldFriendUsername, setWorldFriendUsername] = useState("");
  const [isInviting, setIsInviting] = useState(false);

  // --- QUESTS STATE ---
  const [questsActiveTab, setQuestsActiveTab] = useState("by_city");
  const [openAccordion, setOpenAccordion] = useState(null);

  const handleBack = () => onQuestSelect(null);
  const handleStepClick = (step, index) => {
    if (onStepSelect) onStepSelect(index);
  };

  // --- GROUPING THE PINS FOR LISTS ---
  const pinsByCategory = (dynamicPins || []).reduce((acc, pin) => {
    const category = pin.category || "Favorites";
    if (!acc[category]) acc[category] = [];
    acc[category].push(pin);
    return acc;
  }, {});

  // --- EFFECTS ---
  useEffect(() => {
    const fetchMyRoutes = async () => {
      if (session?.user && mainTab === "routes") {
        setLoadingRoutes(true);
        const { data, error } = await supabase
          .from("user_maps")
          .select("*, user_map_pins(location_id, order_index)")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false });
        if (!error) setMyRoutes(data || []);
        setLoadingRoutes(false);
      }
    };
    fetchMyRoutes();
  }, [isOpen, session, mainTab, experiencesView]);

  useEffect(() => {
    const fetchWorlds = async () => {
      if (session?.user && mainTab === "worlds") {
        setLoadingWorlds(true);
        const { data, error } = await supabase
          .from("worlds")
          .select("*")
          .eq("owner_id", session.user.id)
          .order("created_at", { ascending: false });
        if (!error) setMyWorlds(data || []);
        setLoadingWorlds(false);
      }
    };
    fetchWorlds();
  }, [isOpen, session, mainTab, worldView]);

  useEffect(() => {
    if (searchTerm.length > 1) {
      const lowercasedFilter = searchTerm.toLowerCase();

      // 🌟 Allow searching through system pins AND personal pins when building a route
      const combinedPins = [...allPins, ...(dynamicPins || [])];

      const results = combinedPins.filter(
        (pin) =>
          pin.name?.toLowerCase().includes(lowercasedFilter) ||
          pin.description?.toLowerCase().includes(lowercasedFilter)
      );

      // Filter out duplicates if they exist in both
      const uniqueResults = Array.from(new Set(results.map((a) => a.id))).map(
        (id) => results.find((a) => a.id === id)
      );

      setSearchResults(uniqueResults.slice(0, 5));
    } else {
      setSearchResults([]);
    }
  }, [searchTerm, allPins, dynamicPins]);

  useEffect(() => {
    if (selectedCity) {
      setOpenAccordion(selectedCity.name);
      setQuestsActiveTab("by_city");
    } else {
      setOpenAccordion(null);
    }
  }, [selectedCity]);

  useEffect(() => {
    if (isEditing && selectedExperience) {
      setNewRouteName(selectedExperience.title);
      setEditedStops(experienceStops.data);
    }
  }, [isEditing, selectedExperience, experienceStops.data]);

  useEffect(() => {
    if (!selectedExperience) {
      setExperienceStops({ status: "idle", data: [] });
      setIsShareOpen(false);
      return;
    }
    const fetchExperienceStops = async () => {
      setExperienceStops({ status: "loading", data: [] });
      const locationIds = selectedExperience.user_map_pins.map(
        (p) => p.location_id
      );
      if (locationIds.length === 0) {
        setExperienceStops({ status: "success", data: [] });
        return;
      }
      try {
        const { data: locationsData, error } = await supabase
          .from("locations")
          .select("*")
          .in("id", locationIds);
        if (error) throw error;

        // Include dynamic pins in case the user built a route using their personal lists!
        const allPossiblePins = [...locationsData, ...(dynamicPins || [])];

        const orderedStops = selectedExperience.user_map_pins
          .sort((a, b) => a.order_index - b.order_index)
          .map((pinRecord) =>
            allPossiblePins.find((loc) => loc.id === pinRecord.location_id)
          )
          .filter(Boolean);

        setExperienceStops({ status: "success", data: orderedStops });
      } catch (error) {
        setExperienceStops({ status: "error", data: [] });
      }
    };
    fetchExperienceStops();
  }, [selectedExperience, dynamicPins]);

  // --- ROUTE HANDLERS ---
  const handleDeleteExperience = (routeId) => {
    Alert.alert("Delete Route", "Are you sure you want to delete this route?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase
            .from("user_maps")
            .delete()
            .eq("id", routeId);
          if (!error) {
            setMyRoutes((prev) => prev.filter((r) => r.id !== routeId));
            setSelectedExperience(null);
          }
        },
      },
    ]);
  };

  const handleSaveExperience = async () => {
    if (!newRouteName.trim() || stops.length === 0) return;
    setIsSavingRoute(true);
    const { data: mapData, error: mapError } = await supabase
      .from("user_maps")
      .insert({ title: newRouteName, user_id: session.user.id })
      .select()
      .single();
    if (!mapError) {
      const pinsToInsert = stops.map((stop, index) => ({
        map_id: mapData.id,
        location_id: stop.id,
        order_index: index,
      }));
      await supabase.from("user_map_pins").insert(pinsToInsert);
      setNewRouteName("");
      clearRoute();
      setExperiencesView("list");
    }
    setIsSavingRoute(false);
  };

  const handleUpdateExperience = async () => {
    if (!newRouteName.trim() || editedStops.length === 0) return;
    setIsSavingRoute(true);
    await supabase
      .from("user_maps")
      .update({ title: newRouteName })
      .eq("id", selectedExperience.id);
    await supabase
      .from("user_map_pins")
      .delete()
      .eq("map_id", selectedExperience.id);
    const pinsToInsert = editedStops.map((stop, index) => ({
      map_id: selectedExperience.id,
      location_id: stop.id,
      order_index: index,
    }));
    await supabase.from("user_map_pins").insert(pinsToInsert);
    setIsEditing(false);
    setIsSavingRoute(false);
  };

  const handleSendToFriend = async () => {
    if (!session?.user) return;
    const success = await shareWithFriend(
      selectedExperience.id,
      session.user.id,
      friendUsername
    );
    if (success) {
      setFriendUsername("");
      setIsShareOpen(false);
    }
  };

  const handleCopyPublicLink = () => {
    const baseUrl =
      Platform.OS === "web" ? window.location.origin : "https://hyrosy.com";
    const shareLink = `${baseUrl}/map?route=${selectedExperience.id}`;
    if (Platform.OS === "web") {
      navigator.clipboard.writeText(shareLink).then(() => {
        toast.success("Link Copied!", {
          style: {
            background: "#2e3142",
            border: "1px solid #d3bc8e",
            color: "#d3bc8e",
          },
        });
      });
    } else Alert.alert("Share Link", shareLink);
  };

  // --- WORLD HANDLERS ---
  const handleCreateWorld = async () => {
    if (!newWorldName.trim()) return;
    setIsSavingWorld(true);
    const { data: worldData, error: worldError } = await supabase
      .from("worlds")
      .insert({
        name: newWorldName.trim(),
        description: newWorldDesc.trim(),
        owner_id: session.user.id,
      })
      .select()
      .single();
    if (!worldError && worldData) {
      await supabase.from("world_members").insert({
        world_id: worldData.id,
        user_id: session.user.id,
        role: "owner",
      });
      setNewWorldName("");
      setNewWorldDesc("");
      setWorldView("list");
    } else {
      toast.error("Failed to create World.");
    }
    setIsSavingWorld(false);
  };

  const handleDeleteWorld = (worldId) => {
    Alert.alert(
      "Destroy World",
      "Are you sure you want to permanently delete this World?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Destroy",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase
              .from("worlds")
              .delete()
              .eq("id", worldId);
            if (!error) {
              setMyWorlds((prev) => prev.filter((r) => r.id !== worldId));
              setSelectedWorld(null);
            }
          },
        },
      ]
    );
  };

  const handleInviteToParty = async () => {
    if (!worldFriendUsername.trim() || !selectedWorld) return;
    setIsInviting(true);
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id")
        .ilike("username", worldFriendUsername.trim())
        .single();
      if (error || !profile) {
        toast.error("Traveler not found!");
        setIsInviting(false);
        return;
      }

      const { error: inviteError } = await supabase
        .from("world_members")
        .insert({
          world_id: selectedWorld.id,
          user_id: profile.id,
          role: "editor",
        });
      if (inviteError) {
        if (inviteError.code === "23505")
          toast.info("They are already in the Party!");
        else throw inviteError;
      } else {
        toast.success(`@${worldFriendUsername} joined the World!`);
        setWorldFriendUsername("");
        setIsWorldShareOpen(false);
      }
    } catch (err) {
      console.error(err);
    }
    setIsInviting(false);
  };

  // --- RENDER VIEWS ---

  // 1. RENDER CUSTOM ROUTES & LISTS
  // 1. RENDER CUSTOM ROUTES & LISTS
  const renderCustomTab = () => {
    if (!session?.user) {
      return (
        <View className="p-6 mt-4">
          <View className="bg-[#2e3142] rounded-3xl border border-[#3b3e52] p-6 shadow-2xl relative overflow-hidden">
            {/* Ambient Glow */}
            <View className="absolute -top-10 -right-10 w-32 h-32 bg-[#d3bc8e] rounded-full blur-[60px] opacity-20" />

            <View className="w-16 h-16 bg-[#1c1d28] rounded-2xl items-center justify-center border border-[#d3bc8e] mb-6 shadow-lg">
              <MapIcon size={28} color="#d3bc8e" />
            </View>

            <Text className="text-2xl font-black text-white mb-2 tracking-tight">
              Your Personal Atlas
            </Text>
            <Text className="text-gray-400 font-medium leading-6 mb-8">
              Build custom itineraries, save hidden gems into private lists, and
              share routes directly to your friends' map.
            </Text>

            {/* Visual Feature List */}
            <View className="space-y-4 mb-8">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-[#1c1d28] items-center justify-center border border-[#3b3e52] mr-4 shadow-sm">
                  <MapPin size={18} color="#d3bc8e" />
                </View>
                <Text className="text-white font-bold text-base">
                  Save unlimited locations
                </Text>
              </View>
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-[#1c1d28] items-center justify-center border border-[#3b3e52] mr-4 shadow-sm">
                  <Route size={18} color="#d3bc8e" />
                </View>
                <Text className="text-white font-bold text-base">
                  Connect pins into routes
                </Text>
              </View>
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-[#1c1d28] items-center justify-center border border-[#3b3e52] mr-4 shadow-sm">
                  <Share2 size={18} color="#d3bc8e" />
                </View>
                <Text className="text-white font-bold text-base">
                  Share directly via Inbox
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onRequestAuth}
              className="w-full bg-[#e6ce9a] h-14 rounded-xl items-center justify-center shadow-[0_0_20px_rgba(230,206,154,0.3)] active:scale-95 transition-transform"
            >
              <Text className="text-[#1c1d28] font-black text-lg">
                Join to Create Routes
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (selectedExperience) {
      // (Editing and Viewing Route blocks remain exactly the same as your code)
      if (isEditing) {
        return (
          <View className="p-5 pb-12">
            <TouchableOpacity
              onPress={() => setIsEditing(false)}
              className="flex-row items-center mb-6 bg-[#2e3142] self-start px-4 py-2 rounded-full border border-[#3b3e52]"
            >
              <ArrowLeft size={16} color="#d3bc8e" />
              <Text className="text-[#d3bc8e] ml-2 font-medium">
                Cancel Edit
              </Text>
            </TouchableOpacity>
            <Text className="font-bold text-2xl mb-4 text-white">
              Editing Route
            </Text>
            <TextInput
              placeholder="Route Name..."
              placeholderTextColor="#6b7280"
              value={newRouteName}
              onChangeText={setNewRouteName}
              className="bg-[#2e3142] border border-[#3b3e52] text-white rounded-xl p-4 mb-6 font-medium text-base focus:border-[#d3bc8e]"
            />

            <View className="relative z-10 mb-6">
              <View className="flex-row items-center bg-[#2e3142] border border-[#3b3e52] rounded-xl px-4 h-14 shadow-sm">
                <Search size={20} color="#9ca3af" />
                <TextInput
                  placeholder="Search locations to add..."
                  placeholderTextColor="#6b7280"
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                  className="flex-1 text-white ml-3 text-base"
                />
              </View>
              {searchResults.length > 0 && (
                <View className="absolute top-16 left-0 right-0 bg-[#2e3142] border border-[#3b3e52] rounded-xl shadow-2xl z-50 p-2">
                  {searchResults.map((pin) => (
                    <SearchResultItem
                      key={pin.id}
                      pin={pin}
                      onSelect={() => {
                        setEditedStops((prev) => [...prev, pin]);
                        setSearchTerm("");
                      }}
                    />
                  ))}
                </View>
              )}
            </View>

            <Text className="font-bold text-[#d3bc8e] mb-3 tracking-wider uppercase text-xs">
              LOCATIONS ({editedStops.length})
            </Text>
            <View className="space-y-3 mb-8">
              {editedStops.map((stop) => (
                <View
                  key={stop.id}
                  className="flex-row items-center justify-between bg-[#2e3142] p-4 rounded-xl border border-[#3b3e52] shadow-sm"
                >
                  <Text className="font-medium text-white flex-1">
                    {stop.name}
                  </Text>
                  <TouchableOpacity
                    onPress={() =>
                      setEditedStops((prev) =>
                        prev.filter((s) => s.id !== stop.id)
                      )
                    }
                    className="p-2 bg-red-900/20 rounded-lg ml-2"
                  >
                    <Trash2 size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <TouchableOpacity
              onPress={handleUpdateExperience}
              disabled={isSavingRoute}
              className={`w-full h-14 rounded-xl items-center justify-center shadow-lg ${
                isSavingRoute
                  ? "bg-[#3b3e52]"
                  : "bg-[#e6ce9a] active:bg-[#d3bc8e]"
              }`}
            >
              <Text
                className={`${
                  isSavingRoute ? "text-gray-400" : "text-[#1c1d28]"
                } font-bold text-lg`}
              >
                {isSavingRoute ? "Saving..." : "Save Route"}
              </Text>
            </TouchableOpacity>
          </View>
        );
      }

      return (
        <View className="p-5 pb-12">
          <TouchableOpacity
            onPress={() => setSelectedExperience(null)}
            className="flex-row items-center mb-6 bg-[#2e3142] self-start px-4 py-2 rounded-full border border-[#3b3e52]"
          >
            <ArrowLeft size={16} color="#d3bc8e" />
            <Text className="text-[#d3bc8e] ml-2 font-medium">Back</Text>
          </TouchableOpacity>
          <Text className="font-black text-3xl mb-6 text-white tracking-tight">
            {selectedExperience.title}
          </Text>

          <View className="mb-6 space-y-3">
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() =>
                  onViewExperience && onViewExperience(selectedExperience)
                }
                className="flex-1 h-12 bg-[#e6ce9a] rounded-xl flex-row items-center justify-center active:bg-[#d3bc8e] shadow-lg"
              >
                <MapPin size={18} color="#1c1d28" className="mr-2" />
                <Text className="text-[#1c1d28] font-bold">View Route</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setIsShareOpen(!isShareOpen)}
                className={`h-12 px-4 border rounded-xl flex-row items-center justify-center ${
                  isShareOpen
                    ? "bg-[#3b3e52] border-[#d3bc8e]"
                    : "bg-[#2e3142] border-[#3b3e52]"
                }`}
              >
                <Share2 size={18} color="#d3bc8e" />
              </TouchableOpacity>
            </View>
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setIsEditing(true)}
                className="flex-1 h-12 border border-[#3b3e52] bg-[#2e3142] rounded-xl flex-row items-center justify-center active:bg-[#3b3e52]"
              >
                <Edit size={16} color="white" className="mr-2" />
                <Text className="text-white font-medium text-sm">Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDeleteExperience(selectedExperience.id)}
                className="flex-1 h-12 border border-red-900/50 bg-[#1c1d28] rounded-xl flex-row items-center justify-center active:bg-red-900/20"
              >
                <Trash2 size={16} color="#ef4444" className="mr-2" />
                <Text className="text-red-400 font-medium text-sm">Delete</Text>
              </TouchableOpacity>
            </View>
          </View>

          {isShareOpen && (
            <View className="bg-[#2e3142] p-5 rounded-2xl border border-[#d3bc8e]/50 mb-8 shadow-xl">
              <Text className="text-[#d3bc8e] font-bold text-lg mb-1">
                Share Route
              </Text>
              <Text className="text-gray-400 text-xs mb-4">
                Send directly to a friend's app inbox.
              </Text>
              <View className="flex-row gap-2 mb-4">
                <TextInput
                  placeholder="Traveler Username..."
                  placeholderTextColor="#6b7280"
                  value={friendUsername}
                  onChangeText={setFriendUsername}
                  className="flex-1 bg-[#1c1d28] border border-[#3b3e52] rounded-xl px-4 text-white focus:border-[#d3bc8e]"
                />
                <TouchableOpacity
                  onPress={handleSendToFriend}
                  disabled={isSending}
                  className="bg-[#e6ce9a] px-5 rounded-xl justify-center items-center active:bg-[#d3bc8e]"
                >
                  <Text className="text-[#1c1d28] font-bold">
                    {isSending ? "..." : "Send"}
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={handleCopyPublicLink}
                className="w-full h-12 border border-[#3b3e52] bg-[#1c1d28] rounded-xl flex-row items-center justify-center active:border-[#d3bc8e]/50"
              >
                <Link size={16} color="#d3bc8e" className="mr-2" />
                <Text className="text-[#d3bc8e] font-bold">
                  Copy Public Link
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <Text className="font-bold text-[#d3bc8e] mt-2 border-b border-[#3b3e52] pb-2 mb-6 tracking-wider uppercase text-xs">
            Stops
          </Text>
          {experienceStops.status === "loading" && (
            <ActivityIndicator color="#d3bc8e" size="large" className="mt-4" />
          )}
          {experienceStops.status === "success" && (
            <View className="pl-1">
              {experienceStops.data.map((step, index) => (
                <View
                  key={step.id}
                  className="relative p-5 border-l-2 border-[#3b3e52] mb-4 bg-[#2e3142] rounded-r-2xl shadow-sm"
                >
                  <View className="flex-row items-center gap-4 mb-2">
                    <View className="w-8 h-8 rounded-full items-center justify-center bg-[#1c1d28] border border-[#d3bc8e]">
                      <Text className="font-bold text-[#d3bc8e]">
                        {index + 1}
                      </Text>
                    </View>
                    <Text className="font-bold text-lg text-white flex-1">
                      {step.name}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      );
    }

    if (experiencesView === "create") {
      return (
        <View className="p-5 pb-12">
          <TouchableOpacity
            onPress={() => setExperiencesView("list")}
            className="flex-row items-center mb-6 bg-[#2e3142] self-start px-4 py-2 rounded-full border border-[#3b3e52]"
          >
            <ArrowLeft size={16} color="#d3bc8e" />
            <Text className="text-[#d3bc8e] ml-2 font-medium">Cancel</Text>
          </TouchableOpacity>
          <Text className="font-bold text-2xl mb-6 text-white">
            Create New Route
          </Text>
          <TextInput
            placeholder="Name your route..."
            placeholderTextColor="#6b7280"
            value={newRouteName}
            onChangeText={setNewRouteName}
            className="bg-[#2e3142] border border-[#3b3e52] text-white rounded-xl p-4 mb-6 font-medium text-base focus:border-[#d3bc8e]"
          />

          <View className="relative z-10 mb-6">
            <View className="flex-row items-center bg-[#2e3142] border border-[#3b3e52] rounded-xl px-4 h-14 shadow-sm">
              <Search size={20} color="#9ca3af" />
              <TextInput
                placeholder="Search locations & lists..."
                placeholderTextColor="#6b7280"
                value={searchTerm}
                onChangeText={setSearchTerm}
                className="flex-1 text-white ml-3 text-base"
              />
            </View>
            {searchResults.length > 0 && (
              <View className="absolute top-16 left-0 right-0 bg-[#2e3142] border border-[#3b3e52] rounded-xl shadow-2xl z-50 p-2 max-h-64">
                <ScrollView>
                  {searchResults.map((pin) => (
                    <SearchResultItem
                      key={pin.id}
                      pin={pin}
                      onSelect={() => {
                        addStop(pin);
                        setSearchTerm("");
                      }}
                    />
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          <Text className="font-bold text-[#d3bc8e] mb-3 tracking-wider uppercase text-xs">
            SELECTED LOCATIONS ({stops.length})
          </Text>
          <View className="space-y-3 mb-8 min-h-[100px]">
            {stops.map((stop) => (
              <View
                key={stop.id}
                className="flex-row items-center justify-between bg-[#2e3142] p-4 rounded-xl border border-[#3b3e52] shadow-sm"
              >
                <Text className="font-medium text-white flex-1">
                  {stop.name}
                </Text>
                <TouchableOpacity
                  onPress={() => removeStop(stop.id)}
                  className="p-2 bg-[#1c1d28] rounded-lg ml-2 border border-[#3b3e52] active:bg-[#3b3e52]"
                >
                  <X size={18} color="#9ca3af" />
                </TouchableOpacity>
              </View>
            ))}
            {stops.length === 0 && (
              <Text className="text-sm text-gray-500 italic py-4 text-center border border-dashed border-[#3b3e52] rounded-xl bg-[#2e3142]/50">
                Search above to add places from Map or Lists.
              </Text>
            )}
          </View>

          <TouchableOpacity
            onPress={handleSaveExperience}
            disabled={isSavingRoute}
            className={`w-full h-14 rounded-xl items-center justify-center shadow-lg ${
              isSavingRoute
                ? "bg-[#3b3e52]"
                : "bg-[#e6ce9a] active:bg-[#d3bc8e]"
            }`}
          >
            <Text
              className={`${
                isSavingRoute ? "text-gray-400" : "text-[#1c1d28]"
              } font-bold text-lg`}
            >
              {isSavingRoute ? "Creating..." : "Save Route"}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View className="p-5">
        {/* 🌟 SUB-TAB SWITCHER (Routes vs Lists) 🌟 */}
        <View className="flex-row bg-[#1c1d28] rounded-xl p-1 mb-6 border border-[#3b3e52]">
          <TouchableOpacity
            onPress={() => setCustomSubTab("routes")}
            className={`flex-1 py-2.5 rounded-lg flex-row justify-center items-center ${
              customSubTab === "routes" ? "bg-[#2e3142]" : ""
            }`}
          >
            <Text
              className={
                customSubTab === "routes"
                  ? "text-[#d3bc8e] font-bold"
                  : "text-gray-500 font-semibold"
              }
            >
              My Routes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setCustomSubTab("lists")}
            className={`flex-1 py-2.5 rounded-lg flex-row justify-center items-center ${
              customSubTab === "lists" ? "bg-[#2e3142]" : ""
            }`}
          >
            <Text
              className={
                customSubTab === "lists"
                  ? "text-[#d3bc8e] font-bold"
                  : "text-gray-500 font-semibold"
              }
            >
              Saved Lists
            </Text>
          </TouchableOpacity>
        </View>

        {customSubTab === "routes" ? (
          <>
            <TouchableOpacity
              onPress={() => setExperiencesView("create")}
              className="w-full h-14 bg-[#e6ce9a] rounded-xl flex-row items-center justify-center active:bg-[#d3bc8e] mb-8 shadow-lg"
            >
              <PlusCircle size={20} color="#1c1d28" className="mr-2" />
              <Text className="text-[#1c1d28] font-bold text-lg">
                Create Custom Route
              </Text>
            </TouchableOpacity>

            <Text className="font-bold text-[#d3bc8e] mb-4 tracking-wider uppercase text-xs ml-1 border-b border-[#3b3e52] pb-2">
              Your Routes
            </Text>
            {loadingRoutes ? (
              <ActivityIndicator
                color="#d3bc8e"
                size="large"
                className="mt-8"
              />
            ) : myRoutes.length > 0 ? (
              myRoutes.map((route) => (
                <TouchableOpacity
                  key={route.id}
                  onPress={() => setSelectedExperience(route)}
                  className="w-full p-5 mb-4 bg-[#2e3142] border border-[#3b3e52] rounded-2xl active:border-[#d3bc8e]/50 shadow-sm"
                >
                  <Text className="font-bold text-xl text-white mb-1.5">
                    {route.title}
                  </Text>
                  <Text className="text-sm text-[#d3bc8e] font-medium">
                    {route.user_map_pins?.length || 0} locations
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <View className="items-center justify-center p-8 bg-[#2e3142]/50 rounded-2xl border border-[#3b3e52] border-dashed mt-4">
                <MapIcon size={32} color="#3b3e52" className="mb-3" />
                <Text className="text-gray-400 text-center font-medium">
                  You haven't created any routes yet.
                </Text>
              </View>
            )}
          </>
        ) : (
          <>
            {/* 🌟 NEW: RENDER SAVED LISTS ACCORDION 🌟 */}
            <Text className="font-bold text-[#d3bc8e] mb-4 tracking-wider uppercase text-xs ml-1 border-b border-[#3b3e52] pb-2">
              {currentWorld?.id === "base" ? "Personal Pins" : "World Pins"}
            </Text>

            {Object.keys(pinsByCategory).length > 0 ? (
              Object.entries(pinsByCategory).map(([category, pins]) => (
                <View key={category} className="mb-4">
                  <TouchableOpacity
                    onPress={() =>
                      setOpenListAccordion(
                        openListAccordion === category ? null : category
                      )
                    }
                    className="flex-row justify-between items-center p-4 bg-[#2e3142] rounded-xl border border-[#3b3e52] shadow-sm"
                  >
                    <View className="flex-row items-center">
                      <List size={20} color="#d3bc8e" className="mr-3" />
                      <Text className="font-bold text-lg text-white tracking-tight">
                        {category}{" "}
                        <Text className="text-gray-500 font-normal">
                          ({pins.length})
                        </Text>
                      </Text>
                    </View>
                    <ChevronDown
                      size={20}
                      color={
                        openListAccordion === category ? "white" : "#6b7280"
                      }
                      style={
                        openListAccordion !== category && {
                          transform: [{ rotate: "-90deg" }],
                        }
                      }
                    />
                  </TouchableOpacity>

                  {openListAccordion === category && (
                    <View className="pt-3 pl-2 pr-2">
                      {pins.map((pin) => (
                        <View
                          key={pin.id}
                          className="flex-row items-center gap-3 p-3 bg-[#1c1d28] rounded-xl mb-2 border border-[#3b3e52]"
                        >
                          <View className="w-10 h-10 bg-[#2e3142] rounded-lg items-center justify-center border border-[#3b3e52]">
                            <MapPin size={18} color="#d3bc8e" />
                          </View>
                          <View className="flex-1">
                            <Text
                              className="text-white font-medium text-sm"
                              numberOfLines={1}
                            >
                              {pin.name}
                            </Text>
                            {pin.description && (
                              <Text
                                className="text-gray-500 text-xs"
                                numberOfLines={1}
                              >
                                {pin.description}
                              </Text>
                            )}
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))
            ) : (
              <View className="items-center justify-center p-8 bg-[#2e3142]/50 rounded-2xl border border-[#3b3e52] border-dashed mt-4">
                <MapPin size={32} color="#3b3e52" className="mb-3" />
                <Text className="text-gray-400 text-center font-medium">
                  No pins dropped in this World yet. Click the map to start
                  building your lists!
                </Text>
              </View>
            )}
          </>
        )}
      </View>
    );
  };

  // 2. RENDER WORLDS (Multiplayer Realms)
  // 2. RENDER WORLDS (Multiplayer Realms)
  const renderMyWorlds = () => {
    if (!session?.user) {
      return (
        <View className="p-6 mt-4">
          <View className="bg-[#2e3142] rounded-3xl border border-[#3b3e52] p-6 shadow-2xl relative overflow-hidden">
            {/* Ambient Glow */}
            <View className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500 rounded-full blur-[60px] opacity-10" />

            <View className="w-16 h-16 bg-[#1c1d28] rounded-2xl items-center justify-center border border-[#d3bc8e] mb-6 shadow-lg">
              <Globe size={28} color="#d3bc8e" />
            </View>

            <Text className="text-2xl font-black text-white mb-2 tracking-tight">
              Multiplayer Realms
            </Text>
            <Text className="text-gray-400 font-medium leading-6 mb-8">
              Turn the map into a co-op lobby. Invite your party, see their live
              movements on the radar, and conquer the world together.
            </Text>

            {/* Visual Feature List */}
            <View className="space-y-4 mb-8">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-[#1c1d28] items-center justify-center border border-[#3b3e52] mr-4 shadow-sm">
                  <Users size={18} color="#d3bc8e" />
                </View>
                <Text className="text-white font-bold text-base">
                  Form a private travel party
                </Text>
              </View>
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-[#1c1d28] items-center justify-center border border-[#3b3e52] mr-4 shadow-sm">
                  <Radar size={18} color="#d3bc8e" />
                </View>
                <Text className="text-white font-bold text-base">
                  Live GTA-style mini-map
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onRequestAuth}
              className="w-full bg-[#e6ce9a] h-14 rounded-xl items-center justify-center shadow-[0_0_20px_rgba(230,206,154,0.3)] active:scale-95 transition-transform"
            >
              <Text className="text-[#1c1d28] font-black text-lg">
                Join to Forge Worlds
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (selectedWorld) {
      return (
        <View className="p-5 pb-12">
          <TouchableOpacity
            onPress={() => setSelectedWorld(null)}
            className="flex-row items-center mb-6 bg-[#2e3142] self-start px-4 py-2 rounded-full border border-[#3b3e52]"
          >
            <ArrowLeft size={16} color="#d3bc8e" />
            <Text className="text-[#d3bc8e] ml-2 font-medium">
              Back to Lobby
            </Text>
          </TouchableOpacity>

          <Text className="font-black text-3xl mb-2 text-white tracking-tight">
            {selectedWorld.name}
          </Text>
          <Text className="text-gray-400 mb-8 leading-6">
            {selectedWorld.description || "A custom multiplayer world."}
          </Text>

          <View className="mb-6 space-y-3">
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => onEnterWorld && onEnterWorld(selectedWorld)}
                className="flex-1 h-14 bg-[#e6ce9a] rounded-xl flex-row items-center justify-center active:bg-[#d3bc8e] shadow-[0_0_20px_rgba(230,206,154,0.3)]"
              >
                <Globe size={20} color="#1c1d28" className="mr-2" />
                <Text className="text-[#1c1d28] font-black text-lg tracking-wide">
                  ENTER WORLD
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setIsWorldShareOpen(!isWorldShareOpen)}
                className={`h-14 px-4 border rounded-xl flex-row items-center justify-center ${
                  isWorldShareOpen
                    ? "bg-[#3b3e52] border-[#d3bc8e]"
                    : "bg-[#2e3142] border-[#3b3e52]"
                }`}
              >
                <UserPlus size={20} color="#d3bc8e" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={() => handleDeleteWorld(selectedWorld.id)}
              className="w-full h-12 border border-red-900/50 bg-[#1c1d28] rounded-xl flex-row items-center justify-center active:bg-red-900/20 mt-2"
            >
              <Trash2 size={16} color="#ef4444" className="mr-2" />
              <Text className="text-red-400 font-medium text-sm">
                Destroy World
              </Text>
            </TouchableOpacity>
          </View>

          {isWorldShareOpen && (
            <View className="bg-[#2e3142] p-5 rounded-2xl border border-[#d3bc8e]/50 mb-8 shadow-xl">
              <Text className="text-[#d3bc8e] font-bold text-lg mb-1">
                Add to Party
              </Text>
              <Text className="text-gray-400 text-xs mb-4">
                Invite a friend to Co-Op this map with you.
              </Text>
              <View className="flex-row gap-2 mb-2">
                <TextInput
                  placeholder="Traveler @username..."
                  placeholderTextColor="#6b7280"
                  value={worldFriendUsername}
                  onChangeText={setWorldFriendUsername}
                  autoCapitalize="none"
                  className="flex-1 bg-[#1c1d28] border border-[#3b3e52] rounded-xl px-4 text-white focus:border-[#d3bc8e]"
                />
                <TouchableOpacity
                  onPress={handleInviteToParty}
                  disabled={isInviting}
                  className="bg-[#e6ce9a] px-5 rounded-xl justify-center items-center active:bg-[#d3bc8e]"
                >
                  <Text className="text-[#1c1d28] font-bold">
                    {isInviting ? "..." : "Invite"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      );
    }

    if (worldView === "create") {
      return (
        <View className="p-5 pb-12">
          <TouchableOpacity
            onPress={() => setWorldView("list")}
            className="flex-row items-center mb-6 bg-[#2e3142] self-start px-4 py-2 rounded-full border border-[#3b3e52]"
          >
            <ArrowLeft size={16} color="#d3bc8e" />
            <Text className="text-[#d3bc8e] ml-2 font-medium">Cancel</Text>
          </TouchableOpacity>
          <Text className="font-bold text-2xl mb-6 text-white">
            Forge New World
          </Text>
          <Text className="text-[#d3bc8e] text-xs font-bold uppercase tracking-wider mb-2 pl-1">
            World Name
          </Text>
          <TextInput
            placeholder="e.g., Morocco Trip 2026..."
            placeholderTextColor="#6b7280"
            value={newWorldName}
            onChangeText={setNewWorldName}
            className="bg-[#2e3142] border border-[#3b3e52] text-white rounded-xl p-4 mb-6 font-bold text-lg focus:border-[#d3bc8e]"
          />
          <Text className="text-[#d3bc8e] text-xs font-bold uppercase tracking-wider mb-2 pl-1">
            Description (Optional)
          </Text>
          <TextInput
            placeholder="What is this world for?"
            placeholderTextColor="#6b7280"
            value={newWorldDesc}
            onChangeText={setNewWorldDesc}
            multiline
            className="bg-[#2e3142] border border-[#3b3e52] text-white rounded-xl p-4 mb-8 font-medium text-sm h-24 focus:border-[#d3bc8e]"
          />
          <TouchableOpacity
            onPress={handleCreateWorld}
            disabled={isSavingWorld}
            className={`w-full h-14 rounded-xl items-center justify-center shadow-lg ${
              isSavingWorld
                ? "bg-[#3b3e52]"
                : "bg-[#e6ce9a] active:bg-[#d3bc8e]"
            }`}
          >
            <Text
              className={`${
                isSavingWorld ? "text-gray-400" : "text-[#1c1d28]"
              } font-black text-lg tracking-wide`}
            >
              {isSavingWorld ? "Forging..." : "Create World"}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View className="p-5">
        <TouchableOpacity
          onPress={() => setWorldView("create")}
          className="w-full h-14 bg-[#e6ce9a] rounded-xl flex-row items-center justify-center active:bg-[#d3bc8e] mb-8 shadow-lg"
        >
          <PlusCircle size={20} color="#1c1d28" className="mr-2" />
          <Text className="text-[#1c1d28] font-bold text-lg">
            Forge New World
          </Text>
        </TouchableOpacity>
        <Text className="font-bold text-[#d3bc8e] mb-4 tracking-wider uppercase text-xs ml-1 border-b border-[#3b3e52] pb-2">
          Available Worlds
        </Text>
        {loadingWorlds ? (
          <ActivityIndicator color="#d3bc8e" size="large" className="mt-8" />
        ) : myWorlds.length > 0 ? (
          myWorlds.map((world) => (
            <TouchableOpacity
              key={world.id}
              onPress={() => setSelectedWorld(world)}
              className="w-full p-5 mb-4 bg-[#2e3142] border border-[#3b3e52] rounded-2xl active:border-[#d3bc8e]/50 shadow-sm"
            >
              <View className="flex-row items-center justify-between mb-1.5">
                <Text className="font-bold text-xl text-white">
                  {world.name}
                </Text>
                <Globe size={16} color="#6b7280" />
              </View>
              <Text
                className="text-sm text-gray-400 font-medium"
                numberOfLines={1}
              >
                {world.description || "Enter to explore..."}
              </Text>
            </TouchableOpacity>
          ))
        ) : (
          <View className="items-center justify-center p-8 bg-[#2e3142]/50 rounded-2xl border border-[#3b3e52] border-dashed mt-4">
            <Globe size={32} color="#3b3e52" className="mb-3" />
            <Text className="text-gray-400 text-center font-medium">
              You haven't forged any multiplayer Worlds yet.
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (!isOpen) return null;

  return (
    <View className="absolute top-0 left-0 w-full sm:w-[400px] h-full bg-[#1c1d28] z-50 flex-col shadow-2xl border-r border-[#3b3e52]">
      <View className="flex-row justify-between items-center px-6 py-5 bg-[#1c1d28] border-b border-[#3b3e52] pt-14">
        <Text className="text-2xl font-black text-white tracking-tight">
          Adventures
        </Text>
        <TouchableOpacity
          onPress={onClose}
          className="p-2 bg-[#2e3142] rounded-full border border-[#3b3e52]"
        >
          <X size={20} color="#9ca3af" />
        </TouchableOpacity>
      </View>

      {/* 🌟 3-TAB NAVIGATION BAR 🌟 */}
      <View className="flex-row border-b border-[#3b3e52] bg-[#1c1d28]">
        <TouchableOpacity
          onPress={() => setMainTab("quests")}
          className={`flex-1 py-4 items-center flex-col justify-center gap-1 ${
            mainTab === "quests"
              ? "border-b-2 border-[#d3bc8e] bg-[#2e3142]/50"
              : ""
          }`}
        >
          <Swords
            size={18}
            color={mainTab === "quests" ? "#d3bc8e" : "#6b7280"}
          />
          <Text
            className={`text-[10px] uppercase tracking-wider ${
              mainTab === "quests"
                ? "text-[#d3bc8e] font-bold"
                : "text-gray-500 font-bold"
            }`}
          >
            System
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setMainTab("routes")}
          className={`flex-1 py-4 items-center flex-col justify-center gap-1 ${
            mainTab === "routes"
              ? "border-b-2 border-[#d3bc8e] bg-[#2e3142]/50"
              : ""
          }`}
        >
          <MapIcon
            size={18}
            color={mainTab === "routes" ? "#d3bc8e" : "#6b7280"}
          />
          <Text
            className={`text-[10px] uppercase tracking-wider ${
              mainTab === "routes"
                ? "text-[#d3bc8e] font-bold"
                : "text-gray-500 font-bold"
            }`}
          >
            Custom
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setMainTab("worlds")}
          className={`flex-1 py-4 items-center flex-col justify-center gap-1 ${
            mainTab === "worlds"
              ? "border-b-2 border-[#d3bc8e] bg-[#2e3142]/50"
              : ""
          }`}
        >
          <Globe
            size={18}
            color={mainTab === "worlds" ? "#d3bc8e" : "#6b7280"}
          />
          <Text
            className={`text-[10px] uppercase tracking-wider ${
              mainTab === "worlds"
                ? "text-[#d3bc8e] font-bold"
                : "text-gray-500 font-bold"
            }`}
          >
            Worlds
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 bg-[#1c1d28]"
        contentContainerStyle={{ paddingBottom: 60, flexGrow: 1 }}
      >
        {/* RENDER TAB 1: QUESTS */}
        {mainTab === "quests" && (
          <View className="p-5">
            {!activeQuest ? (
              <View>
                <View className="flex-row bg-[#1c1d28] rounded-xl p-1 mb-6 border border-[#3b3e52]">
                  <TouchableOpacity
                    onPress={() => setQuestsActiveTab("by_city")}
                    className={`flex-1 py-2.5 rounded-lg flex-row justify-center items-center ${
                      questsActiveTab === "by_city" ? "bg-[#2e3142]" : ""
                    }`}
                  >
                    <Text
                      className={
                        questsActiveTab === "by_city"
                          ? "text-[#d3bc8e] font-bold"
                          : "text-gray-500 font-semibold"
                      }
                    >
                      Cities
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setQuestsActiveTab("multi_city")}
                    className={`flex-1 py-2.5 rounded-lg flex-row justify-center items-center ${
                      questsActiveTab === "multi_city" ? "bg-[#2e3142]" : ""
                    }`}
                  >
                    <Text
                      className={
                        questsActiveTab === "multi_city"
                          ? "text-[#d3bc8e] font-bold"
                          : "text-gray-500 font-semibold"
                      }
                    >
                      Multi
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setQuestsActiveTab("premium")}
                    className={`flex-1 py-2.5 rounded-lg flex-row justify-center items-center ${
                      questsActiveTab === "premium" ? "bg-[#2e3142]" : ""
                    }`}
                  >
                    <Text
                      className={
                        questsActiveTab === "premium"
                          ? "text-[#d3bc8e] font-bold"
                          : "text-gray-500 font-semibold"
                      }
                    >
                      Pro
                    </Text>
                  </TouchableOpacity>
                </View>

                {Object.keys(questsByCity).length === 0 &&
                  questsActiveTab === "by_city" && (
                    <View className="items-center p-8 mt-4 border border-dashed border-[#3b3e52] rounded-3xl bg-[#2e3142]/50">
                      <ActivityIndicator color="#d3bc8e" />
                      <Text className="text-gray-400 font-medium mt-4">
                        Loading System Quests...
                      </Text>
                    </View>
                  )}

                {questsActiveTab === "by_city" && (
                  <View>
                    {Object.entries(questsByCity).map(([city, cityQuests]) => (
                      <View key={city} className="mb-4">
                        <TouchableOpacity
                          onPress={() =>
                            setOpenAccordion(
                              openAccordion === city ? null : city
                            )
                          }
                          className="flex-row justify-between items-center p-5 bg-[#2e3142] rounded-2xl border border-[#3b3e52] shadow-sm"
                        >
                          <Text className="font-black text-xl text-white tracking-tight">
                            {city}
                          </Text>
                          <ChevronDown
                            size={24}
                            color={openAccordion === city ? "white" : "#6b7280"}
                            style={
                              openAccordion !== city && {
                                transform: [{ rotate: "-90deg" }],
                              }
                            }
                          />
                        </TouchableOpacity>
                        {openAccordion === city && (
                          <View className="pt-4 pl-2 pr-2">
                            {cityQuests.map((quest) => (
                              <QuestCard
                                key={quest.id}
                                quest={quest}
                                onQuestSelect={onQuestSelect}
                                exploredSteps={exploredSteps}
                              />
                            ))}
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}

                {questsActiveTab === "multi_city" && (
                  <View>
                    {multiCityQuests.map((quest) => (
                      <QuestCard
                        key={quest.id}
                        quest={quest}
                        onQuestSelect={onQuestSelect}
                        exploredSteps={exploredSteps}
                      />
                    ))}
                  </View>
                )}

                {questsActiveTab === "premium" && (
                  <View>
                    {premiumQuests.map((quest) => (
                      <QuestCard
                        key={quest.id}
                        quest={quest}
                        onQuestSelect={onQuestSelect}
                        exploredSteps={exploredSteps}
                      />
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <View>
                <TouchableOpacity
                  onPress={handleBack}
                  className="flex-row items-center mb-6 self-start bg-[#2e3142] px-4 py-2 rounded-full border border-[#3b3e52]"
                >
                  <ArrowLeft size={16} color="#d3bc8e" className="mr-2" />
                  <Text className="text-[#d3bc8e] font-medium">
                    Back to Quests
                  </Text>
                </TouchableOpacity>

                <View className="pl-1">
                  {activeQuest.steps?.map((step, index) => {
                    const isExplored = exploredSteps.has(step.id);
                    const isCurrent = index === currentStepIndex;
                    return (
                      <TouchableOpacity
                        key={step.id}
                        onPress={() => handleStepClick(step, index)}
                        className={`relative p-5 mb-5 rounded-2xl border-l-4 shadow-sm transition-all ${
                          isCurrent
                            ? "bg-[#2e3142]/80 border-[#e6ce9a]"
                            : "bg-[#2e3142] border-[#3b3e52]"
                        }`}
                      >
                        <View className="flex-row items-center gap-4 mb-3 pr-14">
                          <View
                            className={`w-10 h-10 rounded-full items-center justify-center border shadow-sm ${
                              isCurrent
                                ? "bg-[#1c1d28] border-[#e6ce9a]"
                                : "bg-[#1c1d28] border-[#3b3e52]"
                            }`}
                          >
                            <Text
                              className={`font-bold text-lg ${
                                isCurrent ? "text-[#e6ce9a]" : "text-gray-400"
                              }`}
                            >
                              {index + 1}
                            </Text>
                          </View>
                          <Text className="font-bold text-lg text-white flex-1 leading-6">
                            {step.name}
                          </Text>
                        </View>
                        <Text
                          className="text-sm text-gray-400 pl-14 mb-2 leading-6"
                          numberOfLines={3}
                        >
                          {step.description?.replace(/<[^>]*>?/gm, "") ||
                            "No description available."}
                        </Text>

                        <View className="absolute top-6 right-5">
                          <TouchableOpacity
                            onPress={(e) => {
                              e.stopPropagation();
                              onToggleStepExplored(step.id);
                            }}
                            className={`h-7 w-12 rounded-full justify-center px-1 border ${
                              isExplored
                                ? "bg-[#e6ce9a] border-[#d3bc8e]"
                                : "bg-[#1c1d28] border-[#3b3e52]"
                            }`}
                          >
                            <View
                              className={`h-5 w-5 rounded-full shadow-sm ${
                                isExplored
                                  ? "self-end bg-[#1c1d28]"
                                  : "self-start bg-[#3b3e52]"
                              }`}
                            />
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        )}

        {/* RENDER TAB 2: MY ROUTES & LISTS */}
        {mainTab === "routes" && renderCustomTab()}

        {/* RENDER TAB 3: WORLDS */}
        {mainTab === "worlds" && renderMyWorlds()}
      </ScrollView>
    </View>
  );
}
