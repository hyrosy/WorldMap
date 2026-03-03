import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Mapbox from '@rnmapbox/maps';

// Read token from Expo environment variables, fallback to string if missing
Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoiaHlyb3N5IiwiYSI6ImNtZW84aHIyMzFjNXEybXNlZzN0c294N3oifQ.xSS6R2U0ClqqtR9Tfxmntw');

// UPDATED PROPS: Added userLocation and directionsRoute
export default function NativeMap({ mapRef, city, pins, onPinClick, onMapLoad, route, userLocation, directionsRoute }) {

  // --- 1. Auto-Fly to City when "city" prop changes ---
  useEffect(() => {
    if (!mapRef?.current) return;

    // Define coordinates for your cities
    const cityCoords = {
        'marrakech': [-7.98, 31.63],
        'casablanca': [-7.59, 33.57],
        'rabat': [-6.84, 34.02],
    };

    const target = cityCoords[city];

    if (target) {
        mapRef.current.setCamera({
            centerCoordinate: target,
            zoomLevel: 12,
            animationDuration: 2000,
        });
    } else {
        mapRef.current.setCamera({
            centerCoordinate: [-5.5, 32],
            zoomLevel: 5.5,
            animationDuration: 2000,
        });
    }
  }, [city]); 

  return (
    <View style={styles.container}>
      <Mapbox.MapView 
        style={styles.map}
        styleURL="mapbox://styles/hyrosy/cmet0cvjx00db01qwc2gfet91"
        onDidFinishLoadingMap={() => onMapLoad && onMapLoad(mapRef.current)}
      >
        <Mapbox.Camera
          ref={mapRef}
          defaultSettings={{
            zoomLevel: 5.5,
            centerCoordinate: [-5.5, 32],
          }}
        />

        {/* --- 2. RENDER PINS --- */}
        {pins && pins.map((pin) => (
            <Mapbox.PointAnnotation
                key={pin.id}
                id={`pin-${pin.id}`}
                // Supabase returns clean floats, no string parsing needed!
                coordinate={[parseFloat(pin.lng), parseFloat(pin.lat)]}
                onSelected={() => onPinClick(pin)}
            >
                <View style={styles.markerContainer}>
                   <View style={styles.markerDot} /> 
                </View>
            </Mapbox.PointAnnotation>
        ))}

        {/* --- 3. RENDER USER GPS LOCATION (NEW) --- */}
        {userLocation && (
            <Mapbox.PointAnnotation
                id="user-location-marker"
                coordinate={userLocation}
            >
                <View style={styles.userMarkerContainer}>
                   <View style={styles.userMarkerRing} />
                   <View style={styles.userMarkerDot} /> 
                </View>
            </Mapbox.PointAnnotation>
        )}

        {/* --- 4. RENDER A-TO-B DIRECTIONS ROUTE (NEW) --- */}
        {directionsRoute && directionsRoute.length > 1 && (
            <Mapbox.ShapeSource
                id="directionsSource"
                shape={{
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        // directionsRoute is already a nested array of coordinates from the hook
                        coordinates: directionsRoute, 
                    },
                }}
            >
                <Mapbox.LineLayer
                    id="directionsLayer"
                    style={{
                        lineColor: '#EFBF04', // Golden color for directions
                        lineWidth: 5,
                        lineOpacity: 0.85,
                        lineCap: 'round',
                        lineJoin: 'round',
                    }}
                />
            </Mapbox.ShapeSource>
        )}

        {/* --- 5. RENDER EXPERIENCE ROUTE (Stops Connection) --- */}
        {route && route.length > 1 && (
            <Mapbox.ShapeSource
                id="routeSource"
                shape={{
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: route.map(p => [parseFloat(p.lng), parseFloat(p.lat)]),
                    },
                }}
            >
                <Mapbox.LineLayer
                    id="routeLayer"
                    style={{
                        lineColor: '#3887be', // Blue color for Experiences
                        lineWidth: 4,
                        lineOpacity: 0.75,
                        lineCap: 'round',
                        lineJoin: 'round',
                        lineDasharray: [2, 2], // Dashed line to separate from live GPS directions
                    }}
                />
            </Mapbox.ShapeSource>
        )}

      </Mapbox.MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  markerContainer: {
      width: 30,
      height: 30,
      alignItems: 'center',
      justifyContent: 'center',
  },
  markerDot: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: '#d3bc8e',
      borderWidth: 2,
      borderColor: 'white',
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
  },
  // New Styles for the GPS Tracker
  userMarkerContainer: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
  },
  userMarkerDot: {
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: '#22d3ee', // Cyan
      borderWidth: 3,
      borderColor: 'white',
      zIndex: 2,
  },
  userMarkerRing: {
      position: 'absolute',
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(34, 211, 238, 0.3)', // Faded Cyan pulse
      zIndex: 1,
  }
});