'use client';

import { createContext, useContext, useState } from 'react';

const RouteBuilderContext = createContext();

export const RouteBuilderProvider = ({ children }) => {
  const [stops, setStops] = useState([]); // This will hold the array of pin objects

  // Adds a pin to the route, preventing duplicates
  const addStop = (pin) => {
    setStops((prevStops) => {
      // Check if the pin is already in the list
      if (prevStops.find(stop => stop.id === pin.id)) {
        // Here you could show a notification that it's already added
        console.log("Location already in the current experience.");
        return prevStops;
      }
      return [...prevStops, pin];
    });
  };

  // Removes a pin from the route
  const removeStop = (pinId) => {
    setStops((prevStops) => prevStops.filter(stop => stop.id !== pinId));
  };

  // Clears the entire route after saving or canceling
  const clearRoute = () => {
    setStops([]);
  };

  const value = {
    stops,
    addStop,
    removeStop,
    clearRoute,
  };

  return (
    <RouteBuilderContext.Provider value={value}>
      {children}
    </RouteBuilderContext.Provider>
  );
};

// Custom hook to easily access the context
export const useRouteBuilder = () => {
  const context = useContext(RouteBuilderContext);
  if (context === undefined) {
    throw new Error('useRouteBuilder must be used within a RouteBuilderProvider');
  }
  return context;
};