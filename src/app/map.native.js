import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

// --- ICONS (Native Versions) ---
import { MapPin, Search, Route as RouteIcon, BookOpen, Crosshair, ArrowLeft } from 'lucide-react-native';

// --- COMPONENTS ---
// We assume these have been/will be converted to Native as well
import UniversalMap from '@/components/UniversalMap';
import QuickLocator from '@/components/QuickLocator';
import FilterPanel from '@/components/FilterPanel';
import QuestPanel from '@/components/QuestPanel';
import StoryArchivePanel from '@/components/StoryArchivePanel';
import PinDetailsModal from '@/components/PinDetailsModal';
import WelcomeOverlay from '@/components/WelcomeOverlay';

// --- HOOKS ---
import { useCart } from "@/context/CartContext";
import useMapData from '@/hooks/useMapData';
import useQuests from '@/hooks/useQuests';
import usePinProducts from '@/hooks/usePinProducts';
import useMapInteraction from '@/hooks/useMapInteraction';

// --- CONSTANTS ---
const CITY_DATA = {
  'marrakech': { name: 'Marrakech', center: [-7.98, 31.63], storyUrl: '/videos/marrakech_story.mp4' },
  'casablanca': { name: 'Casablanca', center: [-7.59, 33.57], storyUrl: '/videos/casablanca_story.mp4' },
  'rabat': { name: 'Rabat', center: [-6.84, 34.02], storyUrl: '/videos/rabat_story.mp4' },
};

