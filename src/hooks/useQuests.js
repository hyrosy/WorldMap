import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function useQuests(mapRef, setSelectedPin) {
  const [quests, setQuests] = useState([]);
  const [activeQuest, setActiveQuest] = useState(null);
  const [questStepIndex, setQuestStepIndex] = useState(0);

  // We start with an empty set and load from AsyncStorage on mount
  const [exploredSteps, setExploredSteps] = useState(new Set());
  const [isStorageLoaded, setIsStorageLoaded] = useState(false);

  // 1. Asynchronously load saved progress on startup
  useEffect(() => {
    const loadExploredSteps = async () => {
      try {
        const saved = await AsyncStorage.getItem('exploredSteps');
        if (saved) {
          setExploredSteps(new Set(JSON.parse(saved)));
        }
      } catch (error) {
        console.error('Failed to load explored steps:', error);
      } finally {
        setIsStorageLoaded(true);
      }
    };
    loadExploredSteps();
  }, []);

  // 2. Save to AsyncStorage whenever progress changes
  useEffect(() => {
    if (!isStorageLoaded) return; // Prevent overwriting with empty state before loading finishes
    
    const saveExploredSteps = async () => {
      try {
        const stepsArray = Array.from(exploredSteps);
        await AsyncStorage.setItem('exploredSteps', JSON.stringify(stepsArray));
      } catch (error) {
        console.error('Failed to save explored steps:', error);
      }
    };
    saveExploredSteps();
  }, [exploredSteps, isStorageLoaded]);

  // Fetch Official Quests (Leaving this mapped to WP until you migrate Quests to Supabase)
  useEffect(() => {
    const fetchQuests = async () => {
      const apiUrl = 'https://data.hyrosy.com/wp-json/wp/v2/quests?acf_format=standard';
      try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('API response was not ok.');
        const questsData = await response.json();
        setQuests(questsData);
      } catch (error) {
        console.error('Failed to fetch quests:', error);
      }
    };
    fetchQuests();
  }, []);

  const handleQuestSelect = (quest) => {
    setActiveQuest(quest);
    setQuestStepIndex(0); // Reset to the first step when a new quest is selected
  };

  const handleQuestStepSelect = (step, index) => {
    setQuestStepIndex(index);
    setSelectedPin(step); // Show the pin details in the modal

    if (step && mapRef.current) {
      // 3. Handle both Supabase (lat/lng) and Old WP (acf.gps_coordinates) data shapes
      let lat, lng;
      
      if (step.lat !== undefined && step.lng !== undefined) {
          lat = parseFloat(step.lat);
          lng = parseFloat(step.lng);
      } else if (step.acf && step.acf.gps_coordinates) {
          const coords = step.acf.gps_coordinates.split(',').map(s => parseFloat(s.trim()));
          lat = coords[0];
          lng = coords[1];
      }

      // 4. Universal Camera Movement
      if (lat !== undefined && lng !== undefined) {
        if (Platform.OS === 'web') {
          // Web Mapbox GL
          mapRef.current.flyTo({
            center: [lng, lat],
            zoom: 16,
            pitch: 60,
            speed: 1.0,
            essential: true,
          });
        } else {
          // Native Mapbox (@rnmapbox/maps)
          mapRef.current.setCamera({
            centerCoordinate: [lng, lat],
            zoomLevel: 16,
            pitch: 60,
            animationDuration: 1000,
          });
        }
      }
    }
  };

  const handleToggleStepExplored = (stepId) => {
    setExploredSteps(prevExplored => {
      const newExplored = new Set(prevExplored);
      if (newExplored.has(stepId)) {
        newExplored.delete(stepId);
      } else {
        newExplored.add(stepId);
      }
      return newExplored;
    });
  };

  return {
    quests,
    activeQuest,
    questStepIndex,
    exploredSteps,
    handleQuestSelect,
    handleQuestStepSelect,
    handleToggleStepExplored,
  };
}