import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  Animated,
  Easing,
  ImageBackground,
  Platform,
} from "react-native";

const GAME_TIPS = [
  "Tip: Tap anywhere on the map to drop a custom pin and build your own itinerary.",
  "Tip: Use the GTA-style Radar to track your party members in real-time.",
  "Tip: You can switch between 2D and 3D views while plotting your routes.",
  "Tip: Save hidden gems to your Personal Atlas to visit them later.",
  "Tip: Exploring clears the Fog of War. Leave your mark on the world.",
];

export default function WelcomeOverlay() {
  const [progress, setProgress] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);

  // Create an animated value for the floating effect
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. The Progress Bar Logic (Synced perfectly to your 4000ms app load time)
    // 40ms * 100 steps = 4000ms (4 seconds)
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 1;
      });
    }, 40);

    // 2. Rotate the Game Tips every 1.5 seconds
    const tipInterval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % GAME_TIPS.length);
    }, 1500);

    // 3. The Native Floating Animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -15, // Float up 15 pixels
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0, // Float back down
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    return () => {
      clearInterval(interval);
      clearInterval(tipInterval);
    };
  }, [floatAnim]);

  return (
    <ImageBackground
      // 🌟 SWAP THIS URL WITH YOUR OWN BEAUTIFUL SPLASH ART OR BLURRED MAP 🌟
      source={{
        uri: "https://wallpapers-clan.com/wp-content/uploads/2025/04/celestial-clouds-pastel-sky-glow-aesthetic-desktop-wallpaper-cover.jpg",
      }}
      className="absolute inset-0 z-[99999] bg-[#1c1d28] justify-end"
      resizeMode="cover"
    >
      {/* Dark Vignette Overlay so text is always readable */}
      <View className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
      <View className="absolute inset-0 bg-black/30" />

      {/* Loading Elements Container - Anchored to the bottom like Genshin */}
      <View className="w-full px-8 pb-12 sm:pb-16 items-center z-10">
        {/* The Native Animated Floating Character */}
        <Animated.View
          style={{ transform: [{ translateY: floatAnim }] }}
          className="mb-8"
        >
          {/* We keep your flying icon, but placed centrally above the bar */}
          <View className="w-20 h-20 bg-[#1c1d28]/80 backdrop-blur-md rounded-full border-2 border-[#d3bc8e] items-center justify-center shadow-[0_0_30px_rgba(211,188,142,0.3)]">
            <Image
              source={require("../../public/pin-icons/flying.png")}
              style={{ width: 45, height: 45 }}
              resizeMode="contain"
            />
          </View>
        </Animated.View>

        {/* Rotating Game Tip */}
        <View className="h-6 mb-4 items-center justify-center">
          <Text className="text-gray-300 text-sm font-medium text-center tracking-wide shadow-black shadow-sm">
            {GAME_TIPS[tipIndex]}
          </Text>
        </View>

        {/* The Progress Bar Container */}
        <View className="w-full max-w-2xl bg-[#2e3142]/80 backdrop-blur-md rounded-full h-1.5 overflow-hidden shadow-2xl mb-3 border border-[#3b3e52]">
          <View
            className="bg-[#d3bc8e] h-full rounded-full shadow-[0_0_10px_rgba(211,188,142,1)]"
            style={{ width: `${progress}%` }}
          />
        </View>

        {/* Loading Text */}
        <View className="w-full max-w-2xl flex-row justify-between px-1">
          <Text className="text-[#d3bc8e] text-[10px] font-black uppercase tracking-widest">
            Connecting to hyrosy World...
          </Text>
          <Text className="text-[#d3bc8e] text-[10px] font-black tracking-widest">
            {progress}%
          </Text>
        </View>
      </View>
    </ImageBackground>
  );
}
