'use client';

import React, { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import mbxDirections from '@mapbox/mapbox-sdk/services/directions';


mapboxgl.workerUrl = "/mapbox-gl-csp-worker.js";
mapboxgl.accessToken = 'pk.eyJ1IjoiaHlyb3N5IiwiYSI6ImNtZW84aHIyMzFjNXEybXNlZzN0c294N3oifQ.xSS6R2U0ClqqtR9Tfxmntw';
// --- NEW: Initialize the Directions Client outside the component ---
const directionsClient = mbxDirections({ accessToken: mapboxgl.accessToken });

const Map = ({ mapRef, displayedPins, onPinClick, selectedCity, onAnimationEnd, categoryIconMap, onLoad, experienceRoute }) => {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const markersRef = useRef([]);

    // Effect for map initialization (runs only once)
    useEffect(() => {
        if (map.current) return; // Prevent re-initialization

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/hyrosy/cmet0cvjx00db01qwc2gfet91',
            center: [-10.067870, 29.032917],
            zoom: 0.5,
            pitch: 0,
        });

        // Pass the map instance to the parent component
        if (mapRef) {
            mapRef.current = map.current;
        }

        map.current.on('load', () => {
            map.current.addSource('mapbox-dem', {
                'type': 'raster-dem',
                'url': 'mapbox://mapbox.terrain-rgb',
                'tileSize': 512,
                'maxzoom': 14
            });
            map.current.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.5 });
            map.current.setFog({});
            
            // Signal that the map is loaded
            if (onLoad) onLoad(map.current);
            
        });
        
        
        // Cleanup function to run when the component is unmounted
        return () => {
            if (map.current) {
                map.current.remove();
                map.current = null;
                 if (mapRef) {
                    mapRef.current = null;
                }
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // <-- CORRECT: Empty dependency array ensures this runs only once.

    // Effect for handling camera flights (runs only when selectedCity changes)
    useEffect(() => {
        const currentMap = mapRef.current;
        if (!currentMap || !currentMap.isStyleLoaded()) return;
        
        const target = selectedCity 
            ? { // Fly TO a city
                center: selectedCity.center,
                zoom: 15,
                pitch: 75,
                bearing: -17.6
              }
            : { // Fly BACK to All Morcco
                center: [-5.4, 32.2],
                zoom: 5.5,
                pitch: 0,
                bearing: 0
              };

        currentMap.flyTo({
            ...target,
            speed: 1.2,
            essential: true
        });

        if (onAnimationEnd) {
            currentMap.once('moveend', onAnimationEnd);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCity]); // <-- CORRECT: Only depends on the data that triggers the animation.

    // Effect for updating pins (runs only when the pins data changes)
    useEffect(() => {
        const currentMap = mapRef.current;
        if (!currentMap || !currentMap.isStyleLoaded()) return;

        // Clear existing markers
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];

        // Add new markers
        displayedPins.forEach(pin => {
            const primaryCategoryId = pin.location_category?.[0];
            const iconFile = categoryIconMap?.[primaryCategoryId] || 'adventure.png';

            const markerEl = document.createElement('div');
            markerEl.className = 'custom-marker'; 
            markerEl.style.backgroundImage = `url(/pin-icons/${iconFile})`;
            markerEl.style.width = '30px'; // Example style
            markerEl.style.height = '30px'; // Example style
            markerEl.style.backgroundSize = 'contain';

            markerEl.addEventListener('click', (e) => {
                e.stopPropagation();
                onPinClick(pin);
            });
            
            const marker = new mapboxgl.Marker(markerEl)
                .setLngLat([pin.lng, pin.lat])
                .addTo(currentMap);
                
            markersRef.current.push(marker);
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [displayedPins]); // <-- CORRECT: Only depends on the data for the pins.

    // --- FINAL, UPGRADED: Effect for drawing the experience route ---
    useEffect(() => {
    const currentMap = map.current;
    if (!currentMap || !currentMap.isStyleLoaded()) return;

    // This async function will handle everything
    const manageRoute = async () => {
        // First, ensure the source and layer exist. Create them if they don't.
        if (!currentMap.getSource('experience-route')) {
            currentMap.addSource('experience-route', {
                type: 'geojson',
                data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] } }
            });
            currentMap.addLayer({
                id: 'experience-route-layer',
                type: 'line',
                source: 'experience-route',
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: { 'line-color': '#3887be', 'line-width': 5, 'line-opacity': 0.75 }
            });
        }
        
        // Now we can safely get the source
        const source = currentMap.getSource('experience-route');

        if (experienceRoute && experienceRoute.length > 1) {
            // We have a route to draw
            const waypoints = experienceRoute.map(pin => ({ coordinates: [pin.lng, pin.lat] }));
            
            try {
                const response = await directionsClient.getDirections({
                    profile: 'driving',
                    waypoints: waypoints,
                    geometries: 'geojson'
                }).send();
        
                const routeGeoJSON = response.body.routes[0].geometry;
                source.setData({ type: 'Feature', geometry: routeGeoJSON });

                const coordinates = routeGeoJSON.coordinates;
                const bounds = new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]);
                for (const coord of coordinates) {
                    bounds.extend(coord);
                }
                currentMap.fitBounds(bounds, {
                    padding: { top: 100, bottom: 150, left: 450, right: 100 },
                    pitch: 45,
                    duration: 2500, // Added duration for smooth animation
                    essential: true
                });

            } catch (error) {
                console.error("Error fetching directions:", error);
            }

        } else {
            // No route, so clear the line from the map
            source.setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: [] } });
        }
    };

    manageRoute();

}, [experienceRoute]);

    return <div ref={mapContainer} className="absolute top-0 left-0 w-full h-full" />;
};

export default Map;