export default function MapScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const initialCityId = params.city;

    // --- STATE ---
    const [selectedCity, setSelectedCity] = useState(
        initialCityId && CITY_DATA[initialCityId] 
        ? CITY_DATA[initialCityId] 
        : CITY_DATA['marrakech']
    );

    const [viewingExperience, setViewingExperience] = useState(null);
    const [isFilterPanelOpen, setFilterPanelOpen] = useState(false);
    const [selectedPin, setSelectedPin] = useState(null);
    const [isLocatorOpen, setLocatorOpen] = useState(false);
    
    // Story State
    const [isStoryModalOpen, setStoryModalOpen] = useState(false);
    const [storyContentUrl, setStoryContentUrl] = useState('');
    const [viewedCities, setViewedCities] = useState(new Set());
    
    // App Readiness
    const [isAppReady, setAppReady] = useState(false);
    const [isMapLoaded, setMapLoaded] = useState(false); // Track if Native Map is ready
    
    // Panel State
    const [isQuestPanelOpen, setQuestPanelOpen] = useState(false);
    const [isStoryArchiveOpen, setStoryArchiveOpen] = useState(false); 
    const [initialStoryId, setInitialStoryId] = useState(null);

    // Refs & Hooks
    const mapRef = useRef(null); // This will now hold the NATIVE Mapbox ref
    const { addToCart } = useCart();

    // --- DATA HOOKS ---
    // (Ensure these hooks do NOT use 'window' or 'document' internally)
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
        handleToggleStepExplored 
    } = useQuests(mapRef, setSelectedPin);

    const modalProducts = usePinProducts(selectedPin);
    const { handleGoToUserLocation, handleGetDirections } = useMapInteraction(mapRef);

    // --- EFFECTS ---

    // 1. App Ready Timer
    useEffect(() => {
        const readyTimer = setTimeout(() => {
            setAppReady(true);
        }, 4000); 
        return () => clearTimeout(readyTimer);
    }, []);

    // 2. City Change / Camera FlyTo
    useEffect(() => {
        if (!isAppReady || !mapRef.current) return;
        
        // Note: Native Mapbox often uses 'cameraRef' or methods on the MapView.
        // You might need to adjust this depending on how you implemented NativeMap.js
        if (selectedCity) {
             // Example for @rnmapbox/maps:
             // mapRef.current.setCamera({
             //    centerCoordinate: selectedCity.center,
             //    zoomLevel: 12,
             //    animationDuration: 2000,
             // });
        } else {
             handleResetView();
        }
    }, [isAppReady, selectedCity]); 

    // 3. Auto-open Story when entering city
    useEffect(() => {
        if (isAppReady && selectedCity && !viewedCities.has(selectedCity.name.toLowerCase())) {
            setStoryContentUrl(selectedCity.storyUrl);
            setStoryModalOpen(true);
            setViewedCities(prev => new Set(prev).add(selectedCity.name.toLowerCase()));
        }
    }, [isAppReady, selectedCity, viewedCities]);

    // --- HANDLERS ---

    const handleViewExperience = async (route) => {
        // ... (Keep your existing fetch logic here, fetch works in RN) ...
        // For brevity, using the same logic as your web file
        if (!route || !route.stops || route.stops.length === 0) {
            setViewingExperience(null);
            return;
        }
        setQuestPanelOpen(false); 
        // ... Logic to fetch stops ...
        // Ensure you setViewingExperience(experiencePins) at the end
    };

    const handleReadStory = (storyId) => {
        setInitialStoryId(storyId); 
        setStoryArchiveOpen(true);  
        setSelectedPin(null);       
    };

    const handleCitySelect = (cityKey) => {
        setSelectedCity(CITY_DATA[cityKey]);
    };

    const handleResetView = () => {
        if (mapRef.current) {
            // Native Mapbox Reset View Logic
            // mapRef.current.setCamera({ ... })
        }
        setSelectedCity(null);
    };

    const handleSearchResultSelect = (pin) => {
         if (mapRef.current && pin.lat && pin.lng) {
            // Native flyTo logic
            // mapRef.current.setCamera({ centerCoordinate: [pin.lng, pin.lat], zoomLevel: 15 });
            
            setTimeout(() => {
                setSelectedPin(pin);
            }, 500);
        }
        setFilterPanelOpen(false);
    };

    return (
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        
        {/* 1. THE MAP LAYER */}
        {/* We pass props down to UniversalMap so it can render markers on Native */}
        <View style={StyleSheet.absoluteFill}>
            <UniversalMap 
                mapRef={mapRef}
                city={selectedCity ? selectedCity.id : null} // Pass ID or object depending on your implementation
                pins={displayedPins} // NativeMap needs to render these
                onPinClick={setSelectedPin}
                onMapLoad={(ref) => { 
                    mapRef.current = ref;
                    setMapLoaded(true);
                }}
                route={viewingExperience}
            />
        </View>

        {/* 2. LOADING & WELCOME OVERLAYS */}
        {!isAppReady && <WelcomeOverlay />}

        {isLoading && isAppReady && (
             <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.loadingText}>Entering City...</Text>
            </View>
        )}

        {/* 3. UI CONTROLS LAYER (Pointer events handled naturally in RN) */}
        {isAppReady && (
          <SafeAreaView style={styles.uiLayer} pointerEvents="box-none">
            
            {/* Top Left: Back Button */}
            <View style={styles.topLeft}>
                 <TouchableOpacity 
                    style={styles.circleButton}
                    onPress={() => router.back()}
                >
                    <ArrowLeft size={24} color="#1f2937" />
                 </TouchableOpacity>
            </View>

            {/* Top Right: User Location & Install (Install removed for Native) */}
            <View style={styles.topRight}>
                <TouchableOpacity
                    onPress={handleGoToUserLocation}
                    style={styles.circleButton}
                >
                    <Crosshair size={24} color="#374151" />
                </TouchableOpacity>
            </View>

            {/* Bottom Controls */}
            <View style={styles.bottomControls}>
                <TouchableOpacity 
                    style={styles.iconButton}
                    onPress={() => setLocatorOpen(true)}
                >
                    <MapPin size={24} color="white" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                    style={styles.filterButton} 
                    onPress={() => setFilterPanelOpen(true)}
                >
                    <Search size={20} color="black" style={{ marginRight: 8 }} />
                    <Text style={styles.filterButtonText}>Filter Pins</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => setQuestPanelOpen(true)}
                >
                    <RouteIcon size={24} color="white" />
                </TouchableOpacity> 
                
                <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => setStoryArchiveOpen(true)}
                >   
                    <BookOpen size={24} color="white" />
                </TouchableOpacity>       
            </View>

          </SafeAreaView>
        )}
    
        {/* 4. MODALS & PANELS (Rendered on top) */}
        
        {/* Quick Locator Modal */}
        {isLocatorOpen && (
             <QuickLocator 
                isOpen={isLocatorOpen} 
                onClose={() => setLocatorOpen(false)}
                cities={CITY_DATA} 
                onCitySelect={handleCitySelect} 
                onResetView={handleResetView} 
            />
        )}

        <QuestPanel
            isOpen={isQuestPanelOpen}
            onClose={() => setQuestPanelOpen(false)}
            // Pass necessary props...
            quests={quests}
            activeQuest={activeQuest}
            onQuestSelect={handleQuestSelect}
            // ...
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
            // ...
        />

        <PinDetailsModal 
            pin={selectedPin}
            isOpen={!!selectedPin}
            onClose={() => setSelectedPin(null)}
            onAddToCart={addToCart}
            onReadStory={handleReadStory}
            products={modalProducts?.data}
        />

      </View>
    );
}

const styles = StyleSheet.create({
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 20,
    },
    loadingText: {
        marginTop: 10,
        color: 'white',
        fontWeight: 'bold',
    },
    uiLayer: {
        flex: 1,
        justifyContent: 'space-between',
    },
    topLeft: {
        position: 'absolute',
        top: 60, // Adjust for status bar
        left: 20,
    },
    topRight: {
        position: 'absolute',
        top: 60,
        right: 20,
        alignItems: 'center',
    },
    bottomControls: {
        position: 'absolute',
        bottom: 30,
        left: 20,
        right: 20,
        flexDirection: 'row',
        justifyContent: 'space-between', // Or 'center' with gap
        alignItems: 'center',
        gap: 10,
    },
    circleButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    iconButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 5,
    },
    filterButton: {
        flex: 1,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#d3bc8e',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 5,
        maxWidth: 200,
    },
    filterButtonText: {
        color: 'black',
        fontWeight: '600',
        fontSize: 16,
    }
});