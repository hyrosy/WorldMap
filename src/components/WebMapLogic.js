"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import ProductDetail from "@/components/ProductDetail";
import PinDetailsModal from "@/components/PinDetailsModal";
import QuickLocator from "@/components/QuickLocator";
import StoryModal from "@/components/StoryModal";
import FilterPanel from "@/components/FilterPanel";
import QuestPanel from "@/components/QuestPanel";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import ChatHub from "@/components/ChatHub";
import RadarMap from "@/components/RadarMap"; // 🌟 IMPORTS RADAR MAP
import {
  MapPin,
  Search,
  Route,
  BookOpen,
  Crosshair,
  ArrowLeft,
  X,
  Check,
  MessageSquare,
  Globe,
  ChevronDown,
  Radar,
  Users, // 🌟 ADDED USERS ICON
} from "lucide-react";
import StoryArchivePanel from "@/components/StoryArchivePanel";
import WelcomeOverlay from "@/components/WelcomeOverlay";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { useRouter, useLocalSearchParams } from "expo-router";

import { usePwaInstall } from "@/hooks/usePwaInstall";
import useMapData from "@/hooks/useMapData";
import useQuests from "@/hooks/useQuests";
import usePinProducts from "@/hooks/usePinProducts";
import useMapInteraction from "@/hooks/useMapInteraction";

const Map = React.lazy(() => import("@/components/Map"));

const CITY_DATA = {
  marrakech: {
    name: "Marrakech",
    center: [-7.98, 31.63],
    storyUrl: "/videos/marrakech_story.mp4",
  },
  casablanca: {
    name: "Casablanca",
    center: [-7.59, 33.57],
    storyUrl: "/videos/casablanca_story.mp4",
  },
  rabat: {
    name: "Rabat",
    center: [-6.84, 34.02],
    storyUrl: "/videos/rabat_story.mp4",
  },
};

