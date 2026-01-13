'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import ProductDetail from '@/components/ProductDetail';
import PinDetailsModal from '@/components/PinDetailsModal';
import Image from 'next/image';
import QuickLocator from '@/components/QuickLocator';
import StoryModal from '@/components/StoryModal';
import FilterPanel from '@/components/FilterPanel';
import QuestPanel from '@/components/QuestPanel';
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import { MapPin, Search, Route, BookOpen, Crosshair, ArrowLeft } from 'lucide-react';
import StoryArchivePanel from '@/components/StoryArchivePanel';
import mapboxgl from 'mapbox-gl'; 
import WelcomeOverlay from '@/components/WelcomeOverlay';

// Hooks
import { usePwaInstall } from '@/hooks/usePwaInstall';
import useMapData from '@/hooks/useMapData';
import useQuests from '@/hooks/useQuests';
import usePinProducts from '@/hooks/usePinProducts';
import useMapInteraction from '@/hooks/useMapInteraction';
import { useRouter } from 'next/navigation'; // Use Next router for web back button

const Map = dynamic(() => import('@/components/Map'), { 
  ssr: false,
  loading: () => null
});

// City Data Constant
const CITY_DATA = {
  'marrakech': { name: 'Marrakech', center: [-7.98, 31.63], storyUrl: '/videos/marrakech_story.mp4' },
  'casablanca': { name: 'Casablanca', center: [-7.59, 33.57], storyUrl: '/videos/casablanca_story.mp4' },
  'rabat': { name: 'Rabat', center: [-6.84, 34.02], storyUrl: '/videos/rabat_story.mp4' },
};

