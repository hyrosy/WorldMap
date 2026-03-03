// src/hooks/useMapInteraction.js
import { useState } from 'react';
import { Platform, Alert } from 'react-native';
import * as Location from 'expo-location';
import mbxDirections from '@mapbox/mapbox-sdk/services/directions';

// Helper for Universal Alerts
const showAlert = (title, message) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}: ${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export default function useMapInteraction(mapRef) {
  // We use state instead of manipulating the DOM
  const [userLocation, setUserLocation] = useState(null);
  const [directionsRoute, setDirectionsRoute] = useState(null);

  // Note: Expo uses EXPO_PUBLIC_ prefix, but if your .env still uses NEXT_PUBLIC_ it will work on web. 
  // Ensure your mobile app can read this token!
  const directionsClient = mbxDirections({ 
      accessToken: process.env.NEXT_PUBLIC_MAPBOX_TOKEN || process.env.EXPO_PUBLIC_MAPBOX_TOKEN 
  });

  const handleGoToUserLocation = async () => {
    try {
      // 1. Request Permissions Universally
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Permission Denied', 'Please enable location services to use this feature.');
        return;
      }

      // 2. Get Location
      let location = await Location.getCurrentPositionAsync({});
      const userCoords = [location.coords.longitude, location.coords.latitude];
      
      // 3. Save to state (Your Map components will render the marker based on this)
      setUserLocation(userCoords);

      // 4. Fly to location
      if (!mapRef.current) return;

      if (Platform.OS === 'web') {
        mapRef.current.flyTo({ center: userCoords, zoom: 16, pitch: 75, essential: true });
      } else {
        // Native @rnmapbox/maps uses setCamera
        mapRef.current.setCamera({
          centerCoordinate: userCoords,
          zoomLevel: 16,
          pitch: 75,
          animationDuration: 2000,
        });
      }
    } catch (error) {
      console.error("Error getting user location:", error);
      showAlert('Error', 'Could not get your location.');
    }
  };

  const handleGetDirections = async (pin, onStart) => {
    if (onStart) onStart(); // Callback to close modal

    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Permission Denied', 'Location is required for directions.');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const userCoords = [location.coords.longitude, location.coords.latitude];
      const pinCoords = [pin.lng, pin.lat];
      
      setUserLocation(userCoords);

      // Fetch Route from Mapbox
      const response = await directionsClient.getDirections({
        profile: 'driving-traffic', // Or 'walking' depending on your app
        waypoints: [{ coordinates: userCoords }, { coordinates: pinCoords }],
        geometries: 'geojson'
      }).send();
      
      const route = response.body.routes[0].geometry.coordinates;
      setDirectionsRoute(route); // Save route to state to be drawn by the Map component

      // Adjust Map Camera bounds
      if (!mapRef.current) return;

      if (Platform.OS === 'web') {
        const bounds = [
            [Math.min(userCoords[0], pinCoords[0]), Math.min(userCoords[1], pinCoords[1])], // Southwest
            [Math.max(userCoords[0], pinCoords[0]), Math.max(userCoords[1], pinCoords[1])]  // Northeast
        ];
        mapRef.current.fitBounds(bounds, { padding: { top: 80, bottom: 80, left: 60, right: 60 }, essential: true });
      } else {
        mapRef.current.setCamera({
          bounds: {
            ne: [Math.max(userCoords[0], pinCoords[0]), Math.max(userCoords[1], pinCoords[1])],
            sw: [Math.min(userCoords[0], pinCoords[0]), Math.min(userCoords[1], pinCoords[1])],
            paddingLeft: 60, paddingRight: 60, paddingTop: 80, paddingBottom: 80,
          },
          animationDuration: 2000,
        });
      }

    } catch (error) {
      console.error("Error getting directions:", error);
      showAlert("Error", "Could not calculate the route.");
    }
  };

  // We now export the state variables so the Maps can render them
  return { 
      handleGoToUserLocation, 
      handleGetDirections, 
      userLocation, 
      directionsRoute 
  };
}