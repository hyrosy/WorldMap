import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabaseClient'; // <-- ADDED for Supabase queries

// --- ICONS (Native Versions) ---
import { MapPin, Search, Route as RouteIcon, BookOpen, Crosshair, ArrowLeft } from 'lucide-react-native';

// --- COMPONENTS ---
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
    const [isMapLoaded, setMapLoaded] = useState(false); 
    
    // Panel State
    const [isQuestPanelOpen, setQuestPanelOpen] = useState(false);
    const [isStoryArchiveOpen, setStoryArchiveOpen] = useState(false); 
    const [initialStoryId, setInitialStoryId] = useState(null);

    // Refs & Hooks
    const mapRef = useRef(null); 
    const { addToCart } = useCart();

    // --- DATA HOOKS ---
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
    const { handleGoToUserLocation, handleGetDirections, userLocation, directionsRoute } = useMapInteraction(mapRef);

    // --- EFFECTS ---

    // 1. App Ready Timer
    useEffect(() => {
        const readyTimer = setTimeout(() => {
            setAppReady(true);
        }, 4000); 
        return () => clearTimeout(readyTimer);
    }, []);

    // 2. Auto-open Story when entering city
    useEffect(() => {
        if (isAppReady && selectedCity && !viewedCities.has(selectedCity.name.toLowerCase())) {
            setStoryContentUrl(selectedCity.storyUrl);
            setStoryModalOpen(true);
            setViewedCities(prev => new Set(prev).add(selectedCity.name.toLowerCase()));
        }
    }, [isAppReady, selectedCity, viewedCities]);

    // --- HANDLERS ---

    // UPDATED: Now queries Supabase for Native mobile custom maps!
    const handleViewExperience = async (route) => {
        if (!route || !route.user_map_pins || route.user_map_pins.length === 0) {
            setViewingExperience(null);
            return;
        }
        setQuestPanelOpen(false); 

        try {
            const locationIds = route.user_map_pins.map(p => p.location_id);
            const { data: locations, error } = await supabase
                .from('locations')
                .select('*')
                .in('id', locationIds);

            if (error) throw error;

            const orderedPins = route.user_map_pins
                .sort((a, b) => a.order_index - b.order_index)
                .map(pinRecord => locations.find(loc => loc.id === pinRecord.location_id))
                .filter(Boolean);

            setViewingExperience(orderedPins);
        } catch (error) {
            console.error("Error fetching experience details:", error);
        }
    };

    const handleReadStory = (storyId) => {
        setInitialStoryId(storyId); 
        setStoryArchiveOpen(true);  
        setSelectedPin(null);       
    };

    const handleCitySelect = (cityKey) => {
        setSelectedCity(CITY_DATA[cityKey]);
    };

    // UPDATED: Native Mapbox Camera Reset
    const handleResetView = () => {
        if (mapRef.current) {
            mapRef.current.setCamera({
                centerCoordinate: [-5.5, 32],
                zoomLevel: 5.5,
                animationDuration: 1500,
            });
        }
        setSelectedCity(null);
    };

    // UPDATED: Native Mapbox Camera FlyTo Pin
    const handleSearchResultSelect = (pin) => {
         if (mapRef.current && pin.lat && pin.lng) {
            mapRef.current.setCamera({ 
                centerCoordinate: [pin.lng, pin.lat], 
                zoomLevel: 15,
                animationDuration: 1000 
            });
            
            setTimeout(() => {
                setSelectedPin(pin);
            }, 500);
        }
        setFilterPanelOpen(false);
    };

    return (
      <View style={{ flex: 1, backgroundColor: '#111827' }}>
        
        {/* 1. THE MAP LAYER */}
        <View style={StyleSheet.absoluteFill}>
            <UniversalMap 
                mapRef={mapRef}
                city={selectedCity ? selectedCity.id : null}
                pins={displayedPins} 
                onPinClick={setSelectedPin}
                onMapLoad={(ref) => { 
                    mapRef.current = ref;
                    setMapLoaded(true);
                }}
                userLocation={userLocation}           
                directionsRoute={directionsRoute}     
                route={viewingExperience}
            />
        </View>

        {/* 2. LOADING & WELCOME OVERLAYS */}
        {!isAppReady && <WelcomeOverlay />}

        {isLoading && isAppReady && (
             <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#22d3ee" />
                <Text style={styles.loadingText}>Entering City...</Text>
            </View>
        )}

        {/* 3. UI CONTROLS LAYER */}
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

            {/* Top Right: User Location */}
            <View style={styles.topRight}>
                <TouchableOpacity
                    onPress={handleGoToUserLocation}
                    style={styles.circleButton}
                >
                    <Crosshair size={24} color="#1f2937" />
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
    
        {/* 4. MODALS & PANELS */}
        
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
            products={modalProducts?.data}
            productsStatus={modalProducts?.status}
        />

      </View>
    );
}

const styles = StyleSheet.create({
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(17, 24, 39, 0.7)', // Darker, theme-matching overlay
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 20,
    },
    loadingText: {
        marginTop: 12,
        color: '#22d3ee', // Cyan accent
        fontWeight: 'bold',
        fontSize: 16,
    },
    uiLayer: {
        flex: 1,
        justifyContent: 'space-between',
    },
    topLeft: {
        position: 'absolute',
        top: 60, 
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
        justifyContent: 'space-between',
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
        backgroundColor: '#111827', // Tailwind gray-900
        borderWidth: 1,
        borderColor: '#374151', // Tailwind gray-700
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 5,
        elevation: 6,
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
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 5,
        elevation: 6,
        maxWidth: 200,
    },
    filterButtonText: {
        color: 'black',
        fontWeight: 'bold',
        fontSize: 16,
    }
});