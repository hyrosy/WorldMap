import { useState } from 'react';
import mbxDirections from '@mapbox/mapbox-sdk/services/directions';
import mapboxgl from 'mapbox-gl';

export default function useMapInteraction(mapRef) {
  const [userMarker, setUserMarker] = useState(null);
  const directionsClient = mbxDirections({ accessToken: process.env.NEXT_PUBLIC_MAPBOX_TOKEN });

  const handleGoToUserLocation = () => {
    if (!mapRef.current) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { longitude, latitude } = position.coords;
        const userCoords = [longitude, latitude];
        const map = mapRef.current;

        map.flyTo({ center: userCoords, zoom: 16, pitch: 75, essential: true });

        if (userMarker) {
          userMarker.setLngLat(userCoords);
        } else {
          const markerElement = document.createElement('div');
          markerElement.className = 'user-marker';
          const newMarker = new mapboxgl.Marker(markerElement)
            .setLngLat(userCoords)
            .addTo(map);
          setUserMarker(newMarker);
        }
      },
      (error) => {
        console.error("Error getting user location:", error);
        alert("Could not get your location. Please enable location services.");
      }
    );
  };

  const handleGetDirections = (pin, onStart) => {
    if (onStart) onStart(); // Callback to close modal, etc.

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { longitude, latitude } = position.coords;
        const userCoords = [longitude, latitude];
        const pinCoords = [pin.lng, pin.lat];
        const map = mapRef.current;
        if (!map) return;

        const bounds = new mapboxgl.LngLatBounds(userCoords, pinCoords);
        map.fitBounds(bounds, { padding: { top: 80, bottom: 80, left: 60, right: 60 }, essential: true });

        if (userMarker) {
          userMarker.setLngLat(userCoords);
        } else {
          const newMarker = new mapboxgl.Marker({ color: "#3887be" })
            .setLngLat(userCoords)
            .addTo(map);
          setUserMarker(newMarker);
        }
        fetchRoute(userCoords, pinCoords);
      },
      (error) => {
        console.error("Error getting user location:", error);
        alert("Could not get your location. Please ensure you have enabled location services.");
      }
    );
  };

  const fetchRoute = async (start, end) => {
    if (!mapRef.current) return;
    try {
      const response = await directionsClient.getDirections({
        profile: 'driving-traffic',
        waypoints: [{ coordinates: start }, { coordinates: end }],
        geometries: 'geojson'
      }).send();
      const route = response.body.routes[0].geometry.coordinates;
      drawRoute(route);
    } catch (err) {
      console.error("Mapbox API Error:", err);
      alert("Sorry, could not calculate the route.");
    }
  };

  const drawRoute = (route) => {
    const map = mapRef.current;
    if (!map) return;

    const addDataToMap = () => {
      if (map.getSource('route')) {
        map.getSource('route').setData({ 'type': 'Feature', 'properties': {}, 'geometry': { 'type': 'LineString', 'coordinates': route } });
      } else {
        map.addSource('route', { 'type': 'geojson', 'data': { 'type': 'Feature', 'properties': {}, 'geometry': { 'type': 'LineString', 'coordinates': route } } });
        map.addLayer({ 'id': 'route', 'type': 'line', 'source': 'route', 'layout': { 'line-join': 'round', 'line-cap': 'round' }, 'paint': { 'line-color': '#EFBF04', 'line-width': 5, 'line-opacity': 0.75 } });
      }
    };

    if (map.isStyleLoaded()) {
      addDataToMap();
    } else {
      map.once('load', addDataToMap);
    }
  };

  return { handleGoToUserLocation, handleGetDirections };
}
