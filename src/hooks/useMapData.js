import { useState, useEffect } from 'react';

export default function useMapData(selectedCity) {
  const [allPins, setAllPins] = useState([]);
  const [displayedPins, setDisplayedPins] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [filterData, setFilterData] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Effect 1: Fetch global data (categories) ONCE on startup
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoriesResponse = await fetch('https://data.hyrosy.com/wp-json/wp/v2/location_category?per_page=100');
        if (!categoriesResponse.ok) throw new Error('Failed to fetch categories');
        const categories = await categoriesResponse.json();
        
        setAllCategories(categories);

        // Format data for the filter panel
        const formattedFilters = {};
        const parentCategories = categories.filter(cat => cat.parent === 0);
        parentCategories.forEach(parent => {
          formattedFilters[parent.name] = categories
            .filter(child => child.parent === parent.id)
            .map(child => child.name);
        });
        setFilterData(formattedFilters);
      } catch (error) {
        console.error("Failed to fetch location categories:", error);
        setFilterData({}); // Set to empty on error
      }
    };
    fetchCategories();
  }, []); // Empty array means this runs only once.

  // Effect 2: Fetch city-specific pins whenever selectedCity changes
  useEffect(() => {
    const fetchCityPins = async () => {
      if (!selectedCity) {
        setAllPins([]);
        setDisplayedPins([]);
        return;
      }
      setIsLoading(true);

      const apiUrl = `https://data.hyrosy.com/wp-json/wp/v2/locations?city=${selectedCity.name.toLowerCase()}&per_page=100&_embed&acf_format=standard`;

      try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('API response was not ok.');
        const locations = await response.json();

        const cityPinsData = locations.map(loc => {
          if (!loc.acf || !loc.acf.gps_coordinates) return null;
          const [lat, lng] = loc.acf.gps_coordinates.split(',').map(s => parseFloat(s.trim()));
          if (isNaN(lat) || isNaN(lng)) return null;
          return { ...loc, id: loc.id, lat, lng };
        }).filter(Boolean);

        setAllPins(cityPinsData);
        setDisplayedPins(cityPinsData);
      } catch (error) {
        console.error(`API fetch failed for ${selectedCity.name}:`, error);
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
    const selectedSubCategoryNames = Object.values(selectedSubs).reduce((acc, val) => acc.concat(val), []);
    
    if (selectedSubCategoryNames.length === 0) {
      setDisplayedPins(allPins);
      return;
    }

    const selectedSubCategoryIds = new Set(
      allCategories
        .filter(cat => selectedSubCategoryNames.includes(cat.name))
        .map(cat => cat.id)
    );

    const filtered = allPins.filter(pin => {
      const pinCategoryIds = pin.location_category || [];
      return pinCategoryIds.some(id => selectedSubCategoryIds.has(id));
    });

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
