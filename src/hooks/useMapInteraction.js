// src/hooks/useMapInteraction.js
import { useState, useEffect } from "react";
import { Platform, Alert } from "react-native";
import * as Location from "expo-location";
import mbxDirections from "@mapbox/mapbox-sdk/services/directions";

// Helper for Universal Alerts
const showAlert = (title, message) => {
  if (Platform.OS === "web") {
    window.alert(`${title}: ${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export default function useMapInteraction(mapRef) {
  const [userLocation, setUserLocation] = useState(null);
  const [directionsRoute, setDirectionsRoute] = useState(null);

  const directionsClient = mbxDirections({
    accessToken:
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
      process.env.EXPO_PUBLIC_MAPBOX_TOKEN,
  });

  // 🌟 NEW: CONTINUOUS LIVE TRACKING 🌟
  // This powers the Fog of War, Multiplayer Radar, and ensures
  // ChatHub "Share Location" always has your coordinates instantly.
  // 🌟 NEW: CONTINUOUS LIVE TRACKING 🌟
  useEffect(() => {
    let subscriber = null;

    const startTracking = async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;

        let initialLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setUserLocation([
          initialLocation.coords.longitude,
          initialLocation.coords.latitude,
        ]);

        subscriber = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 3000,
            distanceInterval: 5,
          },
          (loc) => {
            setUserLocation([loc.coords.longitude, loc.coords.latitude]);
          }
        );
      } catch (error) {
        console.error("GPS Tracking error:", error);
      }
    };

    startTracking();

    return () => {
      if (subscriber) {
        try {
          // 🌟 FIXED: Wrap in try/catch to bypass the expo-location Web bug
          subscriber.remove();
        } catch (error) {
          console.log("Expo Web GPS cleanup bypassed.");
        }
      }
    };
  }, []);

  const handleGoToUserLocation = async () => {
    // 🌟 OPTIMIZED: If we already have the live location from the watcher, just fly to it instantly!
    if (userLocation && mapRef.current) {
      if (Platform.OS === "web") {
        mapRef.current.flyTo({
          center: userLocation,
          zoom: 16,
          pitch: 75,
          essential: true,
        });
      } else {
        mapRef.current.setCamera({
          centerCoordinate: userLocation,
          zoomLevel: 16,
          pitch: 75,
          animationDuration: 2000,
        });
      }
      return;
    }

    // Fallback if the watcher hasn't fired yet
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        showAlert(
          "Permission Denied",
          "Please enable location services to use this feature."
        );
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const userCoords = [location.coords.longitude, location.coords.latitude];
      setUserLocation(userCoords);

      if (!mapRef.current) return;

      if (Platform.OS === "web") {
        mapRef.current.flyTo({
          center: userCoords,
          zoom: 16,
          pitch: 75,
          essential: true,
        });
      } else {
        mapRef.current.setCamera({
          centerCoordinate: userCoords,
          zoomLevel: 16,
          pitch: 75,
          animationDuration: 2000,
        });
      }
    } catch (error) {
      console.error("Error getting user location:", error);
      showAlert("Error", "Could not get your location.");
    }
  };

  const handleGetDirections = async (pin, onStart) => {
    if (onStart) onStart();

    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        showAlert("Permission Denied", "Location is required for directions.");
        return;
      }

      // Use the live tracked location if we have it, otherwise fetch it
      let userCoords = userLocation;
      if (!userCoords) {
        let location = await Location.getCurrentPositionAsync({});
        userCoords = [location.coords.longitude, location.coords.latitude];
        setUserLocation(userCoords);
      }

      const pinCoords = [pin.lng, pin.lat];

      // Fetch Route from Mapbox
      const response = await directionsClient
        .getDirections({
          profile: "walking", // Changed to walking for better exploration!
          waypoints: [{ coordinates: userCoords }, { coordinates: pinCoords }],
          geometries: "geojson",
        })
        .send();

      const route = response.body.routes[0].geometry.coordinates;
      setDirectionsRoute(route);

      if (!mapRef.current) return;

      if (Platform.OS === "web") {
        const bounds = [
          [
            Math.min(userCoords[0], pinCoords[0]),
            Math.min(userCoords[1], pinCoords[1]),
          ], // Southwest
          [
            Math.max(userCoords[0], pinCoords[0]),
            Math.max(userCoords[1], pinCoords[1]),
          ], // Northeast
        ];
        mapRef.current.fitBounds(bounds, {
          padding: { top: 80, bottom: 80, left: 60, right: 60 },
          essential: true,
        });
      } else {
        mapRef.current.setCamera({
          bounds: {
            ne: [
              Math.max(userCoords[0], pinCoords[0]),
              Math.max(userCoords[1], pinCoords[1]),
            ],
            sw: [
              Math.min(userCoords[0], pinCoords[0]),
              Math.min(userCoords[1], pinCoords[1]),
            ],
            paddingLeft: 60,
            paddingRight: 60,
            paddingTop: 80,
            paddingBottom: 80,
          },
          animationDuration: 2000,
        });
      }
    } catch (error) {
      console.error("Error getting directions:", error);
      showAlert("Error", "Could not calculate the route.");
    }
  };

  return {
    handleGoToUserLocation,
    handleGetDirections,
    userLocation,
    directionsRoute,
  };
}
