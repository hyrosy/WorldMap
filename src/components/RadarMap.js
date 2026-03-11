"use client";

import React, { useRef, useEffect } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import * as turf from "@turf/turf";

mapboxgl.accessToken =
  process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
  process.env.EXPO_PUBLIC_MAPBOX_TOKEN ||
  "pk.eyJ1IjoiaHlyb3N5IiwiYSI6ImNtZW84aHIyMzFjNXEybXNlZzN0c294N3oifQ.xSS6R2U0ClqqtR9Tfxmntw";

export default function RadarMap({
  userLocation,
  walkedPath = [],
  partyLocations = [],
}) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markersRef = useRef({});

  useEffect(() => {
    if (map.current) return;

    // 🌟 THE GTA RADAR STYLE (Dark, Minimal) 🌟
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: userLocation || [-7.98, 31.63],
      zoom: 14,
      pitch: 0, // Strictly top-down 2D
      attributionControl: false,
    });

    map.current.on("load", () => {
      // 1. The Global Dark Fog Rectangle
      const worldBox = turf.bboxPolygon([-180, -85, 180, 85]);
      map.current.addSource("fog-source", { type: "geojson", data: worldBox });

      map.current.addLayer({
        id: "fog-layer",
        type: "fill",
        source: "fog-source",
        paint: {
          "fill-color": "#000000",
          "fill-opacity": 0.25, // Dark fog covering everything
        },
      });

      // 2. Draw the player's path line
      map.current.addSource("walked-path", {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: { type: "LineString", coordinates: [] },
        },
      });
      map.current.addLayer({
        id: "walked-path-layer",
        type: "line",
        source: "walked-path",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#4ade80",
          "line-width": 3,
          "line-opacity": 0.5,
        }, // Faint green trail
      });
    });

    return () => map.current?.remove();
  }, []);

  // 🌟 FOG OF WAR CUTTER (OPTIMIZED FOR PERSISTENT DATA) 🌟
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded() || walkedPath.length === 0)
      return;

    const worldBox = turf.bboxPolygon([-180, -85, 180, 85]);
    let exploredArea;

    if (walkedPath.length === 1) {
      // Just a single point (brand new user)
      exploredArea = turf.buffer(turf.point(walkedPath[0]), 50, {
        units: "meters",
      });
    } else {
      // Create the raw path
      let rawLine = turf.lineString(walkedPath);

      // 🚀 PERFORMANCE FIX: Simplify the path
      // This removes redundant points in straight lines so Turf.js doesn't crash
      // when calculating the buffer for weeks of walking data.
      let optimizedLine = turf.simplify(rawLine, {
        tolerance: 0.0001,
        highQuality: false,
      });

      // Create the 50-meter vision bubble around the optimized path
      exploredArea = turf.buffer(optimizedLine, 50, { units: "meters" });

      map.current.getSource("walked-path")?.setData({
        type: "Feature",
        geometry: optimizedLine.geometry,
      });
    }

    // Cut the hole in the fog!
    try {
      const fogMask = turf.difference(worldBox, exploredArea);
      map.current.getSource("fog-source")?.setData(fogMask || worldBox);
    } catch (error) {
      console.error("Fog calculation error:", error);
    }
  }, [walkedPath]);

  // 🌟 RADAR BLIPS (You + Friends) 🌟
  useEffect(() => {
    if (!map.current) return;

    // Center map on user
    if (userLocation) map.current.easeTo({ center: userLocation });

    // Draw My Blip
    if (!markersRef.current["me"] && userLocation) {
      const el = document.createElement("div");
      el.className =
        "w-4 h-4 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.8)] border-[3px] border-black";
      markersRef.current["me"] = new mapboxgl.Marker(el)
        .setLngLat(userLocation)
        .addTo(map.current);
    } else if (userLocation) {
      markersRef.current["me"].setLngLat(userLocation);
    }

    // Draw Friends Blips
    const activeIds = partyLocations.map((p) => p.userId);
    Object.keys(markersRef.current).forEach((id) => {
      if (id !== "me" && !activeIds.includes(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    partyLocations.forEach((friend) => {
      if (!markersRef.current[friend.userId]) {
        const el = document.createElement("div");
        el.className =
          "w-4 h-4 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.8)] border-[3px] border-black";
        markersRef.current[friend.userId] = new mapboxgl.Marker(el)
          .setLngLat([friend.lng, friend.lat])
          .addTo(map.current);
      } else {
        markersRef.current[friend.userId].setLngLat([friend.lng, friend.lat]);
      }
    });
  }, [userLocation, partyLocations]);

  return <div ref={mapContainer} className="w-full h-full bg-[#050608]" />;
}