export default function WebMapLogic({ initialCityId }) {
    const router = useRouter();
    
    // --- Initialize state with prop if available ---
    const [selectedCity, setSelectedCity] = useState(
        initialCityId && CITY_DATA[initialCityId] 
        ? CITY_DATA[initialCityId] 
        : CITY_DATA['marrakech']
    );

    const [viewingExperience, setViewingExperience] = useState(null);
    const { showIosInstallPopup, handleInstallClick, closeIosInstallPopup } = usePwaInstall();
    
    const categoryIconMap = {
        39  : 'air-balloon.png',
        37  : 'camel-ride.png',
        38  : 'quad-bike.png', 
        44  : 'food.png',   
        35  : 'monuments.png',  
        45  : 'shopping.png',   
        40  : 'tales.png',  
        42  : 'a-craftsman.png',    
        33  : 'workshops.png',  
        34  : 'cooking-class.png',  
        47  : 'pottery-class.png',  
        48  : 'artisan-class.png',  
        36  : 'adventure1.png', 
    };

    const [isFilterPanelOpen, setFilterPanelOpen] = useState(false);
    const [selectedPin, setSelectedPin] = useState(null);
    const [isLocatorOpen, setLocatorOpen] = useState(false);
    
    const [isStoryModalOpen, setStoryModalOpen] = useState(false);
    const [storyContentUrl, setStoryContentUrl] = useState('');
    const [viewedCities, setViewedCities] = useState(new Set());
    const mapRef = useRef(null);
    const { addToCart } = useCart();

    const handleViewExperience = async (route) => {
        if (!route || !route.stops || route.stops.length === 0) {
            setViewingExperience(null);
            return;
        }
        setQuestPanelOpen(false); 

        const stopIds = route.stops.join(',');
        const apiUrl = `https://data.hyrosy.com/wp-json/wp/v2/locations?acf_format=standard&include=${stopIds}&orderby=include`;
        
        try {
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error('Failed to fetch experience stops');
            const fullStopsData = await response.json();

            const orderedStops = route.stops.map(stopId => 
                fullStopsData.find(stop => stop.id === stopId)
            ).filter(Boolean);

            const experiencePins = orderedStops.map(loc => {
                if (!loc.acf || !loc.acf.gps_coordinates || typeof loc.acf.gps_coordinates !== 'string') {
                    return null;
                }
                const coords = loc.acf.gps_coordinates.match(/-?\d+\.\d+/g);
                if (!coords || coords.length < 2) return null;
                const lat = parseFloat(coords[0]);
                const lng = parseFloat(coords[1]);
                if (isNaN(lat) || isNaN(lng)) return null;
                return { ...loc, id: loc.id, lat, lng };
            }).filter(Boolean);

            setViewingExperience(experiencePins);

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

    const { quests, activeQuest, questStepIndex, exploredSteps, handleQuestSelect, handleQuestStepSelect, handleToggleStepExplored } = useQuests(mapRef, setSelectedPin);
    const modalProducts = usePinProducts(selectedPin);
    const { handleGoToUserLocation, handleGetDirections } = useMapInteraction(mapRef);

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
        if (isAppReady && selectedCity && !viewedCities.has(selectedCity.name.toLowerCase())) {
            setStoryContentUrl(selectedCity.storyUrl);
            setStoryModalOpen(true);
            setViewedCities(prev => new Set(prev).add(selectedCity.name.toLowerCase()));
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
                essential: true
            });
            setTimeout(() => {
                setSelectedPin(pin);
            }, 500);
        }
        setFilterPanelOpen(false);
    };

    return (
      <div className="absolute inset-0 w-full h-full">
        {!isAppReady && (
            <WelcomeOverlay />
        )}
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
        />
        
        <div className="absolute top-0 left-0 w-full h-full z-10 pointer-events-none">
            {isLoading && isAppReady && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white pointer-events-auto">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                    <p className="mt-4">Entering City...</p>
                </div>
            )}

            {showIosInstallPopup && (
                <div className="ios-install-popup">
                    <p>To install, tap the Share icon and then &apos;Add to Home Screen&apos;.</p>
                    <button onClick={closeIosInstallPopup}>Close</button>
                </div>
            )}

            {isAppReady && (
              <>
            {/* Back to Dashboard Button (New for Universal App) */}
            <div className="absolute top-4 left-4 pointer-events-auto">
                 <Button 
                    variant="secondary" 
                    className="bg-white/90 shadow-md hover:bg-white rounded-full h-10 w-10 p-0 flex items-center justify-center"
                    onClick={() => router.push('/')}
                >
                    <ArrowLeft className="h-5 w-5 text-gray-800" />
                 </Button>
            </div>

            <div className="absolute top-1/2 right-4 pointer-events-auto">
            <button
                onClick={handleGoToUserLocation}
                className="bg-white/80 backdrop-blur-sm rounded-full h-12 w-12 flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                title="Go to my location"
            >
                <Crosshair className="h-6 w-6 text-gray-700" />
            </button>
            <button onClick={handleInstallClick} className="bg-white/80 backdrop-blur-sm rounded-full h-12 w-12 flex items-center justify-center shadow-lg hover:bg-white transition-colors mt-2">App</button>
            </div>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 pointer-events-auto flex items-center gap-2">
                <Button 
                    size="icon"
                    variant="secondary"
                    className="h-14 w-14 rounded-full shadow-lg bg-black text-white hover:bg-gray-800 flex-shrink-0"
                    onClick={() => setLocatorOpen(true)}
                    title="Quick Locator"
                >
                    <MapPin className="h-6 w-6" />
                </Button>
                <Button 
                    size="lg"
                    className="w-full shadow-lg rounded-full h-14 text-base font-semibold bg-[#d3bc8e] text-black hover:bg-[#c8b185]" 
                    onClick={() => setFilterPanelOpen(true)}
                >
                    <Search className="h-5 w-5 mr-2" />
                    Filter Pins
                </Button>
                <Button
                size="icon"
                className="h-14 w-14 rounded-full shadow-lg bg-black text-white hover:bg-gray-800 flex-shrink-0"
                onClick={() => setQuestPanelOpen(true)}
                >
                <Route className="h-5 w-5 mr-2" />
                </Button> 
                <Button
                size="icon"
                className="h-14 w-14 rounded-full shadow-lg bg-black text-white hover:bg-gray-800 flex-shrink-0"
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
            onGetDirections={(pin) => handleGetDirections(pin, () => setSelectedPin(null))}
            products={modalProducts.data}
            productsStatus={modalProducts.status}
        />
      </div>
    );
}