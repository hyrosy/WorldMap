"use client";

import React, { useRef, useEffect, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import mbxDirections from "@mapbox/mapbox-sdk/services/directions";
import * as turf from "@turf/turf";

mapboxgl.accessToken =
  process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
  process.env.EXPO_PUBLIC_MAPBOX_TOKEN ||
  "pk.eyJ1IjoiaHlyb3N5IiwiYSI6ImNtZW84aHIyMzFjNXEybXNlZzN0c294N3oifQ.xSS6R2U0ClqqtR9Tfxmntw";

const directionsClient = mbxDirections({ accessToken: mapboxgl.accessToken });

const Map = ({
  mapRef,
  displayedPins,
  onPinClick,
  selectedCity,
  onAnimationEnd,
  categoryIconMap,
  onLoad,
  experienceRoute,
  userLocation,
  directionsRoute,
  onMapClick,
  partyLocations = [],
}) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const userMarkerRef = useRef(null);
  const partyMarkersRef = useRef({});
  const [walkedPath, setWalkedPath] = useState([]);
  const pinsRef = useRef(displayedPins);

  useEffect(() => {
    pinsRef.current = displayedPins;
  }, [displayedPins]);

  // 1. Initialize Map & Load Custom Images into Canvas
  useEffect(() => {
    if (map.current) return;

    const currentHour = new Date().getHours();
    const isNight = currentHour >= 19 || currentHour <= 6;

    const dynamicStyle = isNight
      ? "mapbox://styles/mapbox/dark-v11"
      : "mapbox://styles/mapbox/outdoors-v12";

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: dynamicStyle,
      center: [-7.98, 31.63],
      zoom: 12,
      pitch: 45,
    });

    map.current.on("click", (e) => {
      const targetLayers = [
        "unclustered-point-bg",
        "unclustered-point",
        "clusters",
      ];
      const existingLayers = targetLayers.filter((layerId) =>
        map.current.getLayer(layerId)
      );

      let features = [];
      if (existingLayers.length > 0) {
        try {
          features = map.current.queryRenderedFeatures(e.point, {
            layers: existingLayers,
          });
        } catch (err) {}
      }

      if (features.length === 0 && onMapClick) {
        onMapClick(e.lngLat.lng, e.lngLat.lat);
      }
    });

    if (mapRef) mapRef.current = map.current;

    map.current.on("load", () => {
      map.current.addSource("mapbox-dem", {
        type: "raster-dem",
        url: "mapbox://mapbox.terrain-rgb",
        tileSize: 512,
        maxzoom: 14,
      });
      map.current.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 });
      map.current.setFog({
        color: isNight ? "rgba(28, 29, 40, 0.8)" : "rgba(255, 255, 255, 0.8)",
        "horizon-blend": 0.2,
      });

      map.current.loadImage("/placeholder.png", (error, image) => {
        if (!error && !map.current.hasImage("placeholder.png"))
          map.current.addImage("placeholder.png", image);
      });

      if (categoryIconMap) {
        const uniqueIcons = [...new Set(Object.values(categoryIconMap))];
        uniqueIcons.forEach((iconName) => {
          map.current.loadImage(`/pin-icons/${iconName}`, (error, image) => {
            if (!error && !map.current.hasImage(iconName))
              map.current.addImage(iconName, image);
          });
        });
      }

      if (onLoad) onLoad(map.current);
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
        if (mapRef) mapRef.current = null;
      }
    };
  }, []);

  // 🌟 FOG OF WAR: UPDATE WALKED PATH FROM GPS 🌟
  useEffect(() => {
    if (!userLocation) return;
    setWalkedPath((prev) => {
      const last = prev[prev.length - 1];
      if (last && last[0] === userLocation[0] && last[1] === userLocation[1])
        return prev;
      return [...prev, userLocation];
    });
  }, [userLocation]);

  // 🌟 FOG OF WAR: CUT HOLES IN THE FOG USING TURF.JS 🌟
  useEffect(() => {
    const currentMap = map.current;
    if (
      !currentMap ||
      !currentMap.getSource("fog-source") ||
      walkedPath.length === 0
    )
      return;

    const worldBox = turf.bboxPolygon([-180, -85, 180, 85]);
    let exploredArea;

    if (walkedPath.length === 1) {
      exploredArea = turf.buffer(turf.point(walkedPath[0]), 50, {
        units: "meters",
      });
    } else {
      exploredArea = turf.buffer(turf.lineString(walkedPath), 50, {
        units: "meters",
      });
    }

    try {
      const fogMask = turf.difference(worldBox, exploredArea);
      currentMap.getSource("fog-source").setData(fogMask || worldBox);
    } catch (error) {
      console.error("Fog calculation error:", error);
    }
  }, [walkedPath]);

  // 2. Camera Flights
  useEffect(() => {
    const currentMap = mapRef.current;
    if (!currentMap || !currentMap.isStyleLoaded()) return;

    const target = selectedCity
      ? { center: selectedCity.center, zoom: 15, pitch: 75, bearing: -17.6 }
      : { center: [-5.4, 32.2], zoom: 5.5, pitch: 0, bearing: 0 };

    currentMap.flyTo({ ...target, speed: 1.2, essential: true });
    if (onAnimationEnd) currentMap.once("moveend", onAnimationEnd);
  }, [selectedCity]);

  // 3. WebGL Pins
  useEffect(() => {
    const currentMap = mapRef.current;
    if (!currentMap || !currentMap.isStyleLoaded()) return;

    const geojson = {
      type: "FeatureCollection",
      features: displayedPins.map((pin) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [pin.lng, pin.lat] },
        properties: {
          id: pin.id || `${pin.lat}-${pin.lng}`,
          icon: categoryIconMap?.[pin.category] || "placeholder.png",
          ...pin,
        },
      })),
    };

    if (!currentMap.getSource("pins-source")) {
      currentMap.addSource("pins-source", {
        type: "geojson",
        data: geojson,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      currentMap.addLayer({
        id: "clusters",
        type: "circle",
        source: "pins-source",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step",
            ["get", "point_count"],
            "#2e3142",
            10,
            "#1c1d28",
            30,
            "#3b3e52",
          ],
          "circle-radius": ["step", ["get", "point_count"], 20, 10, 25, 30, 30],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#d3bc8e",
        },
      });

      currentMap.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "pins-source",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
          "text-size": 15,
        },
        paint: { "text-color": "#d3bc8e" },
      });

      currentMap.addLayer({
        id: "unclustered-point-bg",
        type: "circle",
        source: "pins-source",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": "#2e3142",
          "circle-radius": 14,
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#d3bc8e",
        },
      });

      currentMap.addLayer({
        id: "unclustered-point",
        type: "symbol",
        source: "pins-source",
        filter: ["!", ["has", "point_count"]],
        layout: {
          "icon-image": ["get", "icon"],
          "icon-size": 0.05,
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        },
      });

      currentMap.on(
        "click",
        ["unclustered-point", "unclustered-point-bg"],
        (e) => {
          const feature = e.features[0];
          const clickedPinId = feature.properties.id;
          const originalPin = pinsRef.current.find(
            (p) => p.id === clickedPinId || `${p.lat}-${p.lng}` === clickedPinId
          );
          if (originalPin && onPinClick) onPinClick(originalPin);
        }
      );
    } else {
      currentMap.getSource("pins-source").setData(geojson);
    }
  }, [displayedPins, categoryIconMap]);

  // 4. Experience Routes
  useEffect(() => {
    const currentMap = map.current;
    if (!currentMap || !currentMap.isStyleLoaded()) return;

    const manageRoute = async () => {
      if (!currentMap.getSource("experience-route")) {
        currentMap.addSource("experience-route", {
          type: "geojson",
          data: {
            type: "Feature",
            geometry: { type: "LineString", coordinates: [] },
          },
        });
        currentMap.addLayer({
          id: "experience-route-layer",
          type: "line",
          source: "experience-route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": "#d3bc8e",
            "line-width": 4,
            "line-opacity": 0.8,
            "line-dasharray": [2, 2],
          },
        });
      }

      const source = currentMap.getSource("experience-route");

      if (experienceRoute && experienceRoute.length > 1) {
        const waypoints = experienceRoute.map((pin) => ({
          coordinates: [pin.lng, pin.lat],
        }));
        try {
          const response = await directionsClient
            .getDirections({
              profile: "walking",
              waypoints: waypoints,
              geometries: "geojson",
            })
            .send();
          const routeGeoJSON = response.body.routes[0].geometry;
          source.setData({ type: "Feature", geometry: routeGeoJSON });

          const coordinates = routeGeoJSON.coordinates;
          const bounds = new mapboxgl.LngLatBounds(
            coordinates[0],
            coordinates[0]
          );
          for (const coord of coordinates) bounds.extend(coord);

          currentMap.fitBounds(bounds, {
            padding: { top: 100, bottom: 100, left: 100, right: 100 },
            pitch: 45,
            duration: 2500,
            essential: true,
          });
        } catch (error) {
          console.error("Error fetching directions:", error);
        }
      } else {
        source.setData({
          type: "Feature",
          geometry: { type: "LineString", coordinates: [] },
        });
      }
    };
    manageRoute();
  }, [experienceRoute]);

  // 🌟 7. AAA NAVIGATION ROUTE LINE (BULLETPROOF FIX) 🌟
  // 🌟 7. AAA NAVIGATION ROUTE LINE (STRICT GEOJSON FIX) 🌟
  useEffect(() => {
    const currentMap = map.current;
    if (!currentMap) return;

    const manageNavRoute = () => {
      if (!currentMap.isStyleLoaded()) return;

      const sourceId = "active-navigation-route";

      if (!currentMap.getSource(sourceId)) {
        // Initialize strictly as a FeatureCollection
        currentMap.addSource(sourceId, {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });

        currentMap.addLayer({
          id: "route-line-casing",
          type: "line",
          source: sourceId,
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": "#1c1d28",
            "line-width": 10,
            "line-opacity": 0.6,
          },
        });

        currentMap.addLayer({
          id: "route-line-core",
          type: "line",
          source: sourceId,
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": "#4ade80",
            "line-width": 5,
            "line-opacity": 1,
          },
        });
      }

      const source = currentMap.getSource(sourceId);

      if (directionsRoute && directionsRoute.coordinates) {
        console.log(
          `🟢 Map.js received route! Drawing line with ${directionsRoute.coordinates.length} coordinates.`
        );

        // 🌟 STRICT FEATURE COLLECTION FORMAT 🌟
        // Mapbox silently fails if you don't wrap the LineString exactly like this!
        source.setData({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: directionsRoute, // This is the actual LineString
            },
          ],
        });
      } else {
        source.setData({ type: "FeatureCollection", features: [] });
      }
    };

    if (currentMap.isStyleLoaded()) {
      manageNavRoute();
    } else {
      currentMap.once("styledata", manageNavRoute);
    }
  }, [directionsRoute]);

  // 5. Render User GPS Marker
  useEffect(() => {
    if (!map.current || !userLocation) return;
    if (userMarkerRef.current) {
      userMarkerRef.current.setLngLat(userLocation);
    } else {
      const markerElement = document.createElement("div");
      markerElement.className =
        "w-4 h-4 bg-[#e6ce9a] rounded-full border-2 border-[#1c1d28] shadow-[0_0_15px_rgba(230,206,154,0.6)]";
      userMarkerRef.current = new mapboxgl.Marker(markerElement)
        .setLngLat(userLocation)
        .addTo(map.current);
    }
  }, [userLocation]);

  // 6. RENDER PARTY MEMBER GPS MARKERS
  useEffect(() => {
    if (!map.current) return;

    const activeIds = partyLocations.map((p) => p.userId);

    Object.keys(partyMarkersRef.current).forEach((userId) => {
      if (!activeIds.includes(userId)) {
        partyMarkersRef.current[userId].remove();
        delete partyMarkersRef.current[userId];
      }
    });

    partyLocations.forEach((friend) => {
      if (!partyMarkersRef.current[friend.userId]) {
        const el = document.createElement("div");
        el.className =
          "w-10 h-10 rounded-full border-2 border-[#d3bc8e] shadow-[0_0_15px_rgba(211,188,142,0.6)] bg-[#1c1d28] overflow-hidden flex items-center justify-center relative group z-50";

        const img = document.createElement("img");
        img.src =
          friend.avatar_url || "https://placehold.co/100/1c1d28/d3bc8e?text=?";
        img.className = "w-full h-full object-cover";
        el.appendChild(img);

        const tooltip = document.createElement("div");
        tooltip.className =
          "absolute -top-8 bg-[#1c1d28] text-white text-xs font-bold px-2 py-1 rounded border border-[#3b3e52] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none";
        tooltip.innerText = friend.username;
        el.appendChild(tooltip);

        const newMarker = new mapboxgl.Marker(el)
          .setLngLat([friend.lng, friend.lat])
          .addTo(map.current);

        partyMarkersRef.current[friend.userId] = newMarker;
      } else {
        partyMarkersRef.current[friend.userId].setLngLat([
          friend.lng,
          friend.lat,
        ]);
      }
    });
  }, [partyLocations]);

  return (
    <div ref={mapContainer} className="absolute top-0 left-0 w-full h-full" />
  );
};

export default Map;
