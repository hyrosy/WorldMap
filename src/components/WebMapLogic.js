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
import AuthModal from "@/components/AuthModal";
import ProfilePanel from "@/components/ProfilePanel";
import CreatePinModal from "@/components/CreatePinModal"; // 🌟 NEW
import GuildMerchantPanel from "@/components/GuildMerchantPanel"; // 🌟 NEW
import TravelerBackpack from "@/components/TravelerBackpack"; // 🌟 NEW
import { Audio } from "expo-av";
import * as turf from "@turf/turf";
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
  User, // 🌟 ADDED FOR AVATAR
  Users, // 🌟 ADDED USERS ICON
  Car, // 🌟 ADD THIS
  Footprints, // 🌟 ADD THIS (For walking)
  Bike, // 🌟 ADD THIS
  Navigation, // 🌟 ADD THIS
  ShoppingBag, // 🌟 ADD THIS
  MapPinPlus, // 🌟 ADD THIS ICON
  Backpack,
} from "lucide-react-native";
// 🌟 ADD THESE IMPORTS 🌟
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Image,
  SafeAreaView,
  Platform,
  ScrollView,
  ActivityIndicator, // 🌟 ADD THIS RIGHT HERE
} from "react-native";
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
  // 🌟 NEW GENSHIN-STYLE OVERLAY STATES 🌟
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [isMerchantOpen, setIsMerchantOpen] = useState(false);

  // Helper to trigger Auth if not logged in
  const requireAuth = (action) => {
    if (session?.user) {
      action();
    } else {
      setAuthModalOpen(true);
    }
  };

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
  const { addToCart, cart, cartItems } = useCart();
  const currentCartItems = cart || cartItems || []; // Safe fallback

  // 🌟 BACKPACK STATE 🌟
  const [isBackpackOpen, setIsBackpackOpen] = useState(false);
  // MULTIPLAYER STATES (GTA LOBBY & RADAR)
  const [activePartyMembers, setActivePartyMembers] = useState([]);
  const [partyLocations, setPartyLocations] = useState({});
  const multiplayerChannelRef = useRef(null);
  // 🌟 DROP PIN MODE STATES 🌟
  // 🌟 DROP PIN MODE STATES & FIXES 🌟
  const [isDropPinMode, setIsDropPinMode] = useState(false);
  const [isCreatePinModalOpen, setCreatePinModalOpen] = useState(false);
  const [newPinCoords, setNewPinCoords] = useState(null);

  // 1. STALE CLOSURE FIX: We use a ref so Mapbox always reads the freshest state
  const isDropPinModeRef = useRef(isDropPinMode);

  useEffect(() => {
    isDropPinModeRef.current = isDropPinMode;

    // 2. CURSOR FIX: Change the mouse to a target crosshair on Web
    if (Platform.OS === "web") {
      // Mapbox uses a specific canvas container, we target it to change the cursor
      const mapCanvas = document.querySelector(".mapboxgl-canvas-container");
      if (mapCanvas) {
        mapCanvas.style.cursor = isDropPinMode ? "crosshair" : "grab";
      }
    }
  }, [isDropPinMode]);

  // 3. UPDATED CLICK HANDLER (Using the Ref)
  const handleMapClick = (lng, lat) => {
    // Read from the Ref, NOT the state, to bypass Mapbox's stale closure bug!
    if (isDropPinModeRef.current) {
      if (!session?.user) {
        toast.info("Sign in to drop personal pins!");
        setAuthModalOpen(true);
        setIsDropPinMode(false); // Cancel mode if they need to log in
        return;
      }
      setNewPinCoords({ lat, lng });
      setCreatePinModalOpen(true);
      setIsDropPinMode(false); // Turn off drop mode once they click!
    } else {
      // Normal map exploration behavior
      setSelectedPin(null);
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
  // 🌟 RADAR: PERSISTENT WALKED PATH LOGIC 🌟
  const [walkedPath, setWalkedPath] = useState([]);
  const [unsavedPoints, setUnsavedPoints] = useState(0);

  // ==========================================
  // 🌟 COMPANION AUDIO ENGINE (Paimon Whispers) 🌟
  // ==========================================
  const [sound, setSound] = useState();

  // 1. THE ENTRY WHISPER
  // You wanted it to play during loading and finish 1 second after.
  // Since the loader is 4000ms, we trigger the audio at 2500ms!
  useEffect(() => {
    let entryTimeout;

    const playEntryWhisper = async () => {
      try {
        // Required for iOS to play sound even if the ringer switch is silent
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });

        // Load and play the specific welcome audio
        const { sound: entrySound } = await Audio.Sound.createAsync(
          require("../../public/sounds/welcome.mp3") // 🌟 UPDATE THIS PATH TO YOUR FILE
        );
        setSound(entrySound);
        await entrySound.playAsync();
      } catch (error) {
        console.log(
          "Autoplay blocked or audio missing. User must interact first."
        );
      }
    };

    // Queue the sound to play right before the loading screen drops
    entryTimeout = setTimeout(() => {
      playEntryWhisper();
    }, 2500);

    return () => clearTimeout(entryTimeout);
  }, []);

  // 2. THE IDLE BARKS (Random whispers every few minutes)
  useEffect(() => {
    if (!isAppReady) return; // Don't start the idle timer until the map is loaded

    const idleWhisperTimer = setInterval(async () => {
      try {
        // Array of your recorded whispers
        const whispers = [
          require("../../public/sounds/whisper1.mp3"), // "I wonder what adventure..."
          require("../../public/sounds/whisper2.mp3"), // "Look at that view..."
          require("../../public/sounds/whisper3.mp3"), // "Should we check the radar?"
        ];

        // Pick a random audio file from the array
        const randomWhisper =
          whispers[Math.floor(Math.random() * whispers.length)];

        const { sound: idleSound } = await Audio.Sound.createAsync(
          randomWhisper
        );
        setSound(idleSound);
        await idleSound.playAsync();
      } catch (error) {
        console.log("Could not play idle whisper");
      }
    }, 180000); // 🌟 180,000ms = 3 Minutes. Adjust this so it isn't too annoying!

    return () => clearInterval(idleWhisperTimer);
  }, [isAppReady]);

  // 3. MEMORY CLEANUP
  // Unload the audio from memory after it finishes so the app doesn't crash over time
  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);
  // ==========================================

  // 1. Fetch saved path when the app loads
  // 1. Fetch saved path when the app loads
  useEffect(() => {
    const loadExploration = async () => {
      if (!session?.user) return;
      const { data, error } = await supabase
        .from("user_exploration")
        .select("walked_path")
        .eq("user_id", session.user.id)
        .maybeSingle(); // ✅ THE FIX

      if (data?.walked_path) {
        setWalkedPath(data.walked_path);
      }
    };
    loadExploration();
  }, [session]);

  // 2. Track new GPS points as you walk
  useEffect(() => {
    if (!userLocation) return;
    setWalkedPath((prev) => {
      const last = prev[prev.length - 1];
      // Only add coordinate if we actually moved to save memory
      if (last && last[0] === userLocation[0] && last[1] === userLocation[1])
        return prev;

      setUnsavedPoints((p) => p + 1);
      return [...prev, userLocation];
    });
  }, [userLocation]);

  // 3. Batch save to Supabase every 10 new GPS points
  useEffect(() => {
    if (unsavedPoints >= 10 && session?.user) {
      const savePath = async () => {
        await supabase.from("user_exploration").upsert({
          user_id: session.user.id,
          walked_path: walkedPath,
          updated_at: new Date().toISOString(),
        });
        setUnsavedPoints(0); // Reset counter after saving
      };
      savePath();
    }
  }, [unsavedPoints, walkedPath, session]);

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

  // 🌟 SMART MAPBOX LOAD LISTENER 🌟
  useEffect(() => {
    // We only want to lift the curtain IF Mapbox has successfully fired its 'onLoad' event
    if (isMapLoaded) {
      // Mapbox is ready! We add a tiny 1.5-second buffer here.
      // Why? Because 'onLoad' fires when the base map is ready, but we want to give
      // the GPU an extra second to render your custom 3D pins and Fog of War,
      // AND we want to make sure your audio whisper has time to play smoothly.
      const revealTimer = setTimeout(() => {
        setAppReady(true);
      }, 1500);

      return () => clearTimeout(revealTimer);
    }
  }, [isMapLoaded]);

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

  // 🌟 EDGE-TO-EDGE FULLSCREEN FIX (iOS & Android) 🌟
  useEffect(() => {
    if (Platform.OS === "web") {
      // 1. Force the HTML body to stretch and match the dark theme
      document.body.style.backgroundColor = "#1c1d28";
      document.body.style.margin = "0";
      document.body.style.overflow = "hidden"; // Prevents bounce

      const addMetaTag = (name, content) => {
        let tag = document.querySelector(`meta[name="${name}"]`);
        if (!tag) {
          tag = document.createElement("meta");
          tag.name = name;
          document.head.appendChild(tag);
        }
        tag.setAttribute("content", content);
      };

      // 2. Viewport-Fit=Cover: Tells the browser "Yes, please draw under the notch!"
      addMetaTag(
        "viewport",
        "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
      );

      // 3. Android Chrome Theme Color (Colors the top status bar)
      addMetaTag("theme-color", "#1c1d28");

      // 4. iOS Magic: Hides Safari UI when launched from the Home Screen
      addMetaTag("apple-mobile-web-app-capable", "yes");

      // 5. iOS Magic: Forces the iPhone status bar (battery/clock) to be transparent so the map goes under it!
      addMetaTag("apple-mobile-web-app-status-bar-style", "black-translucent");

      // 6. Generic Mobile Web App Capable (For Android PWA)
      addMetaTag("mobile-web-app-capable", "yes");
    }
  }, []);

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

  // ==========================================
  // 🌟 CAMERA & NAVIGATION ENGINE 🌟
  // ==========================================

  const [is3D, setIs3D] = useState(true);
  const [navState, setNavState] = useState("idle"); // "idle" | "preview" | "active"
  const [navProfile, setNavProfile] = useState("walking"); // "walking" | "driving" | "cycling"
  const [navTargetPin, setNavTargetPin] = useState(null);
  const [routeStats, setRouteStats] = useState({
    distance: 0,
    duration: 0,
    geometry: null,
  });
  const [isFetchingRoute, setIsFetchingRoute] = useState(false);
  const toggleMapPitch = () => {
    if (mapRef.current) {
      const newPitch = is3D ? 0 : 60;
      mapRef.current.easeTo({ pitch: newPitch, duration: 1000 });
      setIs3D(!is3D);
    }
  };
  const fetchRouteData = async (pin, profile = "walking") => {
    if (!userLocation || !pin) return;
    setIsFetchingRoute(true);
    setNavProfile(profile);

    try {
      // 🌟 UPDATED: Added your fallback token so this never fails!
      const MAPBOX_TOKEN =
        process.env.EXPO_PUBLIC_MAPBOX_TOKEN ||
        process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
        "pk.eyJ1IjoiaHlyb3N5IiwiYSI6ImNtZW84aHIyMzFjNXEybXNlZzN0c294N3oifQ.xSS6R2U0ClqqtR9Tfxmntw";

      const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${userLocation[0]},${userLocation[1]};${pin.lng},${pin.lat}?geometries=geojson&access_token=${MAPBOX_TOKEN}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const distanceKm = (route.distance / 1000).toFixed(1);
        const durationMin = Math.round(route.duration / 60);

        setRouteStats({
          distance: distanceKm,
          duration: durationMin,
          geometry: route.geometry,
        });

        if (mapRef.current && navState !== "active") {
          setIs3D(false);
          const bounds = [
            [
              Math.min(userLocation[0], pin.lng),
              Math.min(userLocation[1], pin.lat),
            ],
            [
              Math.max(userLocation[0], pin.lng),
              Math.max(userLocation[1], pin.lat),
            ],
          ];
          mapRef.current.fitBounds(bounds, {
            padding: { top: 150, bottom: 250, left: 100, right: 100 },
            pitch: 0,
            duration: 1500,
            essential: true,
          });
        }
      }
    } catch (error) {
      toast.error("Could not calculate route.");
    } finally {
      setIsFetchingRoute(false);
    }
  };

  const executeDrawRoute = (pin) => {
    if (!userLocation) return toast.error("GPS required to draw route.");
    setSelectedPin(null);
    setNavTargetPin(pin);
    setNavState("preview");
    fetchRouteData(pin, "walking");
  };

  const cancelNavigation = () => {
    setNavState("idle");
    setNavTargetPin(null);
    setRouteStats({ distance: 0, duration: 0, geometry: null });
    setIs3D(true);
    if (mapRef.current) mapRef.current.easeTo({ pitch: 60, duration: 1000 });
  };

  const startActiveNavigation = () => {
    setNavState("active");
    setIs3D(true);
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: userLocation,
        zoom: 18,
        pitch: 60,
        duration: 2000,
        essential: true,
      });
    }
  };

  // 🌟 6. TURF.JS AUTO-RECALCULATION ENGINE 🌟
  useEffect(() => {
    // Only run this IF we are actively navigating, we have a GPS signal, and we have a drawn route.
    // We also pause it if 'isFetchingRoute' is true so we don't spam the API!
    if (
      navState !== "active" ||
      !userLocation ||
      !routeStats.geometry ||
      isFetchingRoute
    )
      return;

    try {
      // 1. Create a Turf Point for the user's current GPS location
      const currentPoint = turf.point([userLocation[0], userLocation[1]]);

      // 2. Create a Turf LineString from the Mapbox route geometry
      const routeLine = turf.feature(routeStats.geometry);

      // 3. Calculate the distance from the player to the nearest edge of the line in METERS
      const distanceToLine = turf.pointToLineDistance(currentPoint, routeLine, {
        units: "meters",
      });

      // 4. THE THRESHOLD TRIGGER (30 Meters)
      // If the player wanders more than 30 meters off the blue line, silently recalculate!
      if (distanceToLine > 30) {
        console.log(
          `Player strayed ${Math.round(
            distanceToLine
          )}m off path! Recalculating...`
        );
        fetchRouteData(navTargetPin, navProfile);
      }
    } catch (error) {
      console.log("Turf math error skipped.");
    }
  }, [userLocation, navState, routeStats.geometry, isFetchingRoute]);

  return (
    <View
      className="flex-1 bg-[#1c1d28] relative w-full"
      style={{ height: Platform.OS === "web" ? "100dvh" : "100%" }}
    >
      {!isAppReady && <WelcomeOverlay />}

      {/* 🌟 LAYER 1: THE PERSISTENT MAP 🌟 */}
      <View className="absolute inset-0" pointerEvents="auto">
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
            onMapClick={handleMapClick}
            partyLocations={Object.values(partyLocations)}
            directionsRoute={routeStats.geometry} // 🌟 PASSED TO MAP.JS TO DRAW THE LINE
          />
        </Suspense>
      </View>

      {/* 🌟 WORLD TRANSITION OVERLAY 🌟 */}
      {worldTransition.isTransitioning && (
        <View className="absolute inset-0 z-[99999] bg-[#1c1d28] flex-col items-center justify-center pointer-events-auto">
          <View className="relative flex items-center justify-center mb-8">
            <View className="absolute w-32 h-32 border-2 border-dashed border-[#3b3e52] rounded-full animate-[spin_4s_linear_infinite]" />
            <View className="absolute w-24 h-24 border-2 border-[#d3bc8e]/50 rounded-full animate-[spin_3s_linear_infinite_reverse]" />
            <View className="w-16 h-16 bg-[#e6ce9a] rounded-full shadow-[0_0_40px_rgba(230,206,154,0.6)] animate-pulse items-center justify-center">
              <Globe size={28} color="#1c1d28" />
            </View>
          </View>
          <Text className="text-[#d3bc8e] font-black text-xl tracking-[4px] uppercase mb-3">
            Syncing World Data
          </Text>
          <Text className="text-gray-400 font-medium tracking-wide text-sm">
            Entering {worldTransition.hostName}...
          </Text>
        </View>
      )}

      {/* 🌟 LAYER 2: THE GENSHIN HUD (SAFE AREA) 🌟 */}
      <SafeAreaView className="absolute inset-0" pointerEvents="box-none">
        {/* LOADING INDICATOR */}
        {isLoading && isAppReady && (
          <View className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 items-center bg-[#1c1d28]/90 p-6 rounded-2xl">
            <View className="w-12 h-12 rounded-full border-4 border-[#d3bc8e] border-t-transparent animate-spin mb-4" />
            <Text className="text-[#d3bc8e] font-bold tracking-widest uppercase text-xs">
              Loading Map...
            </Text>
          </View>
        )}

        {/* IOS INSTALL PROMPT */}
        {showIosInstallPopup && (
          <View className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-[#2e3142] border border-[#d3bc8e]/50 p-4 rounded-xl shadow-2xl pointer-events-auto w-[90%] max-w-sm">
            <Text className="text-gray-300 font-medium text-sm mb-3 text-center">
              To install, tap the Share icon and then 'Add to Home Screen'.
            </Text>
            <TouchableOpacity
              onPress={closeIosInstallPopup}
              className="bg-[#e6ce9a] py-3 rounded-full items-center"
            >
              <Text className="font-bold text-[#1c1d28]">Close</Text>
            </TouchableOpacity>
          </View>
        )}

        {isAppReady && (
          <>
            {/* TOP LEFT: AVATAR & WORLD */}
            <View
              className="absolute top-4 left-4 flex-row items-center gap-3"
              pointerEvents="auto"
            >
              <TouchableOpacity
                onPress={() => requireAuth(() => setIsProfileOpen(true))}
                className="w-14 h-14 bg-[#1c1d28]/90 rounded-full border-2 border-[#d3bc8e] items-center justify-center shadow-lg active:scale-95 overflow-hidden"
              >
                {session?.user?.user_metadata?.avatar_url ? (
                  <Image
                    source={{ uri: session.user.user_metadata.avatar_url }}
                    style={{ width: "100%", height: "100%" }}
                  />
                ) : (
                  <User color="#d3bc8e" size={24} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setQuestPanelOpen(true)}
                className="bg-[#1c1d28]/90 border border-[#d3bc8e]/50 px-4 h-12 rounded-full flex-row items-center shadow-xl"
              >
                <Globe size={18} color="#d3bc8e" />
                <Text
                  className="text-white font-bold text-sm tracking-wide ml-2 max-w-[100px]"
                  numberOfLines={1}
                >
                  {currentWorld.name}
                </Text>
                <ChevronDown size={16} color="#9ca3af" className="ml-2" />
              </TouchableOpacity>
            </View>

            {/* 🌟 GOOGLE MAPS STYLE NAVIGATION UI 🌟 */}

            {/* 1. THE PRE-NAV SLIDER (Preview Mode) */}
            {navState === "preview" && navTargetPin && (
              <View className="absolute bottom-0 left-0 w-full bg-[#1c1d28] rounded-t-3xl border-t border-[#3b3e52] shadow-[0_-10px_40px_rgba(0,0,0,0.8)] pb-8 pt-6 px-6 pointer-events-auto animate-in slide-in-from-bottom duration-300 z-50">
                {/* Top Row: Transport Modes */}
                <View className="flex-row justify-between items-center mb-6 bg-[#2e3142] p-1.5 rounded-2xl border border-[#3b3e52]">
                  <TouchableOpacity
                    onPress={() => fetchRouteData(navTargetPin, "walking")}
                    className={`flex-1 py-3 rounded-xl items-center flex-row justify-center ${
                      navProfile === "walking" ? "bg-[#d3bc8e] shadow-md" : ""
                    }`}
                  >
                    <Footprints
                      size={20}
                      color={navProfile === "walking" ? "#1c1d28" : "#9ca3af"}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => fetchRouteData(navTargetPin, "driving")}
                    className={`flex-1 py-3 rounded-xl items-center flex-row justify-center ${
                      navProfile === "driving" ? "bg-[#d3bc8e] shadow-md" : ""
                    }`}
                  >
                    <Car
                      size={20}
                      color={navProfile === "driving" ? "#1c1d28" : "#9ca3af"}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => fetchRouteData(navTargetPin, "cycling")}
                    className={`flex-1 py-3 rounded-xl items-center flex-row justify-center ${
                      navProfile === "cycling" ? "bg-[#d3bc8e] shadow-md" : ""
                    }`}
                  >
                    <Bike
                      size={20}
                      color={navProfile === "cycling" ? "#1c1d28" : "#9ca3af"}
                    />
                  </TouchableOpacity>
                </View>

                {/* Middle Row: ETA & Distance */}
                <View className="flex-row items-end justify-between mb-6 px-2">
                  <View>
                    {isFetchingRoute ? (
                      <ActivityIndicator color="#d3bc8e" size="small" />
                    ) : (
                      <>
                        <Text className="text-4xl font-black text-white tracking-tight">
                          {routeStats.duration > 60
                            ? `${Math.floor(routeStats.duration / 60)} h ${
                                routeStats.duration % 60
                              } min`
                            : `${routeStats.duration} min`}
                        </Text>
                        <Text className="text-gray-400 font-bold text-base mt-1">
                          ({routeStats.distance} km) •{" "}
                          {navProfile === "walking"
                            ? "On Foot"
                            : navProfile === "driving"
                            ? "By Car"
                            : "By Bike"}
                        </Text>
                      </>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={cancelNavigation}
                    className="w-12 h-12 bg-[#2e3142] rounded-full items-center justify-center border border-[#3b3e52] active:bg-[#3b3e52]"
                  >
                    <X color="#9ca3af" size={24} />
                  </TouchableOpacity>
                </View>

                {/* Bottom Row: Start Button */}
                <TouchableOpacity
                  onPress={startActiveNavigation}
                  disabled={isFetchingRoute || routeStats.distance === 0}
                  className={`w-full py-4 rounded-2xl flex-row items-center justify-center shadow-[0_0_20px_rgba(74,222,128,0.3)] active:scale-95 transition-transform ${
                    isFetchingRoute ? "bg-gray-700" : "bg-[#4ade80]"
                  }`}
                >
                  <Navigation
                    color="#1c1d28"
                    size={20}
                    className="mr-2"
                    style={{ transform: [{ rotate: "45deg" }] }}
                  />
                  <Text className="text-[#1c1d28] font-black text-xl uppercase tracking-wider">
                    Start Route
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* TOP CENTER: SEARCH */}
            {navState === "idle" && (
              <View className="absolute top-4 left-1/2 -translate-x-1/2 w-full max-w-xs sm:max-w-md px-4 pointer-events-auto hidden sm:flex">
                <View className="bg-[#1c1d28]/90 border border-[#3b3e52] rounded-full flex-row items-center px-4 h-12 shadow-2xl">
                  <Search size={18} color="#d3bc8e" />
                  <TextInput
                    placeholder={`Search ${
                      selectedCity?.name || "locations"
                    }...`}
                    placeholderTextColor="#6b7280"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    className="flex-1 ml-3 text-white text-sm font-medium h-full outline-none"
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setSearchQuery("")}
                      className="p-1"
                    >
                      <X size={16} color="#d3bc8e" />
                    </TouchableOpacity>
                  )}
                </View>
                {searchResults.length > 0 && (
                  <View className="mt-2 bg-[#2e3142]/95 border border-[#3b3e52] rounded-2xl overflow-hidden shadow-2xl">
                    {searchResults.map((pin) => (
                      <TouchableOpacity
                        key={pin.id}
                        onPress={() => handleMapSearchSelect(pin)}
                        className="w-full p-4 border-b border-[#3b3e52] flex-row items-center active:bg-[#3b3e52]"
                      >
                        <View className="bg-[#1c1d28] border border-[#d3bc8e]/50 p-2 rounded-full mr-4">
                          <MapPin size={16} color="#d3bc8e" />
                        </View>
                        <View>
                          <Text className="text-white font-bold text-sm">
                            {pin.name}
                          </Text>
                          <Text className="text-[#d3bc8e] text-[10px] font-bold uppercase tracking-wider mt-1">
                            {pin.category}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* 2. THE ACTIVE HUD (Follow Mode) */}
            {/* 2. THE ACTIVE HUD (Follow Mode - Minimal Capsule) */}
            {navState === "active" && navTargetPin && (
              <View className="absolute bottom-28 left-1/2 -translate-x-1/2 bg-[#1c1d28]/95 backdrop-blur-md border border-[#4ade80]/50 rounded-full shadow-[0_0_20px_rgba(74,222,128,0.15)] p-1.5 pointer-events-auto flex-row items-center z-50 animate-in slide-in-from-bottom duration-300">
                {/* Small Green Indicator Icon */}
                <View className="w-10 h-10 bg-[#4ade80]/20 rounded-full items-center justify-center mr-3 border border-[#4ade80]/50">
                  <Navigation
                    color="#4ade80"
                    size={16}
                    style={{ transform: [{ rotate: "45deg" }] }}
                  />
                </View>

                {/* Compact Text Info */}
                <View className="flex-col justify-center pr-4 max-w-[160px] sm:max-w-[200px]">
                  <Text
                    className="text-white font-bold text-sm leading-tight"
                    numberOfLines={1}
                  >
                    {navTargetPin.name}
                  </Text>
                  <Text className="text-[#4ade80] font-bold text-[10px] uppercase tracking-widest mt-0.5">
                    {routeStats.duration} min • {routeStats.distance} km
                  </Text>
                </View>

                {/* Minimal End Route Button */}
                <TouchableOpacity
                  onPress={cancelNavigation}
                  className="bg-red-500/20 w-10 h-10 rounded-full items-center justify-center border border-red-500/50 active:bg-red-500/40 ml-1 shadow-sm"
                >
                  <X color="#f87171" size={18} />
                </TouchableOpacity>
              </View>
            )}

            {/* TOP RIGHT: MINIMAP & TOOLS */}
            <View
              className="absolute top-4 right-4 items-end"
              pointerEvents="auto"
            >
              <TouchableOpacity
                onPress={() => setIsRadarOpen(true)}
                className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-[#3b3e52] bg-[#1c1d28]/80 shadow-2xl items-center justify-center overflow-hidden"
              >
                <View className="w-2.5 h-2.5 bg-[#e6ce9a] rounded-full shadow-[0_0_10px_3px_rgba(230,206,154,0.8)] z-10" />
                <View className="absolute bottom-3 bg-[#1c1d28]/95 px-2 py-0.5 rounded border border-[#3b3e52]">
                  <Text className="text-[9px] font-black text-[#d3bc8e] uppercase tracking-widest">
                    {currentWorld.id === "base"
                      ? selectedCity?.name || "WORLD"
                      : currentWorld.name}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Map Tools Column */}
              <View className="flex-col gap-3 mt-4">
                {/* 🌟 NEW: 2D/3D TOGGLE 🌟 */}
                <TouchableOpacity
                  onPress={toggleMapPitch}
                  className="bg-[#2e3142]/90 border border-[#3b3e52] rounded-full h-12 w-12 items-center justify-center shadow-lg active:scale-95"
                >
                  <Text className="text-[#d3bc8e] font-black text-sm">
                    {is3D ? "2D" : "3D"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => requireAuth(() => setIsChatOpen(true))}
                  className="bg-[#2e3142]/90 border border-[#3b3e52] rounded-full h-12 w-12 items-center justify-center shadow-lg active:scale-95"
                >
                  <MessageSquare color="#d3bc8e" size={20} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleGoToUserLocation}
                  className="bg-[#2e3142]/90 border border-[#3b3e52] rounded-full h-12 w-12 items-center justify-center shadow-lg active:scale-95"
                >
                  <Crosshair color="#d3bc8e" size={20} />
                </TouchableOpacity>

                {/* 🌟 NEW: DROP PIN TOGGLE 🌟 */}
                <TouchableOpacity
                  onPress={() =>
                    requireAuth(() => setIsDropPinMode(!isDropPinMode))
                  }
                  className={`bg-[#2e3142]/90 border ${
                    isDropPinMode ? "border-[#4ade80]" : "border-[#3b3e52]"
                  } rounded-full h-12 w-12 items-center justify-center shadow-lg active:scale-95`}
                >
                  <MapPinPlus
                    color={isDropPinMode ? "#4ade80" : "#d3bc8e"}
                    size={20}
                  />
                </TouchableOpacity>

                {/* 🌟 NEW: GUILD MERCHANT STORE BUTTON 🌟 */}
                <TouchableOpacity
                  onPress={() => setIsMerchantOpen(true)}
                  className="bg-[#d3bc8e] border border-[#e6ce9a] rounded-full h-12 w-12 items-center justify-center shadow-[0_0_20px_rgba(211,188,142,0.4)] active:scale-95 mt-2"
                >
                  <ShoppingBag color="#1c1d28" size={20} />
                </TouchableOpacity>

                {/* 🌟 TRAVELER BACKPACK BUTTON 🌟 */}
                <TouchableOpacity
                  onPress={() => setIsBackpackOpen(true)}
                  className="relative bg-[#2e3142]/90 border border-[#3b3e52] rounded-full h-12 w-12 items-center justify-center shadow-lg active:scale-95 mt-2"
                >
                  <Backpack color="#4ade80" size={20} />

                  {/* The glowing red notification dot if items are in the bag! */}
                  {currentCartItems.length > 0 && (
                    <View className="absolute -top-1 -right-1 bg-red-500 border-2 border-[#1c1d28] w-5 h-5 rounded-full items-center justify-center shadow-md">
                      <Text className="text-white text-[10px] font-black">
                        {currentCartItems.length}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {isDropPinMode && (
              <View className="absolute top-24 left-1/2 -translate-x-1/2 bg-[#4ade80] px-6 py-3 rounded-full shadow-[0_0_30px_rgba(74,222,128,0.4)] flex-row items-center pointer-events-auto animate-in slide-in-from-top z-50">
                <MapPin size={18} color="#1c1d28" className="mr-2" />
                <Text className="text-[#1c1d28] font-black tracking-widest uppercase text-xs mr-4">
                  Tap map to drop pin
                </Text>
                <TouchableOpacity
                  onPress={() => setIsDropPinMode(false)}
                  className="bg-[#1c1d28]/20 p-1.5 rounded-full active:bg-[#1c1d28]/40"
                >
                  <X size={14} color="#1c1d28" />
                </TouchableOpacity>
              </View>
            )}

            {/* BOTTOM NAV */}
            <View
              className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 flex-row items-center justify-center gap-2"
              pointerEvents="auto"
            >
              <TouchableOpacity
                onPress={() => setLocatorOpen(true)}
                className="h-14 w-14 rounded-full bg-[#2e3142] border border-[#3b3e52] items-center justify-center shadow-lg"
              >
                <MapPin color="#d3bc8e" size={24} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setFilterPanelOpen(true)}
                className="flex-1 rounded-full h-14 bg-[#e6ce9a] items-center justify-center flex-row shadow-[0_0_20px_rgba(230,206,154,0.3)]"
              >
                <Search color="#1c1d28" size={20} />
                <Text className="text-[#1c1d28] font-black text-base ml-2">
                  Explore
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setQuestPanelOpen(true)}
                className="h-14 w-14 rounded-full bg-[#2e3142] border border-[#3b3e52] items-center justify-center shadow-lg"
              >
                <Route color="#d3bc8e" size={24} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setStoryArchiveOpen(true)}
                className="h-14 w-14 rounded-full bg-[#2e3142] border border-[#3b3e52] items-center justify-center shadow-lg"
              >
                <BookOpen color="#d3bc8e" size={24} />
              </TouchableOpacity>
            </View>
          </>
        )}
      </SafeAreaView>

      {/* 🌟 LAYER 3: MODALS & SLIDE-OVERS 🌟 */}

      {/* THE GTA RADAR */}
      {isRadarOpen && (
        <View className="absolute inset-0 z-[99999] bg-black pointer-events-auto">
          <RadarMap
            userLocation={userLocation}
            walkedPath={walkedPath}
            partyLocations={Object.values(partyLocations)}
          />
          <View className="absolute top-6 w-full px-6 flex-row justify-between items-center pointer-events-box-none">
            <View className="bg-[#1c1d28]/90 border border-[#3b3e52] px-6 py-3 rounded-full flex-row items-center gap-3">
              <Radar
                color="#d3bc8e"
                size={24}
                className="animate-[spin_3s_linear_infinite]"
              />
              <Text className="text-xl font-black text-white tracking-widest uppercase">
                Radar
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setIsRadarOpen(false)}
              className="p-3 bg-[#2e3142]/90 rounded-full border border-[#3b3e52]"
            >
              <X size={24} color="#d3bc8e" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <CreatePinModal
        isOpen={isCreatePinModalOpen}
        onClose={() => setCreatePinModalOpen(false)}
        coordinates={newPinCoords}
        session={session}
        currentWorld={currentWorld}
        existingLists={existingLists}
        onSuccess={(newPin) => {
          if (currentWorld.id === "base") {
            setDynamicPins((prev) => [...prev, newPin]);
          }
        }}
      />

      {/* EXTERNAL MODALS */}
      {isLocatorOpen && (
        <QuickLocator
          isOpen={isLocatorOpen}
          onClose={() => setLocatorOpen(false)}
          cities={CITY_DATA}
          onCitySelect={(key) => {
            handleCitySelect(key);
            setLocatorOpen(false);
          }}
          onResetView={() => {
            handleResetView();
            setLocatorOpen(false);
          }}
        />
      )}
      <ChatHub
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        userLocation={userLocation}
        mapRef={mapRef}
        currentWorld={currentWorld}
      />

      {/* 🌟 ADD THE NEW PROFILE COMPONENT HERE 🌟 */}
      <ProfilePanel
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />

      {/* 🌟 AUTH MODAL 🌟 */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />

      <GuildMerchantPanel
        isOpen={isMerchantOpen}
        onClose={() => setIsMerchantOpen(false)}
      />

      <TravelerBackpack
        isOpen={isBackpackOpen}
        onClose={() => setIsBackpackOpen(false)}
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
        onRequestAuth={() => setAuthModalOpen(true)}
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
        onGetDirections={executeDrawRoute}
        products={modalProducts.data}
        productsStatus={modalProducts.status}
        onRequestAuth={() => setAuthModalOpen(true)}
      />
    </View>
  );
}
