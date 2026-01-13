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
import { MapPin, Search, Route, BookOpen, Crosshair } from 'lucide-react'; // Add Route here
import StoryArchivePanel from '@/components/StoryArchivePanel';
import mbxDirections from '@mapbox/mapbox-sdk/services/directions'; // Add this import at the top
import mapboxgl from 'mapbox-gl'; 
import WelcomeOverlay from '@/components/WelcomeOverlay'; // The import stays the same


// --- OUR CUSTOM HOOKS ---
import { usePwaInstall } from '@/hooks/usePwaInstall'; // --- 1. IMPORT THE NEW HOOK ---
import useMapData from '@/hooks/useMapData'; // Changed to default import
import useQuests from '@/hooks/useQuests';
import usePinProducts from '@/hooks/usePinProducts';
import useMapInteraction from '@/hooks/useMapInteraction';



const Map = dynamic(() => import('@/components/Map'), { 
  ssr: false,
  loading: () => null // We have our own loading screen now
});

export default function Home() {

    // --- NEW: State to hold the experience being viewed ---
    const [viewingExperience, setViewingExperience] = useState(null);
    // --- PWA INSTALL HOOK ---
    const { showIosInstallPopup, handleInstallClick, closeIosInstallPopup } = usePwaInstall();
    
    const cityData = {
    'marrakech': { name: 'Marrakech', center: [-7.98, 31.63], storyUrl: '/videos/marrakech_story.mp4' },
    'casablanca': { name: 'Casablanca', center: [-7.59, 33.57], storyUrl: '/videos/casablanca_story.mp4' },
    'rabat': { name: 'Rabat', center: [-6.84, 34.02], storyUrl: '/videos/rabat_story.mp4' },
    };

    const categoryIconMap = {
        39	: 'air-balloon.png',	//	air-balloon
        37	: 'camel-ride.png',	//	camel-ride
        38	: 'quad-bike.png',	//	quad-bike
        44	: 'food.png',	//	food
        35	: 'monuments.png',	//	monuments
        45	: 'shopping.png',	//	shopping
        40	: 'tales.png',	//	tales
        42	: 'a-craftsman.png',	//	a-craftsman
        33	: 'workshops.png',	//	workshops
        34	: 'cooking-class.png',	//	cooking-class
        47	: 'pottery-class.png',	//	pottery-class
        48	: 'artisan-class.png',	//	artisan-class
        36	: 'adventure1.png',	//	adventure
    };

    const [isFilterPanelOpen, setFilterPanelOpen] = useState(false);
    const [selectedPin, setSelectedPin] = useState(null);
    const [isLocatorOpen, setLocatorOpen] = useState(false);
    const [selectedCity, setSelectedCity] = useState(cityData['marrakech']); // Start with no city selected
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
                
                // --- ROBUST PARSING LOGIC ---
                // This regex finds numbers (including negative and decimals) in the string
                const coords = loc.acf.gps_coordinates.match(/-?\d+\.\d+/g);

                if (!coords || coords.length < 2) {
                    return null; // Could not find two numbers
                }
                
                const lat = parseFloat(coords[0]);
                const lng = parseFloat(coords[1]);
                
                if (isNaN(lat) || isNaN(lng)) {
                    return null;
                }
                
                return { ...loc, id: loc.id, lat, lng };
            }).filter(Boolean);

            setViewingExperience(experiencePins);

        } catch (error) {
            console.error("Error fetching experience details:", error);
        }
    };

    // --- USE THE MAP DATA HOOK (selectedCity is now initialized) ---
    const {
        isLoading,
        allPins,
        displayedPins,
        filterData,
        handleFilter,
        handleReset,
    } = useMapData(selectedCity);
    // --- QUESTS HOOK ---
    const { quests, activeQuest, questStepIndex, exploredSteps, handleQuestSelect, handleQuestStepSelect, handleToggleStepExplored } = useQuests(mapRef, setSelectedPin);
    // --- PIN PRODUCTS HOOK ---
    const modalProducts = usePinProducts(selectedPin);
    // --- MAP INTERACTION HOOK ---
    const { handleGoToUserLocation, handleGetDirections } = useMapInteraction(mapRef);

    const [isQuestPanelOpen, setQuestPanelOpen] = useState(false);
    const [isStoryArchiveOpen, setStoryArchiveOpen] = useState(false); 
    const [initialStoryId, setInitialStoryId] = useState(null);

    // --- FIX: Add state to track if the map is loaded ---
    const [isAppReady, setAppReady] = useState(false);
    const [isMapLoaded, setMapLoaded] = useState(false);


    // Determines when the app is ready based on data loading and animation finishing
    useEffect(() => {
        // After 4 seconds, the app is considered ready.
        const readyTimer = setTimeout(() => {
            setAppReady(true);
        }, 4000); 

        return () => clearTimeout(readyTimer);
    }, []);

    // --- FIX: New effect to handle the initial map view ---
    useEffect(() => {
        // Don't do anything until the app is ready and the map is available.
        if (!isAppReady || !mapRef.current) return;

        if (selectedCity) {
            // If a user has selected a city, fly there.
            mapRef.current.flyTo({
                center: selectedCity.center,
                zoom: 12,
                pitch: 75,
                essential: true,
            });
        } else {
            // Otherwise (including the very first time), show the "View All Morocco" view.
            handleResetView();
        }
    }, [isAppReady, selectedCity]); // It runs when the map loads OR when the city changes

    
    // --- ADDITION: Function to open the story panel from the pin modal ---
    const handleReadStory = (storyId) => {
        setInitialStoryId(storyId); // Set the specific story to show
        setStoryArchiveOpen(true);  // Open the main panel
        setSelectedPin(null);       // Close the pin modal
    };

    // --- ADDITION: Function to handle closing the story panel ---
    const handleCloseStoryArchive = () => {
        setStoryArchiveOpen(false);
        setInitialStoryId(null); // Reset the specific story ID
    };


    const handleCitySelect = (cityKey) => {
    setSelectedCity(cityData[cityKey]);
    };

    

