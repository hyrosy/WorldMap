'use client';

import React, { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import mbxDirections from '@mapbox/mapbox-sdk/services/directions';

mapboxgl.workerUrl = "/mapbox-gl-csp-worker.js";
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || process.env.EXPO_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoiaHlyb3N5IiwiYSI6ImNtZW84aHIyMzFjNXEybXNlZzN0c294N3oifQ.xSS6R2U0ClqqtR9Tfxmntw';

const directionsClient = mbxDirections({ accessToken: mapboxgl.accessToken });

// UPDATED PROPS: Added userLocation and directionsRoute
const Map = ({ mapRef, displayedPins, onPinClick, selectedCity, onAnimationEnd, categoryIconMap, onLoad, experienceRoute, userLocation, directionsRoute }) => {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const markersRef = useRef([]);
    const userMarkerRef = useRef(null); // Ref for the user's GPS marker

    // 1. Initialize Map
    useEffect(() => {
        if (map.current) return; 

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/hyrosy/cmet0cvjx00db01qwc2gfet91',
            center: [-10.067870, 29.032917],
            zoom: 0.5,
            pitch: 0,
        });

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
            
            if (onLoad) onLoad(map.current);
        });
        
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
    }, []);

    // 2. Camera Flights (City Selection)
    useEffect(() => {
        const currentMap = mapRef.current;
        if (!currentMap || !currentMap.isStyleLoaded()) return;
        
        const target = selectedCity 
            ? {
                center: selectedCity.center,
                zoom: 15,
                pitch: 75,
                bearing: -17.6
              }
            : {
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
    }, [selectedCity]); 

    // 3. Render Location Pins
    useEffect(() => {
        const currentMap = mapRef.current;
        if (!currentMap || !currentMap.isStyleLoaded()) return;

        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];

        displayedPins.forEach(pin => {
            // UPDATED: Flat category reference from Supabase
            const categoryName = pin.category; 
            
            // Note: Update your map.js parent component's categoryIconMap to map string names instead of IDs
            const iconFile = categoryIconMap?.[categoryName] || 'adventure.png';

            const markerEl = document.createElement('div');
            markerEl.className = 'custom-marker'; 
            markerEl.style.backgroundImage = `url(/pin-icons/${iconFile})`;
            markerEl.style.width = '30px'; 
            markerEl.style.height = '30px'; 
            markerEl.style.backgroundSize = 'contain';

            markerEl.addEventListener('click', (e) => {
                e.stopPropagation();
                onPinClick(pin);
            });
            
            const marker = new mapboxgl.Marker(markerEl)
                .setLngLat([pin.lng, pin.lat]) // Supabase provides these cleanly!
                .addTo(currentMap);
                
            markersRef.current.push(marker);
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [displayedPins, categoryIconMap]); 

    // 4. Render Experience Routes
    useEffect(() => {
        const currentMap = map.current;
        if (!currentMap || !currentMap.isStyleLoaded()) return;

        const manageRoute = async () => {
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
            
            const source = currentMap.getSource('experience-route');

            if (experienceRoute && experienceRoute.length > 1) {
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
                        duration: 2500, 
                        essential: true
                    });

                } catch (error) {
                    console.error("Error fetching directions:", error);
                }
            } else {
                source.setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: [] } });
            }
        };

        manageRoute();
    }, [experienceRoute]);

    // 5. Render User GPS Marker (NEW)
    useEffect(() => {
        if (!map.current || !userLocation) return;
        
        if (userMarkerRef.current) {
            // Move existing marker
            userMarkerRef.current.setLngLat(userLocation);
        } else {
            // Create new marker
            const markerElement = document.createElement('div');
            markerElement.className = 'user-marker'; // Relies on your global.css
            
            userMarkerRef.current = new mapboxgl.Marker(markerElement)
                .setLngLat(userLocation)
                .addTo(map.current);
        }
    }, [userLocation]);

    // 6. Render A-to-B Directions Route (NEW)
    useEffect(() => {
        const currentMap = map.current;
        if (!currentMap || !currentMap.isStyleLoaded()) return;

        if (!currentMap.getSource('directions-route')) {
            currentMap.addSource('directions-route', {
                type: 'geojson',
                data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] } }
            });
            currentMap.addLayer({
                id: 'directions-route-layer',
                type: 'line',
                source: 'directions-route',
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: { 'line-color': '#EFBF04', 'line-width': 5, 'line-opacity': 0.75 }
            });
        }

        const source = currentMap.getSource('directions-route');

        if (directionsRoute && directionsRoute.length > 0) {
            source.setData({ 
                type: 'Feature', 
                geometry: { type: 'LineString', coordinates: directionsRoute } 
            });
        } else {
            source.setData({ 
                type: 'Feature', 
                geometry: { type: 'LineString', coordinates: [] } 
            });
        }
    }, [directionsRoute]);

    return <div ref={mapContainer} className="absolute top-0 left-0 w-full h-full" />;
};

export default Map;