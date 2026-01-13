import React from 'react';
import { View, Text, Platform, ActivityIndicator } from 'react-native';

// Dynamically load the Web Component so it doesn't break the Mobile build
let WebMapContainer;
if (Platform.OS === 'web') {
  WebMapContainer = require('./WebMapLogic').default;
}

export default function UniversalMap({ city }) {
  if (Platform.OS === 'web') {
    return (
      <div style={{ height: '100%', width: '100%' }}>
         {/* We pass the city ID from the dashboard to the map logic */}
         <WebMapContainer initialCityId={city} />
      </div>
    );
  }

  // --- MOBILE MAP PLACEHOLDER ---
  // This is where we will implement react-native-maps in the next step.
  // For now, it shows a clean loading state.
  return (
    <View className="flex-1 items-center justify-center bg-gray-50">
      <ActivityIndicator size="large" color="#d3bc8e" />
      <Text className="text-lg font-bold text-gray-800 mt-4">Loading Map...</Text>
      <Text className="text-gray-500 mt-2 px-8 text-center">
        Native Map integration in progress.
      </Text>
    </View>
  );
}