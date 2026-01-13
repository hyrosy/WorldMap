import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useNavigation } from 'expo-router';

// City Data Constant (Same as WebMapLogic)
const CITY_DATA = {
  'marrakech': { name: 'Marrakech', latitude: 31.6295, longitude: -7.9811, latitudeDelta: 0.0922, longitudeDelta: 0.0421 },
  'casablanca': { name: 'Casablanca', latitude: 33.5731, longitude: -7.5898, latitudeDelta: 0.0922, longitudeDelta: 0.0421 },
  'rabat': { name: 'Rabat', latitude: 34.0209, longitude: -6.8416, latitudeDelta: 0.0922, longitudeDelta: 0.0421 },
};

export default function MobileMapLogic({ initialCityId }) {
  const navigation = useNavigation();
  const mapRef = useRef(null);
  
  // Initialize region state based on the passed city ID
  const [region, setRegion] = useState(
    initialCityId && CITY_DATA[initialCityId] 
      ? CITY_DATA[initialCityId]
      : CITY_DATA['marrakech']
  );

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE} // Use Google Maps on both platforms for consistency
        initialRegion={region}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {/* Example Marker - You can map your pins here later */}
        <Marker
          coordinate={{ latitude: region.latitude, longitude: region.longitude }}
          title={region.name}
          description={"Welcome to " + region.name}
        />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  map: {
    width: '100%',
    height: '100%',
  },
});