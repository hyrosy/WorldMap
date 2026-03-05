"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Map from "@/components/Map";

import ProductDetail from "@/components/ProductDetail";
import PinDetailsModal from "@/components/PinDetailsModal";
import QuickLocator from "@/components/QuickLocator";
import FilterPanel from "@/components/FilterPanel";
import QuestPanel from "@/components/QuestPanel";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
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

import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "@/lib/supabaseClient";

import { usePwaInstall } from "@/hooks/usePwaInstall";
import useMapData from "@/hooks/useMapData";
import useQuests from "@/hooks/useQuests";
import usePinProducts from "@/hooks/usePinProducts";
import useMapInteraction from "@/hooks/useMapInteraction";

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
  const isAdmin = session?.user?.email === "support@hyrosy.com";

  const [isCreatePinModalOpen, setCreatePinModalOpen] = useState(false);
  const [isSubmittingPin, setIsSubmittingPin] = useState(false);
  const [newPinData, setNewPinData] = useState({
    lat: null,
    lng: null,
    name: "",
    category: "Experiences",
    description: "",
    image_url: "",
  });

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
        image_url: newPinData.image_url,
        lat: newPinData.lat,
        lng: newPinData.lng,
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
        image_url: "",
      });
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

  // --- MAP SEARCH STATE ---
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);

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
    if (mapRef.current && isMapLoaded) {
      mapRef.current.flyTo({ center: [-5.5, 32], zoom: 15.5, essential: true });
    }
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

  return (
    <div className="absolute inset-0 w-full h-full bg-black">
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
          onMapClick={handleMapClick}
        />
      </Suspense>

      <div className="absolute top-0 left-0 w-full h-full z-10 pointer-events-none">
        {isLoading && isAppReady && (
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white pointer-events-auto">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            <p className="mt-4 font-bold tracking-widest uppercase">
              Syncing Map...
            </p>
          </div>
        )}

        {showIosInstallPopup && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-white p-4 rounded-xl shadow-2xl pointer-events-auto z-50 text-center max-w-sm w-[90%]">
            <p className="text-gray-800 font-medium text-sm mb-3">
              To install, tap the Share icon and then 'Add to Home Screen'.
            </p>
            <button
              onClick={closeIosInstallPopup}
              className="bg-gray-200 px-6 py-2 rounded-full font-bold text-gray-700"
            >
              Close
            </button>
          </div>
        )}

        {isAppReady && (
          <>
            {/* Top Left: Back to Dashboard */}
            <div className="absolute top-4 left-4 pointer-events-auto">
              <Button
                variant="secondary"
                className="bg-gray-900/80 backdrop-blur-md border border-gray-700 shadow-xl hover:bg-gray-800 rounded-full h-12 w-12 p-0 flex items-center justify-center transition-all"
                onClick={() => router.push("/")}
              >
                <ArrowLeft className="h-6 w-6 text-white" />
              </Button>
            </div>

            {/* 🌟 Top Center: Live Search Bar 🌟 */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-full max-w-xs sm:max-w-md px-4 pointer-events-auto z-50">
              <div className="bg-gray-900/80 backdrop-blur-md border border-gray-700 rounded-full flex items-center px-4 h-12 shadow-2xl transition-all focus-within:bg-gray-900 focus-within:border-cyan-500">
                <Search size={18} className="text-cyan-400" />
                <input
                  type="text"
                  placeholder={`Search ${selectedCity?.name || "locations"}...`}
                  className="bg-transparent text-white flex-1 ml-3 outline-none text-sm placeholder-gray-400 font-medium"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery.length > 0 && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="p-1 hover:bg-gray-700 rounded-full transition-colors"
                  >
                    <X size={16} className="text-gray-400" />
                  </button>
                )}
              </div>

              {searchResults.length > 0 && (
                <div className="mt-2 bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-2xl overflow-hidden shadow-2xl">
                  {searchResults.map((pin) => (
                    <button
                      key={pin.id}
                      onClick={() => handleMapSearchSelect(pin)}
                      className="w-full text-left p-4 border-b border-gray-800 flex items-center hover:bg-gray-800 transition-colors"
                    >
                      <div className="bg-cyan-900/40 border border-cyan-500/50 p-2 rounded-full mr-4">
                        <MapPin size={16} className="text-cyan-400" />
                      </div>
                      <div>
                        <p className="text-white font-bold text-sm leading-tight">
                          {pin.name}
                        </p>
                        <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mt-1">
                          {pin.category}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 🌟 Top Right: GTA Minimap 🌟 */}
            <div className="absolute top-4 right-4 w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-gray-800/90 bg-gray-900/80 backdrop-blur-md shadow-2xl overflow-hidden pointer-events-auto flex items-center justify-center">
              {/* Radar Grid overlay */}
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at center, transparent 20%, #000 100%), repeating-linear-gradient(0deg, transparent, transparent 10px, rgba(34,211,238,0.2) 10px, rgba(34,211,238,0.2) 11px), repeating-linear-gradient(90deg, transparent, transparent 10px, rgba(34,211,238,0.2) 10px, rgba(34,211,238,0.2) 11px)",
                }}
              ></div>
              {/* Player Blip */}
              <div className="w-2.5 h-2.5 bg-white rounded-full shadow-[0_0_10px_3px_rgba(255,255,255,0.8)] z-10"></div>
              {/* Vision Cone */}
              <div className="absolute top-1/2 left-1/2 w-0 h-0 border-l-[20px] border-r-[20px] border-b-[35px] border-l-transparent border-r-transparent border-b-white/20 -translate-x-1/2 -translate-y-full origin-bottom"></div>
              <div className="absolute bottom-2 bg-black/80 px-2 py-0.5 rounded border border-gray-700 text-[9px] font-black text-cyan-400 uppercase tracking-widest">
                {selectedCity?.name || "MAP"}
              </div>
            </div>

            {/* Right Side Tools */}
            <div className="absolute top-40 right-4 pointer-events-auto flex flex-col gap-3">
              <button
                onClick={handleGoToUserLocation}
                className="bg-gray-900/80 border border-gray-700 backdrop-blur-md rounded-full h-12 w-12 flex items-center justify-center shadow-lg hover:bg-gray-800 transition-all active:scale-95"
                title="My Location"
              >
                <Crosshair className="h-5 w-5 text-cyan-400" />
              </button>
              <button
                onClick={handleInstallClick}
                className="bg-cyan-500 text-black font-black rounded-full h-12 w-12 flex items-center justify-center shadow-lg hover:bg-cyan-400 transition-all active:scale-95 text-[10px] uppercase tracking-wider"
              >
                APP
              </button>
            </div>

            {/* 🌟 Bottom Dock (Dynamic Island Style) 🌟 */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-auto">
              <div className="bg-gray-900/90 backdrop-blur-lg border border-gray-700 p-2 rounded-full flex items-center gap-2 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
                <button
                  onClick={() => setLocatorOpen(true)}
                  className="h-12 w-12 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-300 transition-colors"
                  title="Change City"
                >
                  <MapPin size={20} />
                </button>
                <button
                  onClick={() => setFilterPanelOpen(true)}
                  className="h-12 px-6 rounded-full bg-cyan-500 hover:bg-cyan-400 flex items-center justify-center text-black font-black transition-colors shadow-lg"
                >
                  <Search size={18} className="mr-2" /> Explore
                </button>
                <button
                  onClick={() => setQuestPanelOpen(true)}
                  className="h-12 w-12 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-300 transition-colors"
                  title="Quests"
                >
                  <Route size={20} />
                </button>
                <button
                  onClick={() => setStoryArchiveOpen(true)}
                  className="h-12 w-12 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-300 transition-colors"
                  title="Stories"
                >
                  <BookOpen size={20} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modals and Panels */}
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
            }}
            onResetView={() => {
              handleResetView();
              setLocatorOpen(false);
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

      {/* ADMIN CREATE PIN MODAL */}
      {isCreatePinModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md pointer-events-auto p-4 transition-all">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-blue-600"></div>
            <div className="flex justify-between items-center mb-6 mt-2">
              <div>
                <h2 className="text-2xl font-black text-white flex items-center gap-2">
                  <MapPin className="text-cyan-400 h-6 w-6" /> Drop New Pin
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
                  className="w-full bg-gray-800/50 text-white px-4 py-4 rounded-xl border border-gray-700 focus:border-cyan-500 outline-none"
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
                  className="w-full bg-gray-800/50 text-white px-4 py-4 rounded-xl border border-gray-700 focus:border-cyan-500 outline-none appearance-none"
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
              {/* NEW IMAGE URL FIELD */}
              <div>
                <label className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 block">
                  Image URL
                </label>
                <input
                  className="w-full bg-gray-800/50 text-white px-4 py-4 rounded-xl border border-gray-700 focus:border-cyan-500 outline-none"
                  placeholder="https://example.com/image.jpg"
                  value={newPinData.image_url}
                  onChange={(e) =>
                    setNewPinData({ ...newPinData, image_url: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 block">
                  Description
                </label>
                <textarea
                  className="w-full bg-gray-800/50 text-white px-4 py-4 rounded-xl border border-gray-700 focus:border-cyan-500 outline-none h-24 resize-none"
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
              className="w-full bg-cyan-500 text-black py-4 rounded-xl font-bold active:bg-cyan-600 flex justify-center items-center gap-2 shadow-[0_0_20px_rgba(34,211,238,0.3)]"
              onClick={handleCreatePin}
              disabled={isSubmittingPin}
            >
              {isSubmittingPin ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
              ) : (
                <>
                  <Check className="h-5 w-5" /> Save to Map
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
