"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
// import Map from component (Web version uses standard Mapbox GL)
import Map from "@/components/Map";

import ProductDetail from "@/components/ProductDetail";
import PinDetailsModal from "@/components/PinDetailsModal";
import QuickLocator from "@/components/QuickLocator";
import FilterPanel from "@/components/FilterPanel";
import QuestPanel from "@/components/QuestPanel";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext"; // <-- Auth Context for Admin
// Valid for Web:
import {
  MapPin,
  Search,
  Route,
  BookOpen,
  Crosshair,
  ArrowLeft,
  X,
  Check,
} from "lucide-react";
import StoryArchivePanel from "@/components/StoryArchivePanel";
import WelcomeOverlay from "@/components/WelcomeOverlay";

// Expo Router for Navigation and Params
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "@/lib/supabaseClient";

// Hooks
import { usePwaInstall } from "@/hooks/usePwaInstall";
import useMapData from "@/hooks/useMapData";
import useQuests from "@/hooks/useQuests";
import usePinProducts from "@/hooks/usePinProducts";
import useMapInteraction from "@/hooks/useMapInteraction";

// City Data Constant
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

export default function WebMapPage() {
  const router = useRouter();
  const { city: initialCityId } = useLocalSearchParams();

  // --- Initialize state ---
  const [selectedCity, setSelectedCity] = useState(
    initialCityId && CITY_DATA[initialCityId]
      ? CITY_DATA[initialCityId]
      : CITY_DATA["marrakech"]
  );

  const [viewingExperience, setViewingExperience] = useState(null);
  const { showIosInstallPopup, handleInstallClick, closeIosInstallPopup } =
    usePwaInstall();

  const categoryIconMap = {
    Activities: "adventure1.png",
    Experiences: "adventure1.png",
    Restaurants: "food.png",
    "Food & Cooking": "food.png",
    Monuments: "monuments.png",
    "Books & Guides": "monuments.png",
    Shops: "shopping.png",
    "Fashion & Accessories": "shopping.png",
    "Home Decor": "shopping.png",
    Hotels: "building.png",
    "Home & Lifestyle": "building.png",
    Transport: "quad-bike.png",
  };

  const [isFilterPanelOpen, setFilterPanelOpen] = useState(false);
  const [selectedPin, setSelectedPin] = useState(null);
  const [isLocatorOpen, setLocatorOpen] = useState(false);

  const [isStoryModalOpen, setStoryModalOpen] = useState(false);
  const [storyContentUrl, setStoryContentUrl] = useState("");
  const [viewedCities, setViewedCities] = useState(new Set());
  const mapRef = useRef(null);
  const { addToCart } = useCart();

  // --- ADMIN PIN CREATION STATE ---
  const { session } = useAuth();
  // 🌟 PUT YOUR EXACT ADMIN LOGIN EMAIL HERE 🌟
  const isAdmin = session?.user?.email === "support@hyrosy.com";

  const [isCreatePinModalOpen, setCreatePinModalOpen] = useState(false);
  const [isSubmittingPin, setIsSubmittingPin] = useState(false);
  const [newPinData, setNewPinData] = useState({
    lat: null,
    lng: null,
    name: "",
    category: "Experiences",
    description: "",
  });

  // Handle Map Clicks for Admins
  const handleMapClick = (lng, lat) => {
    if (isAdmin) {
      setNewPinData((prev) => ({ ...prev, lat, lng }));
      setCreatePinModalOpen(true);
    }
  };

  const handleCreatePin = async () => {
    if (!newPinData.name) {
      alert("Please give the pin a name!");
      return;
    }

    setIsSubmittingPin(true);
    const { error } = await supabase.from("locations").insert([
      {
        name: newPinData.name,
        category: newPinData.category,
        description: newPinData.description,
        lat: newPinData.lat,
        lng: newPinData.lng,
        // 🌟 ADD THIS LINE TO THE INSERT PAYLOAD 🌟
        city: selectedCity?.name || "Unknown",
      },
    ]);
    setIsSubmittingPin(false);

    if (error) {
      alert("Failed to save pin: " + error.message);
    } else {
      setCreatePinModalOpen(false);
      setNewPinData({
        lat: null,
        lng: null,
        name: "",
        category: "Experiences",
        description: "",
      });
      // Refresh map to see the new pin
      window.location.reload();
    }
  };

  const handleViewExperience = async (route) => {
    if (!route || !route.user_map_pins || route.user_map_pins.length === 0) {
      setViewingExperience(null);
      return;
    }
    setQuestPanelOpen(false);

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
    } catch (error) {
      console.error("Error fetching experience details:", error);
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

  useEffect(() => {
    const readyTimer = setTimeout(() => {
      setAppReady(true);
    }, 4000);
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

  const handleCitySelect = (cityKey) => {
    setSelectedCity(CITY_DATA[cityKey]);
  };

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
    if (mapRef.current && isMapLoaded) {
      mapRef.current.flyTo({
        center: [-5.5, 32],
        zoom: 15.5,
        essential: true,
      });
    }
    setSelectedCity(null);
  };

  const handleSearchResultSelect = (pin) => {
    if (mapRef.current && pin.lat && pin.lng) {
      const map = mapRef.current;
      map.flyTo({
        center: [pin.lng, pin.lat],
        zoom: 15,
        essential: true,
      });
      setTimeout(() => {
        setSelectedPin(pin);
      }, 500);
    }
    setFilterPanelOpen(false);
  };

  return (
    <div className="absolute inset-0 w-full h-full">
      {!isAppReady && <WelcomeOverlay />}
      <Suspense fallback={null}>
        <Map
          mapRef={mapRef}
          displayedPins={displayedPins}
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
          onMapClick={handleMapClick} // <-- Attached the new listener!
        />
      </Suspense>

      <div className="absolute top-0 left-0 w-full h-full z-10 pointer-events-none">
        {isLoading && isAppReady && (
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white pointer-events-auto">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            <p className="mt-4">Entering City...</p>
          </div>
        )}

        {showIosInstallPopup && (
          <div className="ios-install-popup pointer-events-auto">
            <p>
              To install, tap the Share icon and then &apos;Add to Home
              Screen&apos;.
            </p>
            <button onClick={closeIosInstallPopup}>Close</button>
          </div>
        )}

        {isAppReady && (
          <>
            {/* Back to Dashboard Button */}
            <div className="absolute top-4 left-4 pointer-events-auto">
              <Button
                variant="secondary"
                className="bg-white/90 shadow-md hover:bg-white rounded-full h-10 w-10 p-0 flex items-center justify-center"
                onClick={() => router.push("/")}
              >
                <ArrowLeft className="h-5 w-5 text-gray-800" />
              </Button>
            </div>

            <div className="absolute top-1/2 right-4 pointer-events-auto flex flex-col gap-3">
              <button
                onClick={handleGoToUserLocation}
                className="bg-white/90 backdrop-blur-sm rounded-full h-12 w-12 flex items-center justify-center shadow-lg hover:bg-white transition-all active:scale-95"
                title="Go to my location"
              >
                <Crosshair className="h-6 w-6 text-gray-800" />
              </button>
              <button
                onClick={handleInstallClick}
                className="bg-black/80 text-white font-bold backdrop-blur-sm rounded-full h-12 w-12 flex items-center justify-center shadow-lg hover:bg-black transition-all active:scale-95 text-xs"
              >
                App
              </button>
            </div>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 pointer-events-auto flex items-center gap-2">
              <Button
                size="icon"
                variant="secondary"
                className="h-14 w-14 rounded-full shadow-lg bg-black text-white hover:bg-gray-800 flex-shrink-0 active:scale-95 transition-transform"
                onClick={() => setLocatorOpen(true)}
                title="Quick Locator"
              >
                <MapPin className="h-6 w-6" />
              </Button>
              <Button
                size="lg"
                className="w-full shadow-lg rounded-full h-14 text-base font-bold bg-[#d3bc8e] text-black hover:bg-[#c8b185] active:scale-95 transition-transform"
                onClick={() => setFilterPanelOpen(true)}
              >
                <Search className="h-5 w-5 mr-2" />
                Filter Pins
              </Button>
              <Button
                size="icon"
                className="h-14 w-14 rounded-full shadow-lg bg-black text-white hover:bg-gray-800 flex-shrink-0 active:scale-95 transition-transform"
                onClick={() => setQuestPanelOpen(true)}
              >
                <Route className="h-5 w-5" />
              </Button>
              <Button
                size="icon"
                className="h-14 w-14 rounded-full shadow-lg bg-black text-white hover:bg-gray-800 flex-shrink-0 active:scale-95 transition-transform"
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
        onViewExperience={handleViewExperience}
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
        onSearchResultSelect={handleSearchResultSelect}
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

      {/* --- 🌟 BEAUTIFIED ADMIN CREATE PIN MODAL 🌟 --- */}
      {isCreatePinModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md pointer-events-auto p-4 transition-all">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative overflow-hidden">
            {/* Decorative gradient top border */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-blue-600"></div>

            <div className="flex justify-between items-center mb-6 mt-2">
              <div>
                <h2 className="text-2xl font-black text-white flex items-center gap-2">
                  <MapPin className="text-cyan-400 h-6 w-6" />
                  Drop New Pin
                </h2>
                <p className="text-gray-400 text-xs font-mono mt-1">
                  {newPinData.lat?.toFixed(5)}°, {newPinData.lng?.toFixed(5)}°
                </p>
              </div>
              <button
                onClick={() => setCreatePinModalOpen(false)}
                className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 mb-8">
              <div>
                <label className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 block">
                  Location Name
                </label>
                <input
                  className="w-full bg-gray-800/50 text-white px-4 py-4 rounded-xl border border-gray-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all placeholder-gray-600 outline-none"
                  placeholder="e.g., Secret Rooftop Cafe"
                  value={newPinData.name}
                  onChange={(e) =>
                    setNewPinData({ ...newPinData, name: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 block">
                  Category
                </label>
                <select
                  className="w-full bg-gray-800/50 text-white px-4 py-4 rounded-xl border border-gray-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all outline-none appearance-none"
                  value={newPinData.category}
                  onChange={(e) =>
                    setNewPinData({ ...newPinData, category: e.target.value })
                  }
                >
                  {Object.keys(categoryIconMap).map((cat) => (
                    <option key={cat} value={cat} className="bg-gray-900">
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 block">
                  Description
                </label>
                <textarea
                  className="w-full bg-gray-800/50 text-white px-4 py-4 rounded-xl border border-gray-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all placeholder-gray-600 outline-none h-28 resize-none"
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
              className="w-full bg-cyan-500 text-black py-4 rounded-xl font-bold active:bg-cyan-600 hover:bg-cyan-400 flex justify-center items-center gap-2 transition-colors shadow-[0_0_20px_rgba(34,211,238,0.3)]"
              onClick={handleCreatePin}
              disabled={isSubmittingPin}
            >
              {isSubmittingPin ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
              ) : (
                <>
                  <Check className="h-5 w-5" />
                  Save to Map
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
