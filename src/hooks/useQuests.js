import { useState, useEffect } from 'react';

export default function useQuests(mapRef, setSelectedPin) {
  const [quests, setQuests] = useState([]);
  const [activeQuest, setActiveQuest] = useState(null);
  const [questStepIndex, setQuestStepIndex] = useState(0);

  // State for tracking explored steps with localStorage persistence
  const [exploredSteps, setExploredSteps] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('exploredSteps');
      if (saved) {
        return new Set(JSON.parse(saved));
      }
    }
    return new Set();
  });

  // Effect to fetch quests once on initial load
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

  // Effect to save explored steps to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stepsArray = Array.from(exploredSteps);
      window.localStorage.setItem('exploredSteps', JSON.stringify(stepsArray));
    }
  }, [exploredSteps]);

  const handleQuestSelect = (quest) => {
    setActiveQuest(quest);
    setQuestStepIndex(0); // Reset to the first step when a new quest is selected
  };

  const handleQuestStepSelect = (step, index) => {
    setQuestStepIndex(index);
    setSelectedPin(step); // Show the pin details in the modal

    // Fly to the pin's location on the map
    if (step && mapRef.current) {
      const [lat, lng] = step.acf.gps_coordinates.split(',').map(s => parseFloat(s.trim()));
      mapRef.current.flyTo({
        center: [lng, lat],
        zoom: 16,
        pitch: 60,
        speed: 1.0,
        essential: true,
      });
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
