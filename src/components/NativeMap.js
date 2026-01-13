import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Mapbox from '@rnmapbox/maps';

// Set your public access token here
Mapbox.setAccessToken('pk.eyJ1IjoiaHlyb3N5IiwiYSI6ImNtZW84aHIyMzFjNXEybXNlZzN0c294N3oifQ.xSS6R2U0ClqqtR9Tfxmntw');

export default function NativeMap({ mapRef, city, pins, onPinClick, onMapLoad, route }) {

  // --- 1. Auto-Fly to City when "city" prop changes ---
  useEffect(() => {
    // If the map isn't ready or no city is selected, do nothing
    if (!mapRef?.current) return;

    // Define coordinates for your cities
    const cityCoords = {
        'marrakech': [-7.98, 31.63],
        'casablanca': [-7.59, 33.57],
        'rabat': [-6.84, 34.02],
    };

    const target = cityCoords[city];

    if (target) {
        // Fly to the specific city
        mapRef.current.setCamera({
            centerCoordinate: target,
            zoomLevel: 12,
            animationDuration: 2000,
        });
    } else {
        // Reset View (Show all of Morocco) if city is null
        mapRef.current.setCamera({
            centerCoordinate: [-5.5, 32],
            zoomLevel: 5.5,
            animationDuration: 2000,
        });
    }
  }, [city]); // <-- This effect runs whenever 'city' changes

  return (
    <View style={styles.container}>
      <Mapbox.MapView 
        style={styles.map}
        // Use your custom style from the web version to keep it consistent
        styleURL="mapbox://styles/hyrosy/cmet0cvjx00db01qwc2gfet91"
        // Notify parent when map is ready
        onDidFinishLoadingMap={() => onMapLoad && onMapLoad(mapRef.current)}
      >
        {/* Pass the ref to the Camera so we can control it from the parent */}
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
                // Ensure coordinates are numbers
                coordinate={[parseFloat(pin.lng), parseFloat(pin.lat)]}
                onSelected={() => onPinClick(pin)}
            >
                {/* Custom Marker View */}
                <View style={styles.markerContainer}>
                   {/* You can add an <Image> here for custom icons based on pin.category */}
                   <View style={styles.markerDot} /> 
                </View>
            </Mapbox.PointAnnotation>
        ))}

        {/* --- 3. RENDER ROUTE (If available) --- */}
        {route && route.length > 1 && (
            <Mapbox.ShapeSource
                id="routeSource"
                shape={{
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        // Extract coordinates from your route array
                        coordinates: route.map(p => [parseFloat(p.lng), parseFloat(p.lat)]),
                    },
                }}
            >
                <Mapbox.LineLayer
                    id="routeLayer"
                    style={{
                        lineColor: '#3887be',
                        lineWidth: 5,
                        lineOpacity: 0.75,
                        lineCap: 'round',
                        lineJoin: 'round',
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
  // Customize your pin style here
  markerDot: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: '#d3bc8e',
      borderWidth: 2,
      borderColor: 'white',
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
  }
});