// 🌟 MATH FUNCTION TO CALCULATE DISTANCE 🌟
function getDistanceInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dp / 2) * Math.sin(dp / 2) +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export default function WebMapLogic() {
  const router = useRouter();
  const { city: initialCityId } = useLocalSearchParams();
  const { session } = useAuth();

  const [selectedCity, setSelectedCity] = useState(
    initialCityId && CITY_DATA[initialCityId]
      ? CITY_DATA[initialCityId]
      : CITY_DATA["marrakech"]
  );

  const [viewingExperience, setViewingExperience] = useState(null);
  const { showIosInstallPopup, handleInstallClick, closeIosInstallPopup } =
    usePwaInstall();

  const categoryIconMap = {
    Activities: "1.png",
    Experiences: "1.png",
    Restaurants: "1.png",
    "Food & Cooking": "1.png",
    Monuments: "1.png",
    "Books & Guides": "1.png",
    Shops: "1.png",
    "Fashion & Accessories": "shopping.png",
    "Home Decor": "pottery-class.png",
    Hotels: "building.png",
    "Home & Lifestyle": "artisan-class.png",
    Transport: "quad-bike.png",
    Health: "1.png",
    Nature: "camel-ride.png",
    Services: "workshops.png",
    Nightlife: "food.png",
    Wellness: "a-craftsman.png",
  };

  const [isFilterPanelOpen, setFilterPanelOpen] = useState(false);
  const [selectedPin, setSelectedPin] = useState(null);
  const [isLocatorOpen, setLocatorOpen] = useState(false);
  const [dynamicPins, setDynamicPins] = useState([]);

  // --- STATES ---
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isRadarOpen, setIsRadarOpen] = useState(false);
  const [isVisitorListOpen, setVisitorListOpen] = useState(false); // 🌟 NEW STATE

  const [currentWorld, setCurrentWorld] = useState({
    id: "base",
    name: "Base World",
  });
  const [worldTransition, setWorldTransition] = useState({
    isTransitioning: false,
    hostName: "",
  });

  const [isStoryModalOpen, setStoryModalOpen] = useState(false);
  const [storyContentUrl, setStoryContentUrl] = useState("");
  const [viewedCities, setViewedCities] = useState(new Set());
  const mapRef = useRef(null);
  const { addToCart } = useCart();

  // MULTIPLAYER STATES (GTA LOBBY & RADAR)
  const [activePartyMembers, setActivePartyMembers] = useState([]);
  const [partyLocations, setPartyLocations] = useState({});
  const multiplayerChannelRef = useRef(null);

  const [isCreatePinModalOpen, setCreatePinModalOpen] = useState(false);
  const [isSubmittingPin, setIsSubmittingPin] = useState(false);
  const [isCreatingNewList, setIsCreatingNewList] = useState(false);
  const [newPinData, setNewPinData] = useState({
    lat: null,
    lng: null,
    name: "",
    category: "Favorites",
    description: "",
    image_url: "",
  });

  const handleMapClick = (lng, lat) => {
    if (session?.user) {
      setNewPinData((prev) => ({ ...prev, lat, lng }));
      setCreatePinModalOpen(true);
      setIsCreatingNewList(false);
    } else {
      toast.info("Sign in to drop personal pins!");
    }
  };

  const handleCreatePin = async () => {
    if (!newPinData.name) {
      toast.error("Please name your location!");
      return;
    }
    if (!newPinData.category) {
      toast.error("Please provide a list name!");
      return;
    }

    setIsSubmittingPin(true);
    let targetTable = "personal_pins";
    let insertPayload = { ...newPinData, user_id: session.user.id };

    if (currentWorld.id !== "base") {
      targetTable = "world_pins";
      insertPayload = {
        ...newPinData,
        world_id: currentWorld.id,
        added_by: session.user.id,
      };
      delete insertPayload.user_id;
    }

    const { error } = await supabase.from(targetTable).insert([insertPayload]);
    setIsSubmittingPin(false);

    if (error) {
      toast.error("Failed to save location");
    } else {
      toast.success("Location secured!");
      setCreatePinModalOpen(false);
      setIsCreatingNewList(false);

      if (currentWorld.id === "base") {
        setDynamicPins((prev) => [...prev, insertPayload]);
      }
      setNewPinData({
        lat: null,
        lng: null,
        name: "",
        category: "Favorites",
        description: "",
        image_url: "",
      });
    }
  };

  const handleDrawRoute = async (route) => {
    if (!route || !route.user_map_pins || route.user_map_pins.length === 0) {
      setViewingExperience(null);
      return;
    }
    setQuestPanelOpen(false);
    const loadingToastId = toast.loading("Charting route...");

    try {
      const locationIds = route.user_map_pins.map((p) => p.location_id);
      const { data: locations, error } = await supabase
        .from("locations")
        .select("*")
        .in("id", locationIds);
      if (error) throw error;

      const orderedPins = route.user_map_pins
        .sort((a, b) => a.order_index - b.order_index)
        .map((pinRecord) =>
          locations.find((loc) => loc.id === pinRecord.location_id)
        )
        .filter(Boolean);

      setViewingExperience(orderedPins);
      toast.dismiss(loadingToastId);
    } catch (error) {
      toast.dismiss(loadingToastId);
      toast.error("Failed to load route.");
    }
  };

  const handleEnterWorld = async (world) => {
    if (!world) {
      setCurrentWorld({ id: "base", name: "Base World" });
      return;
    }
    setQuestPanelOpen(false);
    setWorldTransition({ isTransitioning: true, hostName: world.name });

    try {
      setViewingExperience(null);
      setTimeout(() => {
        setCurrentWorld({ id: world.id, name: world.name });
        setWorldTransition({ isTransitioning: false, hostName: "" });
        toast.success(`Entered ${world.name}`);
      }, 2500);
    } catch (error) {
      setWorldTransition({ isTransitioning: false, hostName: "" });
      toast.error("Failed to load World");
    }
  };

  const {
    isLoading,
    allPins,
    displayedPins,
    filterData,
    handleFilter,
    handleReset,
  } = useMapData(selectedCity);
  const {
    quests,
    activeQuest,
    questStepIndex,
    exploredSteps,
    handleQuestSelect,
    handleQuestStepSelect,
    handleToggleStepExplored,
  } = useQuests(mapRef, setSelectedPin);
  const modalProducts = usePinProducts(selectedPin);

  const {
    handleGoToUserLocation,
    handleGetDirections,
    userLocation,
    directionsRoute,
  } = useMapInteraction(mapRef);

  const [isQuestPanelOpen, setQuestPanelOpen] = useState(false);
  const [isStoryArchiveOpen, setStoryArchiveOpen] = useState(false);
  const [initialStoryId, setInitialStoryId] = useState(null);
  const [isAppReady, setAppReady] = useState(false);
  const [isMapLoaded, setMapLoaded] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  // 🌟 RADAR: WALKED PATH LOGIC 🌟
  const [walkedPath, setWalkedPath] = useState([]);
  useEffect(() => {
    if (!userLocation) return;
    setWalkedPath((prev) => {
      const last = prev[prev.length - 1];
      if (last && last[0] === userLocation[0] && last[1] === userLocation[1])
        return prev;
      return [...prev, userLocation];
    });
  }, [userLocation]);

  useEffect(() => {
    if (!session?.user) return;

    const fetchDynamicPins = async () => {
      if (currentWorld.id === "base") {
        const { data } = await supabase
          .from("personal_pins")
          .select("*")
          .eq("user_id", session.user.id);
        if (data) setDynamicPins(data);
      } else {
        const { data } = await supabase
          .from("world_pins")
          .select("*")
          .eq("world_id", currentWorld.id);
        if (data) setDynamicPins(data);
      }
    };
    fetchDynamicPins();

    if (currentWorld.id !== "base") {
      const channel = supabase
        .channel(`world_${currentWorld.id}_pins`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "world_pins",
            filter: `world_id=eq.${currentWorld.id}`,
          },
          (payload) => {
            setDynamicPins((prev) => [...prev, payload.new]);
            toast.success("A party member dropped a new pin!");
          }
        )
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentWorld.id, session]);

  useEffect(() => {
    if (currentWorld.id === "base" || !session?.user) {
      setActivePartyMembers([]);
      setPartyLocations({});
      return;
    }

    const channel = supabase.channel(`world_${currentWorld.id}_radar`, {
      config: { presence: { key: session.user.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const members = [];
        for (const id in state) {
          members.push(state[id][0]);
        }
        setActivePartyMembers(members);
      })
      .on("presence", { event: "join" }, ({ newPresences }) => {
        toast.success(
          `${newPresences[0]?.username || "A traveler"} joined the map!`
        );
      })
      .on("presence", { event: "leave" }, ({ leftPresences }) => {
        toast.info(`${leftPresences[0]?.username || "A traveler"} left.`);
        setPartyLocations((prev) => {
          const next = { ...prev };
          delete next[leftPresences[0]?.userId];
          return next;
        });
      })
      .on("broadcast", { event: "location_ping" }, ({ payload }) => {
        if (payload.userId !== session.user.id) {
          setPartyLocations((prev) => ({ ...prev, [payload.userId]: payload }));
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            userId: session.user.id,
            username:
              session.user.user_metadata?.username ||
              session.user.email?.split("@")[0] ||
              "Traveler",
            avatar_url:
              session.user.user_metadata?.avatar_url ||
              "https://placehold.co/100/1c1d28/d3bc8e?text=?",
          });
        }
      });

    multiplayerChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      multiplayerChannelRef.current = null;
    };
  }, [currentWorld.id, session]);

  useEffect(() => {
    if (
      currentWorld.id !== "base" &&
      userLocation &&
      multiplayerChannelRef.current
    ) {
      multiplayerChannelRef.current.send({
        type: "broadcast",
        event: "location_ping",
        payload: {
          userId: session?.user?.id,
          username:
            session?.user?.user_metadata?.username ||
            session?.user?.email?.split("@")[0] ||
            "Traveler",
          avatar_url:
            session?.user?.user_metadata?.avatar_url ||
            "https://placehold.co/100/1c1d28/d3bc8e?text=?",
          lng: userLocation[0],
          lat: userLocation[1],
        },
      });
    }
  }, [userLocation, currentWorld.id, session]);

  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      const lowercased = searchQuery.toLowerCase();
      const results = allPins.filter(
        (pin) =>
          pin.name?.toLowerCase().includes(lowercased) ||
          pin.category?.toLowerCase().includes(lowercased) ||
          pin.description?.toLowerCase().includes(lowercased)
      );
      setSearchResults(results.slice(0, 5));
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, allPins]);

  const handleMapSearchSelect = (pin) => {
    setSearchQuery("");
    setSearchResults([]);
    if (mapRef.current && pin.lat && pin.lng) {
      mapRef.current.flyTo({
        center: [pin.lng, pin.lat],
        zoom: 16,
        pitch: 60,
        essential: true,
      });
      setTimeout(() => setSelectedPin(pin), 500);
    }
  };

  useEffect(() => {
    const readyTimer = setTimeout(() => setAppReady(true), 4000);
    return () => clearTimeout(readyTimer);
  }, []);

  useEffect(() => {
    if (!isAppReady || !mapRef.current) return;
    if (selectedCity) {
      mapRef.current.flyTo({
        center: selectedCity.center,
        zoom: 12,
        pitch: 75,
        essential: true,
      });
    } else {
      handleResetView();
    }
  }, [isAppReady, selectedCity]);

  const handleReadStory = (storyId) => {
    setInitialStoryId(storyId);
    setStoryArchiveOpen(true);
    setSelectedPin(null);
  };
  const handleCitySelect = (cityKey) => setSelectedCity(CITY_DATA[cityKey]);

  useEffect(() => {
    if (
      isAppReady &&
      selectedCity &&
      !viewedCities.has(selectedCity.name.toLowerCase())
    ) {
      setStoryContentUrl(selectedCity.storyUrl);
      setStoryModalOpen(true);
      setViewedCities((prev) =>
        new Set(prev).add(selectedCity.name.toLowerCase())
      );
    }
  }, [isAppReady, selectedCity, viewedCities]);

  const handleResetView = () => {
    if (mapRef.current && isMapLoaded)
      mapRef.current.flyTo({ center: [-5.5, 32], zoom: 15.5, essential: true });
    setSelectedCity(null);
  };

  const handleFilterSelect = (pin) => {
    if (mapRef.current && pin.lat && pin.lng) {
      mapRef.current.flyTo({
        center: [pin.lng, pin.lat],
        zoom: 15,
        essential: true,
      });
      setTimeout(() => setSelectedPin(pin), 500);
    }
    setFilterPanelOpen(false);
  };

  const existingLists = Array.from(
    new Set([
      "Favorites",
      "Want to Go",
      ...Object.keys(categoryIconMap),
      ...(dynamicPins || []).map((p) => p.category).filter(Boolean),
    ])
  );

  // 🌟 AVATAR BUNDLING LOGIC 🌟
  const visibleUsers = activePartyMembers.filter(
    (m) => m.userId !== session?.user?.id
  );
  const maxVisibleAvatars = 3;
  const extraUsersCount = visibleUsers.length - maxVisibleAvatars;

  return (
    <div className="absolute inset-0 w-full h-full bg-[#1c1d28] overflow-hidden">
      {!isAppReady && <WelcomeOverlay />}

      <Suspense fallback={null}>
        <Map
          mapRef={mapRef}
          displayedPins={[...displayedPins, ...dynamicPins]}
          onPinClick={setSelectedPin}
          selectedCity={selectedCity}
          categoryIconMap={categoryIconMap}
          onLoad={(mapInstance) => {
            mapRef.current = mapInstance;
            setMapLoaded(true);
          }}
          experienceRoute={viewingExperience}
          userLocation={userLocation}
          directionsRoute={directionsRoute}
          onMapClick={handleMapClick}
          partyLocations={Object.values(partyLocations)}
        />
      </Suspense>

      {worldTransition.isTransitioning && (
        <div className="absolute inset-0 z-[99999] bg-[#1c1d28] flex flex-col items-center justify-center pointer-events-auto animate-in fade-in duration-500">
          <div className="relative flex items-center justify-center mb-8">
            <div className="absolute w-32 h-32 border-2 border-dashed border-[#3b3e52] rounded-full animate-[spin_4s_linear_infinite]" />
            <div className="absolute w-24 h-24 border-2 border-[#d3bc8e]/50 rounded-full animate-[spin_3s_linear_infinite_reverse]" />
            <div className="w-16 h-16 bg-[#e6ce9a] rounded-full shadow-[0_0_40px_rgba(230,206,154,0.6)] animate-pulse flex items-center justify-center">
              <Globe size={28} color="#1c1d28" />
            </div>
          </div>
          <p className="text-[#d3bc8e] font-black text-xl tracking-[0.15em] uppercase mb-3">
            Syncing World Data
          </p>
          <p className="text-gray-400 font-medium tracking-wide text-sm">
            Entering {worldTransition.hostName}...
          </p>
          <div className="w-48 h-1 bg-[#2e3142] rounded-full mt-8 overflow-hidden">
            <div className="h-full bg-[#d3bc8e] w-full origin-left scale-x-0 animate-[scale-x_2s_ease-out_forwards]" />
          </div>
        </div>
      )}

      {/* 🌟 THE GTA RADAR OVERLAY 🌟 */}
      {isRadarOpen && (
        <div className="absolute inset-0 z-[99999] bg-black pointer-events-auto animate-in fade-in zoom-in-95 duration-200">
          <RadarMap
            userLocation={userLocation}
            walkedPath={walkedPath}
            partyLocations={Object.values(partyLocations)}
          />

          <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center pointer-events-none">
            <div className="bg-[#1c1d28]/90 backdrop-blur-md border border-[#3b3e52] px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl pointer-events-auto">
              <Radar className="text-[#d3bc8e] h-6 w-6 animate-[spin_3s_linear_infinite]" />
              <span className="text-xl font-black text-white tracking-widest uppercase">
                Radar
              </span>
            </div>
            <button
              onClick={() => setIsRadarOpen(false)}
              className="p-3 bg-[#2e3142]/90 backdrop-blur-md rounded-full border border-[#3b3e52] hover:bg-[#3b3e52] transition-colors pointer-events-auto shadow-2xl"
            >
              <X size={24} className="text-[#d3bc8e]" />
            </button>
          </div>

          <div className="absolute bottom-10 left-6 bg-[#1c1d28]/90 backdrop-blur-md border border-[#3b3e52] p-4 rounded-2xl pointer-events-none shadow-2xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-3 h-3 bg-white rounded-full border border-black shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
              <span className="text-white font-bold text-xs">You</span>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full border border-black shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
              <span className="text-white font-bold text-xs">Party Member</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-black rounded-full border border-gray-600 opacity-80" />
              <span className="text-gray-400 font-bold text-xs">
                Unexplored Area
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="absolute top-0 left-0 w-full h-full z-10 pointer-events-none">
        {isLoading && isAppReady && (
          <div className="absolute inset-0 bg-[#1c1d28]/95 z-50 flex flex-col p-6 pointer-events-auto">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
              <div className="w-12 h-12 rounded-full border-4 border-[#d3bc8e] border-t-transparent animate-spin mb-4" />
              <span className="text-[#d3bc8e] font-bold tracking-widest uppercase text-xs">
                Loading Map...
              </span>
            </div>
          </div>
        )}

        {showIosInstallPopup && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-[#2e3142] border border-[#d3bc8e]/50 p-4 rounded-xl shadow-2xl pointer-events-auto z-50 text-center max-w-sm w-[90%]">
            <p className="text-gray-300 font-medium text-sm mb-3">
              To install, tap the Share icon and then 'Add to Home Screen'.
            </p>
            <button
              onClick={closeIosInstallPopup}
              className="bg-[#e6ce9a] px-6 py-2 rounded-full font-bold text-[#1c1d28]"
            >
              Close
            </button>
          </div>
        )}

        {isAppReady && (
          <>
            <div className="absolute top-4 left-4 pointer-events-auto flex items-center gap-3">
              <Button
                variant="secondary"
                className="bg-[#1c1d28]/80 backdrop-blur-md border border-[#3b3e52] shadow-xl hover:bg-[#2e3142] rounded-full h-12 w-12 p-0 flex items-center justify-center transition-all"
                onClick={() => router.push("/")}
              >
                <ArrowLeft className="h-6 w-6 text-[#d3bc8e]" />
              </Button>
              <button
                onClick={() => setQuestPanelOpen(true)}
                className="bg-[#1c1d28]/90 backdrop-blur-md border border-[#d3bc8e]/50 px-4 h-12 rounded-full flex items-center shadow-xl hover:bg-[#2e3142] transition-colors"
              >
                <Globe size={18} className="text-[#d3bc8e] mr-2" />
                <span className="text-white font-bold text-sm tracking-wide max-w-[120px] truncate">
                  {currentWorld.name}
                </span>
                <ChevronDown size={16} className="text-gray-400 ml-2" />
              </button>
            </div>

            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-full max-w-xs sm:max-w-md px-4 pointer-events-auto z-50 hidden sm:block">
              <div className="bg-[#1c1d28]/90 backdrop-blur-md border border-[#3b3e52] rounded-full flex items-center px-4 h-12 shadow-2xl transition-all focus-within:bg-[#2e3142] focus-within:border-[#d3bc8e]">
                <Search size={18} className="text-[#d3bc8e]" />
                <input
                  type="text"
                  placeholder={`Search ${selectedCity?.name || "locations"}...`}
                  className="bg-transparent text-white flex-1 ml-3 outline-none text-sm placeholder-gray-500 font-medium"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery.length > 0 && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="p-1 hover:bg-[#3b3e52] rounded-full transition-colors"
                  >
                    <X size={16} className="text-[#d3bc8e]" />
                  </button>
                )}
              </div>
              {searchResults.length > 0 && (
                <div className="mt-2 bg-[#2e3142]/95 backdrop-blur-md border border-[#3b3e52] rounded-2xl overflow-hidden shadow-2xl">
                  {searchResults.map((pin) => (
                    <button
                      key={pin.id}
                      onClick={() => handleMapSearchSelect(pin)}
                      className="w-full text-left p-4 border-b border-[#3b3e52] flex items-center hover:bg-[#3b3e52] transition-colors"
                    >
                      <div className="bg-[#1c1d28] border border-[#d3bc8e]/50 p-2 rounded-full mr-4">
                        <MapPin size={16} className="text-[#d3bc8e]" />
                      </div>
                      <div>
                        <p className="text-white font-bold text-sm leading-tight">
                          {pin.name}
                        </p>
                        <p className="text-[#d3bc8e] text-[10px] font-bold uppercase tracking-wider mt-1">
                          {pin.category}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* CLICKABLE GTA MINIMAP */}
            <div
              onClick={() => setIsRadarOpen(true)}
              className="absolute top-4 right-4 w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-[#3b3e52] bg-[#1c1d28]/80 backdrop-blur-md shadow-2xl overflow-hidden pointer-events-auto flex items-center justify-center cursor-pointer hover:border-[#d3bc8e] transition-colors group"
            >
              <div
                className="absolute inset-0 opacity-30 group-hover:opacity-40 transition-opacity"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at center, transparent 20%, #000 100%), repeating-linear-gradient(0deg, transparent, transparent 10px, rgba(211,188,142,0.15) 10px, rgba(211,188,142,0.15) 11px), repeating-linear-gradient(90deg, transparent, transparent 10px, rgba(211,188,142,0.15) 10px, rgba(211,188,142,0.15) 11px)",
                }}
              ></div>
              <div className="w-2.5 h-2.5 bg-[#e6ce9a] rounded-full shadow-[0_0_10px_3px_rgba(230,206,154,0.8)] z-10 group-hover:scale-125 transition-transform"></div>
              <div className="absolute top-1/2 left-1/2 w-0 h-0 border-l-[20px] border-r-[20px] border-b-[35px] border-l-transparent border-r-transparent border-b-[#e6ce9a]/20 -translate-x-1/2 -translate-y-full origin-bottom"></div>
              <div className="absolute bottom-3 bg-[#1c1d28]/95 px-2 py-0.5 rounded border border-[#3b3e52] text-[9px] font-black text-[#d3bc8e] uppercase tracking-widest max-w-[80%] truncate">
                {currentWorld.id === "base"
                  ? selectedCity?.name || "BASE WORLD"
                  : currentWorld.name}
              </div>
            </div>

            {/* 🌟 NEW: THE AVATAR BUNDLE UNDER THE MINIMAP 🌟 */}
            {visibleUsers.length > 0 && (
              <div className="absolute top-36 sm:top-40 right-4 sm:right-6 pointer-events-auto">
                <div
                  onClick={() => setVisitorListOpen(true)}
                  className="flex flex-row items-center justify-end cursor-pointer hover:scale-105 transition-transform active:scale-95"
                  title="View Party Members"
                >
                  {visibleUsers
                    .slice(0, maxVisibleAvatars)
                    .map((member, idx) => (
                      <div
                        key={member.userId}
                        className={`w-10 h-10 rounded-full border-2 border-[#1c1d28] bg-[#2e3142] overflow-hidden shadow-lg ${
                          idx > 0 ? "-ml-4" : ""
                        }`}
                        style={{ zIndex: 10 - idx }}
                      >
                        <img
                          src={member.avatar_url}
                          alt={member.username}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  {extraUsersCount > 0 && (
                    <div
                      className="w-10 h-10 rounded-full border-2 border-[#1c1d28] bg-[#d3bc8e] text-[#1c1d28] flex items-center justify-center font-black text-sm shadow-lg -ml-4"
                      style={{ zIndex: 0 }}
                    >
                      +{extraUsersCount}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 🌟 NEW: THE VISITOR LIST POPUP MENU 🌟 */}
            {isVisitorListOpen && (
              <div className="absolute top-[190px] sm:top-[210px] right-4 sm:right-6 w-64 bg-[#2e3142]/95 backdrop-blur-md border border-[#3b3e52] rounded-2xl shadow-2xl p-4 pointer-events-auto animate-in fade-in slide-in-from-top-2 z-50">
                <div className="flex justify-between items-center mb-3 border-b border-[#3b3e52] pb-2">
                  <h3 className="text-[#d3bc8e] font-bold text-xs tracking-widest uppercase flex items-center gap-2">
                    <Users size={14} />
                    {currentWorld.id === "base"
                      ? "Shared Locations"
                      : "World Party"}
                  </h3>
                  <button onClick={() => setVisitorListOpen(false)}>
                    <X size={16} className="text-gray-400 hover:text-white" />
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-3 pt-1">
                  {visibleUsers.map((member) => (
                    <div
                      key={member.userId}
                      className="flex items-center gap-3"
                    >
                      <img
                        src={member.avatar_url}
                        className="w-8 h-8 rounded-full border border-[#d3bc8e]"
                        alt={member.username}
                      />
                      <span className="text-white font-medium text-sm truncate">
                        {member.username}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Moved Tools down slightly to make room for avatars */}
            <div className="absolute top-[200px] sm:top-[220px] right-4 pointer-events-auto flex flex-col gap-3">
              <button
                onClick={() => setIsChatOpen(true)}
                className="bg-[#2e3142]/90 border border-[#3b3e52] backdrop-blur-md rounded-full h-12 w-12 flex items-center justify-center shadow-lg hover:bg-[#3b3e52] transition-all active:scale-95 relative"
                title="Messages"
              >
                <MessageSquare className="h-5 w-5 text-[#d3bc8e]" />
                <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#2e3142]" />
              </button>
              <button
                onClick={handleGoToUserLocation}
                className="bg-[#2e3142]/90 border border-[#3b3e52] backdrop-blur-md rounded-full h-12 w-12 flex items-center justify-center shadow-lg hover:bg-[#3b3e52] transition-all active:scale-95"
                title="My Location"
              >
                <Crosshair className="h-5 w-5 text-[#d3bc8e]" />
              </button>
            </div>

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 pointer-events-auto flex items-center justify-center gap-2">
              <Button
                size="icon"
                variant="secondary"
                className="h-14 w-14 rounded-full shadow-lg bg-[#2e3142] border border-[#3b3e52] text-[#d3bc8e] hover:bg-[#3b3e52] flex-shrink-0 transition-colors"
                onClick={() => setLocatorOpen(true)}
                title="Quick Locator"
              >
                <MapPin className="h-6 w-6" />
              </Button>
              <Button
                size="lg"
                className="flex-1 shadow-[0_0_20px_rgba(230,206,154,0.3)] rounded-full h-14 text-base font-black bg-[#e6ce9a] text-[#1c1d28] hover:bg-[#d3bc8e] transition-colors"
                onClick={() => setFilterPanelOpen(true)}
              >
                <Search className="h-5 w-5 mr-2" /> Explore
              </Button>
              <Button
                size="icon"
                className="h-14 w-14 rounded-full shadow-lg bg-[#2e3142] border border-[#3b3e52] text-[#d3bc8e] hover:bg-[#3b3e52] flex-shrink-0 transition-colors"
                onClick={() => setQuestPanelOpen(true)}
              >
                <Route className="h-6 w-6" />
              </Button>
              <Button
                size="icon"
                className="h-14 w-14 rounded-full shadow-lg bg-[#2e3142] border border-[#3b3e52] text-[#d3bc8e] hover:bg-[#3b3e52] flex-shrink-0 transition-colors"
                onClick={() => setStoryArchiveOpen(true)}
                title="Story Archive"
              >
                <BookOpen className="h-6 w-6" />
              </Button>
            </div>
          </>
        )}
      </div>

      {isLocatorOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setLocatorOpen(false)}
          />
          <QuickLocator
            isOpen={isLocatorOpen}
            onClose={() => setLocatorOpen(false)}
            cities={CITY_DATA}
            onCitySelect={(cityKey) => {
              handleCitySelect(cityKey);
              setLocatorOpen(false);
              setTimeout(() => setLocatorOpen(false), 100);
            }}
            onResetView={() => {
              handleResetView();
              setLocatorOpen(false);
              setTimeout(() => setLocatorOpen(false), 100);
            }}
          />
        </>
      )}

      <ChatHub
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        userLocation={userLocation}
        mapRef={mapRef}
        // 🌟 ADD THIS NEW PROP:
        currentWorld={currentWorld}
      />

      <QuestPanel
        onToggleStepExplored={handleToggleStepExplored}
        exploredSteps={exploredSteps}
        isOpen={isQuestPanelOpen}
        onClose={() => setQuestPanelOpen(false)}
        quests={quests}
        activeQuest={activeQuest}
        onQuestSelect={handleQuestSelect}
        currentStepIndex={questStepIndex}
        onStepSelect={handleQuestStepSelect}
        selectedCity={selectedCity}
        allPins={allPins}
        onViewExperience={handleDrawRoute}
        onEnterWorld={handleEnterWorld}
        dynamicPins={dynamicPins}
        currentWorld={currentWorld}
      />

      <StoryArchivePanel
        isOpen={isStoryArchiveOpen}
        onClose={() => setStoryArchiveOpen(false)}
        initialStoryId={initialStoryId}
      />
      <FilterPanel
        isOpen={isFilterPanelOpen}
        onClose={() => setFilterPanelOpen(false)}
        filterData={filterData}
        onFilter={handleFilter}
        onReset={handleReset}
        allPins={allPins}
        onSearchResultSelect={handleFilterSelect}
      />
      <PinDetailsModal
        pin={selectedPin}
        isOpen={!!selectedPin}
        onClose={() => setSelectedPin(null)}
        onAddToCart={addToCart}
        onReadStory={handleReadStory}
        onGetDirections={(pin) =>
          handleGetDirections(pin, () => setSelectedPin(null))
        }
        products={modalProducts.data}
        productsStatus={modalProducts.status}
      />

      {isCreatePinModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md pointer-events-auto p-4 transition-all">
          <div className="bg-[#2e3142] border border-[#3b3e52] rounded-3xl p-6 w-full max-w-md shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#e6ce9a] to-[#d3bc8e]"></div>
            <div className="flex justify-between items-center mb-6 mt-2">
              <div>
                <h2 className="text-2xl font-black text-white flex items-center gap-2">
                  <MapPin className="text-[#d3bc8e] h-6 w-6" /> Drop Location
                </h2>
                <p className="text-gray-400 text-xs font-mono mt-1">
                  {newPinData.lat?.toFixed(5)}°, {newPinData.lng?.toFixed(5)}°
                </p>
              </div>
              <button
                onClick={() => setCreatePinModalOpen(false)}
                className="p-2 bg-[#1c1d28] rounded-full hover:bg-[#3b3e52] text-gray-400 hover:text-white transition-colors border border-[#3b3e52]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 mb-8">
              <div>
                <label className="text-[#d3bc8e] text-xs font-bold uppercase tracking-wider mb-2 block">
                  Location Name
                </label>
                <input
                  className="w-full bg-[#1c1d28] text-white px-4 py-4 rounded-xl border border-[#3b3e52] focus:border-[#d3bc8e] outline-none"
                  placeholder="e.g., Secret Rooftop Cafe"
                  value={newPinData.name}
                  onChange={(e) =>
                    setNewPinData({ ...newPinData, name: e.target.value })
                  }
                />
              </div>

              <div>
                <div className="flex justify-between items-end mb-2">
                  <label className="text-[#d3bc8e] text-xs font-bold uppercase tracking-wider block">
                    List / Category
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingNewList(!isCreatingNewList);
                      if (!isCreatingNewList)
                        setNewPinData({ ...newPinData, category: "" });
                      else
                        setNewPinData({ ...newPinData, category: "Favorites" });
                    }}
                    className="text-[#d3bc8e] text-[10px] font-bold uppercase tracking-wider hover:text-white transition-colors bg-[#1c1d28] px-2 py-1 rounded-md border border-[#3b3e52]"
                  >
                    {isCreatingNewList ? "Choose Existing" : "+ New List"}
                  </button>
                </div>

                {isCreatingNewList ? (
                  <input
                    className="w-full bg-[#1c1d28] text-white px-4 py-4 rounded-xl border border-[#3b3e52] focus:border-[#d3bc8e] outline-none"
                    placeholder="e.g., Hidden Gems"
                    value={newPinData.category}
                    onChange={(e) =>
                      setNewPinData({ ...newPinData, category: e.target.value })
                    }
                  />
                ) : (
                  <select
                    className="w-full bg-[#1c1d28] text-white px-4 py-4 rounded-xl border border-[#3b3e52] focus:border-[#d3bc8e] outline-none appearance-none"
                    value={newPinData.category}
                    onChange={(e) =>
                      setNewPinData({ ...newPinData, category: e.target.value })
                    }
                  >
                    {existingLists.map((listName) => (
                      <option
                        key={listName}
                        value={listName}
                        className="bg-[#1c1d28]"
                      >
                        {listName}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="text-[#d3bc8e] text-xs font-bold uppercase tracking-wider mb-2 block">
                  Image URL
                </label>
                <input
                  className="w-full bg-[#1c1d28] text-white px-4 py-4 rounded-xl border border-[#3b3e52] focus:border-[#d3bc8e] outline-none"
                  placeholder="https://example.com/image.jpg"
                  value={newPinData.image_url}
                  onChange={(e) =>
                    setNewPinData({ ...newPinData, image_url: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-[#d3bc8e] text-xs font-bold uppercase tracking-wider mb-2 block">
                  Description / Notes
                </label>
                <textarea
                  className="w-full bg-[#1c1d28] text-white px-4 py-4 rounded-xl border border-[#3b3e52] focus:border-[#d3bc8e] outline-none h-24 resize-none"
                  placeholder="What makes this place special?"
                  value={newPinData.description}
                  onChange={(e) =>
                    setNewPinData({
                      ...newPinData,
                      description: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <button
              className="w-full bg-[#e6ce9a] text-[#1c1d28] py-4 rounded-xl font-bold active:bg-[#d3bc8e] flex justify-center items-center gap-2 shadow-[0_0_20px_rgba(230,206,154,0.3)]"
              onClick={handleCreatePin}
              disabled={isSubmittingPin}
            >
              {isSubmittingPin ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#1c1d28]"></div>
              ) : (
                <>
                  <Check className="h-5 w-5" /> Save Location
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
