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
} from "react-native";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { useRouteBuilder } from "@/context/RouteBuilderContext";
import {
  X,
  Search,
  PlusCircle,
  ArrowLeft,
  Building,
  ChevronDown,
  Globe,
  MapPin,
  Star,
  Trash2,
  Edit,
} from "lucide-react-native";
import { useCart } from "@/context/CartContext";

// --- SUB-COMPONENTS ---
const SearchResultItem = ({ pin, onSelect }) => (
  <TouchableOpacity
    onPress={onSelect}
    className="w-full flex-row items-center gap-3 p-3 rounded-xl mb-2 bg-gray-800 active:bg-gray-700 border border-gray-700 shadow-sm"
  >
    <View className="relative w-12 h-12 flex-shrink-0">
      <Image
        source={{ uri: pin.image_url || "https://placehold.co/100" }}
        className="w-full h-full rounded-lg object-cover bg-gray-700"
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

// 🌟 UPDATED: Clean Supabase properties! No more WP .acf!
const QuestCard = ({ quest, onQuestSelect, exploredSteps }) => {
  const totalSteps = quest.steps?.length || 0;
  const completedSteps = Array.from(exploredSteps).filter((stepId) =>
    quest.steps?.some((step) => step.id === stepId)
  ).length;
  const progressPercentage =
    totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  return (
    <TouchableOpacity
      className="bg-gray-800 p-4 rounded-xl border border-gray-700 mb-3 active:bg-gray-700 shadow-sm"
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
            <Text className="text-xs font-semibold text-gray-300">
              Progress
            </Text>
            <Text className="text-xs font-bold text-cyan-400">
              {Math.round(progressPercentage)}%
            </Text>
          </View>
          <View className="w-full bg-gray-900 rounded-full h-2 overflow-hidden border border-gray-700">
            <View
              className="bg-cyan-400 h-full rounded-full"
              style={{ width: `${progressPercentage}%` }}
            />
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

// --- MAIN QUEST PANEL COMPONENT ---
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
  onQuestSelect,
}) {
  const [mainTab, setMainTab] = useState("quests");
  const { session } = useAuth();
  const { stops, addStop, removeStop, clearRoute } = useRouteBuilder();
  const handleBack = () => onQuestSelect(null);
  const handleStepClick = (step, index) => {
    if (onStepSelect) onStepSelect(index);
  };

  // States for "My Experiences"
  const [experiencesView, setExperiencesView] = useState("list");
  const [myRoutes, setMyRoutes] = useState([]);
  const [loadingRoutes, setLoadingRoutes] = useState(true);
  const [newRouteName, setNewRouteName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedExperience, setSelectedExperience] = useState(null);
  const [experienceStops, setExperienceStops] = useState({
    status: "idle",
    data: [],
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editedStops, setEditedStops] = useState([]);

  // States for "Official Quests"
  const { addToCart } = useCart();
  const [questsActiveTab, setQuestsActiveTab] = useState("by_city");
  const [openAccordion, setOpenAccordion] = useState(null);

  // --- EFFECTS ---
  useEffect(() => {
    const fetchMyRoutes = async () => {
      if (session?.user && mainTab === "experiences") {
        setLoadingRoutes(true);
        const { data, error } = await supabase
          .from("user_maps")
          .select("*, user_map_pins(location_id, order_index)")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false });

        if (!error) setMyRoutes(data);
        setLoadingRoutes(false);
      }
    };
    fetchMyRoutes();
  }, [isOpen, session, mainTab, experiencesView]);

  useEffect(() => {
    if (searchTerm.length > 1) {
      const lowercasedFilter = searchTerm.toLowerCase();
      const results = (allPins || []).filter((pin) => {
        const titleMatch = pin.name?.toLowerCase().includes(lowercasedFilter);
        const descriptionMatch =
          pin.description?.toLowerCase().includes(lowercasedFilter) || false;
        return titleMatch || descriptionMatch;
      });
      setSearchResults(results.slice(0, 5));
    } else {
      setSearchResults([]);
    }
  }, [searchTerm, allPins]);

  useEffect(() => {
    if (selectedCity) {
      setOpenAccordion(selectedCity.name);
      setQuestsActiveTab("by_city");
    } else {
      setOpenAccordion(null);
    }
  }, [selectedCity]);

  // Sync Edit State
  useEffect(() => {
    if (isEditing && selectedExperience) {
      setNewRouteName(selectedExperience.title);
      setEditedStops(experienceStops.data);
    }
  }, [isEditing, selectedExperience, experienceStops.data]);

  // Fetch My Experience Stops (Supabase)
  useEffect(() => {
    if (!selectedExperience) {
      setExperienceStops({ status: "idle", data: [] });
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
        const orderedStops = selectedExperience.user_map_pins
          .sort((a, b) => a.order_index - b.order_index)
          .map((pinRecord) =>
            locationsData.find((loc) => loc.id === pinRecord.location_id)
          )
          .filter(Boolean);
        setExperienceStops({ status: "success", data: orderedStops });
      } catch (error) {
        setExperienceStops({ status: "error", data: [] });
      }
    };
    fetchExperienceStops();
  }, [selectedExperience]);

  // --- HANDLERS ---
  const handleDeleteExperience = (routeId) => {
    Alert.alert(
      "Delete Experience",
      "Are you sure you want to delete this map?",
      [
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
      ]
    );
  };

  const handleSaveExperience = async () => {
    if (!newRouteName.trim() || stops.length === 0) return;
    setIsSaving(true);
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
    setIsSaving(false);
  };

  const handleUpdateExperience = async () => {
    if (!newRouteName.trim() || editedStops.length === 0) return;
    setIsSaving(true);
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
    setIsSaving(false);
  };

  // 🌟 NEW DYNAMIC FILTERING 🌟
  const questsByCity = (quests || []).reduce((acc, quest) => {
    const city = quest.city || "Multi-City";
    if (city !== "Multi-City") {
      if (!acc[city]) acc[city] = [];
      acc[city].push(quest);
    }
    return acc;
  }, {});
  const multiCityQuests = (quests || []).filter(
    (q) => !q.city || q.city === "Multi-City"
  );
  const premiumQuests = (quests || []).filter((q) =>
    q.description?.toLowerCase().includes("pro")
  );

  // --- RENDER VIEWS ---
  const renderMyExperiences = () => {
    if (!session)
      return (
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-gray-400">Please sign in to create maps.</Text>
        </View>
      );

    if (selectedExperience) {
      if (isEditing) {
        return (
          <View className="p-5 pb-12">
            <TouchableOpacity
              onPress={() => setIsEditing(false)}
              className="flex-row items-center mb-6 bg-gray-800 self-start px-4 py-2 rounded-full"
            >
              <ArrowLeft size={16} color="white" />
              <Text className="text-white ml-2 font-medium">Cancel Edit</Text>
            </TouchableOpacity>

            <Text className="font-bold text-2xl mb-4 text-white">
              Editing Map
            </Text>
            <TextInput
              placeholder="Map Name..."
              placeholderTextColor="#9ca3af"
              value={newRouteName}
              onChangeText={setNewRouteName}
              className="bg-gray-800 border border-gray-700 text-white rounded-xl p-4 mb-6 font-medium text-base"
            />

            <View className="relative z-10 mb-6">
              <View className="flex-row items-center bg-gray-800 border border-gray-700 rounded-xl px-4 h-14">
                <Search size={20} color="#9ca3af" />
                <TextInput
                  placeholder="Search to add more stops..."
                  placeholderTextColor="#9ca3af"
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                  className="flex-1 text-white ml-3 text-base"
                />
              </View>
              {searchResults.length > 0 && (
                <View className="absolute top-16 left-0 right-0 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-50 p-2">
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

            <Text className="font-bold text-gray-300 mb-3 tracking-wider uppercase text-xs">
              LOCATIONS ({editedStops.length})
            </Text>
            <View className="space-y-3 mb-8">
              {editedStops.map((stop) => (
                <View
                  key={stop.id}
                  className="flex-row items-center justify-between bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-sm"
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
                    className="p-2 bg-red-500/10 rounded-lg ml-2"
                  >
                    <Trash2 size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <TouchableOpacity
              onPress={handleUpdateExperience}
              disabled={isSaving}
              className={`w-full h-14 rounded-xl items-center justify-center ${
                isSaving ? "bg-gray-600" : "bg-green-600 active:bg-green-700"
              }`}
            >
              <Text className="text-white font-bold text-lg">
                {isSaving ? "Saving Changes..." : "Save Map"}
              </Text>
            </TouchableOpacity>
          </View>
        );
      }

      return (
        <View className="p-5 pb-12">
          <TouchableOpacity
            onPress={() => setSelectedExperience(null)}
            className="flex-row items-center mb-6 bg-gray-800 self-start px-4 py-2 rounded-full border border-gray-700"
          >
            <ArrowLeft size={16} color="white" />
            <Text className="text-white ml-2 font-medium">Back to My Maps</Text>
          </TouchableOpacity>

          <Text className="font-black text-3xl mb-8 text-white tracking-tight">
            {selectedExperience.title}
          </Text>

          <View className="mb-8 space-y-3">
            <TouchableOpacity
              onPress={() => onViewExperience(selectedExperience)}
              className="w-full h-14 bg-blue-600 rounded-xl flex-row items-center justify-center active:bg-blue-700 shadow-lg"
            >
              <MapPin size={20} color="white" className="mr-2" />
              <Text className="text-white font-bold text-base">
                View on Map
              </Text>
            </TouchableOpacity>
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setIsEditing(true)}
                className="flex-1 h-14 border border-gray-600 bg-gray-800 rounded-xl flex-row items-center justify-center active:bg-gray-700"
              >
                <Edit size={18} color="white" className="mr-2" />
                <Text className="text-white font-bold">Edit Map</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDeleteExperience(selectedExperience.id)}
                className="flex-1 h-14 border border-red-900 bg-red-900/20 rounded-xl flex-row items-center justify-center active:bg-red-900/40"
              >
                <Trash2 size={18} color="#fca5a5" className="mr-2" />
                <Text className="text-red-300 font-bold">Delete</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text className="font-bold text-gray-400 mt-2 border-b border-gray-800 pb-3 mb-6 tracking-wider uppercase text-xs">
            Map Locations
          </Text>
          {experienceStops.status === "loading" && (
            <ActivityIndicator color="#22d3ee" size="large" className="mt-4" />
          )}
          {experienceStops.status === "success" && (
            <View className="pl-1">
              {experienceStops.data.map((step, index) => (
                <View
                  key={step.id}
                  className="relative p-5 border-l-2 border-gray-600 mb-4 bg-gray-800/50 rounded-r-2xl"
                >
                  <View className="flex-row items-center gap-4 mb-2">
                    <View className="w-8 h-8 rounded-full items-center justify-center bg-gray-700 shadow-sm">
                      <Text className="font-bold text-gray-200">
                        {index + 1}
                      </Text>
                    </View>
                    <Text className="font-bold text-lg text-white flex-1">
                      {step.name}
                    </Text>
                  </View>
                  <Text
                    className="text-sm text-gray-400 pl-12 leading-5"
                    numberOfLines={3}
                  >
                    {step.description
                      ? step.description.replace(/<[^>]*>?/gm, "")
                      : "No description available."}
                  </Text>
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
            className="flex-row items-center mb-6 bg-gray-800 self-start px-4 py-2 rounded-full"
          >
            <ArrowLeft size={16} color="white" />
            <Text className="text-white ml-2 font-medium">Cancel</Text>
          </TouchableOpacity>

          <Text className="font-bold text-2xl mb-6 text-white">
            Create New Map
          </Text>
          <TextInput
            placeholder="Name your map..."
            placeholderTextColor="#9ca3af"
            value={newRouteName}
            onChangeText={setNewRouteName}
            className="bg-gray-800 border border-gray-700 text-white rounded-xl p-4 mb-6 font-medium text-base"
          />

          <View className="relative z-10 mb-6">
            <View className="flex-row items-center bg-gray-800 border border-gray-700 rounded-xl px-4 h-14 shadow-sm">
              <Search size={20} color="#9ca3af" />
              <TextInput
                placeholder="Search locations to add..."
                placeholderTextColor="#9ca3af"
                value={searchTerm}
                onChangeText={setSearchTerm}
                className="flex-1 text-white ml-3 text-base"
              />
            </View>
            {searchResults.length > 0 && (
              <View className="absolute top-16 left-0 right-0 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-50 p-2">
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
              </View>
            )}
          </View>

          <Text className="font-bold text-gray-300 mb-3 tracking-wider uppercase text-xs">
            SELECTED LOCATIONS ({stops.length})
          </Text>
          <View className="space-y-3 mb-8 min-h-[100px]">
            {stops.map((stop) => (
              <View
                key={stop.id}
                className="flex-row items-center justify-between bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-sm"
              >
                <Text className="font-medium text-white flex-1">
                  {stop.name}
                </Text>
                <TouchableOpacity
                  onPress={() => removeStop(stop.id)}
                  className="p-2 bg-gray-700 rounded-lg ml-2 active:bg-gray-600"
                >
                  <X size={18} color="#9ca3af" />
                </TouchableOpacity>
              </View>
            ))}
            {stops.length === 0 && (
              <Text className="text-sm text-gray-500 italic py-4 text-center border border-dashed border-gray-700 rounded-xl">
                Search above to start adding places to your map.
              </Text>
            )}
          </View>

          <TouchableOpacity
            onPress={handleSaveExperience}
            disabled={isSaving}
            className={`w-full h-14 rounded-xl items-center justify-center shadow-lg ${
              isSaving ? "bg-gray-600" : "bg-green-600 active:bg-green-700"
            }`}
          >
            <Text className="text-white font-bold text-lg">
              {isSaving ? "Creating Map..." : "Create Map"}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View className="p-5">
        <TouchableOpacity
          onPress={() => setExperiencesView("create")}
          className="w-full h-14 bg-green-600 rounded-xl flex-row items-center justify-center active:bg-green-700 mb-8 shadow-lg"
        >
          <PlusCircle size={20} color="white" className="mr-2" />
          <Text className="text-white font-bold text-lg">
            Create Custom Map
          </Text>
        </TouchableOpacity>

        <Text className="font-bold text-gray-400 mb-4 tracking-wider uppercase text-xs ml-1">
          Your Maps
        </Text>

        {loadingRoutes ? (
          <ActivityIndicator color="#22d3ee" size="large" className="mt-8" />
        ) : myRoutes.length > 0 ? (
          myRoutes.map((route) => (
            <TouchableOpacity
              key={route.id}
              onPress={() => setSelectedExperience(route)}
              className="w-full p-5 mb-4 bg-gray-800 border border-gray-700 rounded-2xl active:bg-gray-700 shadow-sm"
            >
              <Text className="font-bold text-xl text-white mb-1.5">
                {route.title}
              </Text>
              <Text className="text-sm text-cyan-400 font-medium">
                {route.user_map_pins?.length || 0} locations
              </Text>
            </TouchableOpacity>
          ))
        ) : (
          <View className="items-center justify-center p-8 bg-gray-800/50 rounded-2xl border border-gray-800 border-dashed mt-4">
            <MapPin size={32} color="#4b5563" className="mb-3" />
            <Text className="text-gray-400 text-center font-medium">
              You haven't created any maps yet.
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (!isOpen) return null;

  return (
    <View className="absolute top-0 left-0 w-full sm:w-[400px] h-full bg-gray-900 z-50 flex-col shadow-2xl border-r border-gray-800">
      <View className="flex-row justify-between items-center px-6 py-5 bg-black border-b border-gray-800 pt-14">
        <Text className="text-2xl font-black text-white tracking-tight">
          {activeQuest ? activeQuest.title : "Discover"}
        </Text>
        <TouchableOpacity
          onPress={onClose}
          className="p-2 bg-gray-800 rounded-full"
        >
          <X size={20} color="#9ca3af" />
        </TouchableOpacity>
      </View>

      <View className="flex-row border-b border-gray-800 bg-gray-900">
        <TouchableOpacity
          onPress={() => setMainTab("quests")}
          className={`flex-1 p-4 items-center ${
            mainTab === "quests"
              ? "border-b-2 border-cyan-400 bg-gray-800/50"
              : ""
          }`}
        >
          <Text
            className={
              mainTab === "quests"
                ? "text-cyan-400 font-bold"
                : "text-gray-500 font-bold"
            }
          >
            Curated Quests
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setMainTab("experiences")}
          className={`flex-1 p-4 items-center ${
            mainTab === "experiences"
              ? "border-b-2 border-cyan-400 bg-gray-800/50"
              : ""
          }`}
        >
          <Text
            className={
              mainTab === "experiences"
                ? "text-cyan-400 font-bold"
                : "text-gray-500 font-bold"
            }
          >
            My Maps
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 bg-gray-900"
        contentContainerStyle={{ paddingBottom: 60 }}
      >
        {mainTab === "quests" ? (
          <View className="p-5">
            {!activeQuest ? (
              <View>
                <View className="flex-row bg-black rounded-xl p-1 mb-6 border border-gray-800">
                  <TouchableOpacity
                    onPress={() => setQuestsActiveTab("by_city")}
                    className={`flex-1 py-2.5 rounded-lg flex-row justify-center items-center ${
                      questsActiveTab === "by_city" ? "bg-gray-800" : ""
                    }`}
                  >
                    <Text
                      className={
                        questsActiveTab === "by_city"
                          ? "text-cyan-400 font-bold"
                          : "text-gray-500 font-semibold"
                      }
                    >
                      Cities
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setQuestsActiveTab("multi_city")}
                    className={`flex-1 py-2.5 rounded-lg flex-row justify-center items-center ${
                      questsActiveTab === "multi_city" ? "bg-gray-800" : ""
                    }`}
                  >
                    <Text
                      className={
                        questsActiveTab === "multi_city"
                          ? "text-cyan-400 font-bold"
                          : "text-gray-500 font-semibold"
                      }
                    >
                      Multi
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setQuestsActiveTab("premium")}
                    className={`flex-1 py-2.5 rounded-lg flex-row justify-center items-center ${
                      questsActiveTab === "premium" ? "bg-gray-800" : ""
                    }`}
                  >
                    <Text
                      className={
                        questsActiveTab === "premium"
                          ? "text-cyan-400 font-bold"
                          : "text-gray-500 font-semibold"
                      }
                    >
                      Pro
                    </Text>
                  </TouchableOpacity>
                </View>

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
                          className="flex-row justify-between items-center p-5 bg-gray-800 rounded-2xl border border-gray-700 shadow-sm"
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
                  className="flex-row items-center mb-6 self-start bg-gray-800 px-4 py-2 rounded-full border border-gray-700"
                >
                  <ArrowLeft size={16} color="white" className="mr-2" />
                  <Text className="text-white font-medium">Back to Quests</Text>
                </TouchableOpacity>

                {/* 🌟 THE NEW QUEST STEPS RENDERER 🌟 */}
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
                            ? "bg-blue-900/30 border-blue-500"
                            : "bg-gray-800 border-gray-600"
                        }`}
                      >
                        <View className="flex-row items-center gap-4 mb-3 pr-14">
                          <View
                            className={`w-10 h-10 rounded-full items-center justify-center shadow-sm ${
                              isCurrent ? "bg-blue-500" : "bg-gray-700"
                            }`}
                          >
                            <Text className="font-bold text-white text-lg">
                              {index + 1}
                            </Text>
                          </View>
                          <Text className="font-bold text-lg text-white flex-1 leading-6">
                            {step.name}
                          </Text>
                        </View>
                        <Text
                          className="text-sm text-gray-300 pl-14 mb-2 leading-6"
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
                                ? "bg-green-500 border-green-400"
                                : "bg-gray-700 border-gray-600"
                            }`}
                          >
                            <View
                              className={`h-5 w-5 rounded-full bg-white shadow-sm ${
                                isExplored ? "self-end" : "self-start"
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
        ) : (
          renderMyExperiences()
        )}
      </ScrollView>
    </View>
  );
}