useEffect(() => {
    // This effect runs when the city changes OR when the viewedCities set is updated
    if (isAppReady && selectedCity && !viewedCities.has(selectedCity.name.toLowerCase())) {
            setStoryContentUrl(selectedCity.storyUrl);
            setStoryModalOpen(true);
            setViewedCities(prev => new Set(prev).add(selectedCity.name.toLowerCase()));
        }
    }, [isAppReady, selectedCity, viewedCities]);

    const handleResetView = () => {
        // Only proceed if the map has confirmed it is loaded.
        if (mapRef.current && isMapLoaded) {
            mapRef.current.flyTo({
                center: [-5.5, 32],
                zoom: 15.5,
                essential: true,
            });
        } else {
            console.warn("Reset view called, but map is not ready yet.");
        }
        setSelectedCity(null);
    };

    

    // --- ADDITION: Handle when a user clicks a search result ---
    const handleSearchResultSelect = (pin) => {
    if (mapRef.current && pin.lat && pin.lng) {
        const map = mapRef.current;
        map.flyTo({
            center: [pin.lng, pin.lat], // Use the lat/lng we added during fetching
            zoom: 15,
            essential: true
        });

        // Set a slight delay to allow the map to pan before the modal opens
        setTimeout(() => {
            setSelectedPin(pin);
        }, 500);
    } else {
        
    }
    // You also need to close the filter panel
    setFilterPanelOpen(false);
};

    return (
      <main className="absolute inset-0">
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
                console.log("Map component has loaded!"); // Debugging log
                mapRef.current = mapInstance;
                setMapLoaded(true);
             }}
            experienceRoute={viewingExperience}
        />
        
        {/* This is a dedicated container for ALL UI elements that sits ON TOP of the map */}
        <div className="absolute top-0 left-0 w-full h-full z-10 pointer-events-none">
            {/* Loading Overlay */}
            {isLoading && isAppReady && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white pointer-events-auto">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                    <p className="mt-4">Entering City...</p>
                </div>
                
            )}

            {/* A simple modal to show iOS instructions */}
            {showIosInstallPopup && (
                <div className="ios-install-popup">
                    <p>To install, tap the Share icon and then &apos;Add to Home Screen&apos;.</p>
                    {/* --- 4. UPDATE the onClick handler --- */}
                    <button onClick={closeIosInstallPopup}>Close</button>
                </div>
            )}

            {isAppReady && (
              <>

            <div className="absolute top-1/2 right-4 pointer-events-auto">
            <button
                onClick={handleGoToUserLocation} // We will create this function next
                className="bg-white/80 backdrop-blur-sm rounded-full h-12 w-12 flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                title="Go to my location"
            >
                <Crosshair className="h-6 w-6 text-gray-700" />
            </button>

            {/* Add the "Install" button somewhere in your UI */}
            <button onClick={handleInstallClick} className="bg-white/80 backdrop-blur-sm rounded-full h-12 w-12 flex items-center justify-center shadow-lg hover:bg-white transition-colors">App</button>
            </div>

            {/* Bottom-center controls */}
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
                {/* --- ADDITION: New Story Archive Button --- */}
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

        {/* {isStoryModalOpen && <StoryModal videoUrl={storyContentUrl} onClose={() => setStoryModalOpen(false)} />} */}
    
        {isLocatorOpen && (
    <>
        <div 
            className="fixed inset-0 z-40" // Simplified backdrop
            onClick={() => setLocatorOpen(false)}
            
        />
        <QuickLocator 
            isOpen={isLocatorOpen} // <-- PASS THE PROP HERE
            onClose={() => setLocatorOpen(false)}
            cities={cityData} 
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
            onToggleStepExplored={handleToggleStepExplored} // Pass the new handler down
            exploredSteps={exploredSteps} // Pass the explored steps set down       
            isOpen={isQuestPanelOpen}
            onClose={() => setQuestPanelOpen(false)}
            quests={quests}
            activeQuest={activeQuest}
            onQuestSelect={handleQuestSelect} // Use the new handler
            currentStepIndex={questStepIndex} // Pass the state down
            onStepSelect={handleQuestStepSelect} // Pass the handler down
            selectedCity={selectedCity}
            allPins={allPins}
            onViewExperience={handleViewExperience}
        />

        {/* --- ADDITION: Render the StoryArchivePanel --- */}
        <StoryArchivePanel 
            isOpen={isStoryArchiveOpen}
            onClose={() => setStoryArchiveOpen(false)}
            initialStoryId={initialStoryId} // Pass the specific story ID to open
        />


        <FilterPanel
            isOpen={isFilterPanelOpen}
            onClose={() => setFilterPanelOpen(false)}
            filterData={filterData}
            onFilter={handleFilter}
            onReset={handleReset}
            allPins={allPins} // Pass all pins for searching
            onSearchResultSelect={handleSearchResultSelect} // Pass the handler function
        />


        {/* --- Use the new, refactored modal here --- */}
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
    
      </main>
    );
}