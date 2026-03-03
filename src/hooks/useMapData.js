import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function useMapData(selectedCity) {
  const [allPins, setAllPins] = useState([]);
  const [displayedPins, setDisplayedPins] = useState([]);
  const [filterData, setFilterData] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Fetch city-specific pins whenever selectedCity changes
  useEffect(() => {
    const fetchCityPins = async () => {
      if (!selectedCity) {
        setAllPins([]);
        setDisplayedPins([]);
        return;
      }
      setIsLoading(true);

      try {
        // Fetch from Supabase. 
        // RLS automatically filters out unapproved custom pins!
        const { data: locations, error } = await supabase
          .from('locations')
          .select('*')
          .ilike('city', selectedCity.name); // Case-insensitive match for city

        if (error) throw error;

        // Clean up the data (ensure lat/lng exist)
        const validPins = (locations || []).filter(loc => loc.lat && loc.lng);

        setAllPins(validPins);
        setDisplayedPins(validPins);

        // Dynamically build the Filter Panel categories based on the pins in this city
        const uniqueCategories = [...new Set(validPins.map(pin => pin.category).filter(Boolean))];
        setFilterData({
          "Explore": uniqueCategories // Groups them under an "Explore" accordion
        });

      } catch (error) {
        console.error(`Supabase fetch failed for ${selectedCity.name}:`, error);
        setAllPins([]);
        setDisplayedPins([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCityPins();
  }, [selectedCity]);

  // Filtering Logic
  const handleFilter = (selectedSubs) => {
    // selectedSubs looks like { "Explore": ["Restaurants", "Monuments"] }
    const selectedCategories = Object.values(selectedSubs).flat();
    
    if (selectedCategories.length === 0) {
      setDisplayedPins(allPins);
      return;
    }

    // Filter the pins matching the selected categories
    const filtered = allPins.filter(pin => selectedCategories.includes(pin.category));
    setDisplayedPins(filtered);
  };

  const handleReset = () => {
    setDisplayedPins(allPins);
  };

  return {
    isLoading,
    allPins,
    displayedPins,
    filterData,
    handleFilter,
    handleReset,
  };
}