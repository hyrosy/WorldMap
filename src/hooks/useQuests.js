import { useState, useEffect } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabaseClient";

export default function useQuests(mapRef, setSelectedPin) {
  const [quests, setQuests] = useState([]);
  const [activeQuest, setActiveQuest] = useState(null);
  const [questStepIndex, setQuestStepIndex] = useState(0);

  const [exploredSteps, setExploredSteps] = useState(new Set());
  const [isStorageLoaded, setIsStorageLoaded] = useState(false);

  // 1. Load saved progress on startup
  useEffect(() => {
    const loadExploredSteps = async () => {
      try {
        const saved = await AsyncStorage.getItem("exploredSteps");
        if (saved) {
          setExploredSteps(new Set(JSON.parse(saved)));
        }
      } catch (error) {
        console.error("Failed to load explored steps:", error);
      } finally {
        setIsStorageLoaded(true);
      }
    };
    loadExploredSteps();
  }, []);

  // 2. Save progress whenever it changes
  useEffect(() => {
    if (!isStorageLoaded) return;
    const saveExploredSteps = async () => {
      try {
        const stepsArray = Array.from(exploredSteps);
        await AsyncStorage.setItem("exploredSteps", JSON.stringify(stepsArray));
      } catch (error) {
        console.error("Failed to save explored steps:", error);
      }
    };
    saveExploredSteps();
  }, [exploredSteps, isStorageLoaded]);

  // 3. THE NEW SUPABASE FETCH
  useEffect(() => {
    const fetchQuests = async () => {
      try {
        // Fetch quests and use a relational join to grab the actual location data for each step
        const { data, error } = await supabase
          .from("quests")
          .select(
            `
            id,
            title,
            description,
            city,
            image_url,
            quest_type,
            is_pro,
            quest_steps (
              step_order,
              locations (*)
            )
          `
          )
          .order("created_at", { ascending: false });

        if (error) throw error;

        // Format it so the frontend panel gets a clean array of `steps` just like it used to
        const formattedQuests = data.map((quest) => {
          const sortedSteps = quest.quest_steps
            .sort((a, b) => a.step_order - b.step_order)
            .map((step) => step.locations)
            .filter(Boolean); // Strip out nulls

          return {
            ...quest,
            steps: sortedSteps,
          };
        });

        setQuests(formattedQuests);
      } catch (error) {
        console.error("Failed to fetch Supabase quests:", error);
      }
    };
    fetchQuests();
  }, []);

  const handleQuestSelect = (quest) => {
    setActiveQuest(quest);
    setQuestStepIndex(0);
  };

  const handleQuestStepSelect = (step, index) => {
    setQuestStepIndex(index);
    setSelectedPin(step);

    // 4. Cleaned up Camera Movement
    if (step && step.lat !== undefined && step.lng !== undefined) {
      const lat = parseFloat(step.lat);
      const lng = parseFloat(step.lng);

      if (Platform.OS === "web") {
        mapRef.current.flyTo({
          center: [lng, lat],
          zoom: 16,
          pitch: 60,
          speed: 1.0,
          essential: true,
        });
      } else {
        mapRef.current.setCamera({
          centerCoordinate: [lng, lat],
          zoomLevel: 16,
          pitch: 60,
          animationDuration: 1000,
        });
      }
    }
  };

  const handleToggleStepExplored = (stepId) => {
    setExploredSteps((prevExplored) => {
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
