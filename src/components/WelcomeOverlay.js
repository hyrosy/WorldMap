import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, Animated, Easing } from 'react-native';

export default function WelcomeOverlay() {
  const [progress, setProgress] = useState(0);
  
  // Create an animated value for the floating effect
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. The Progress Bar Logic
    // Changed to 25ms. (25ms * 100 steps = 2500ms = 2.5 seconds)
    // This is much safer for the React Native bridge than 1.5ms!
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 1;
      });
    }, 25); 

    // 2. The Native Floating Animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -15, // Float up 15 pixels
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0, // Float back down
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        })
      ])
    ).start();

    return () => clearInterval(interval);
  }, [floatAnim]); 

  return (
    <View className="absolute inset-0 bg-black z-50 flex-col items-center justify-center px-8">
      <View className="w-full max-w-md items-center">
        
        {/* The Native Animated Floating Character */}
        <Animated.View 
          style={{ transform: [{ translateY: floatAnim }] }} 
          className="mb-8"
        >
          <Image
            // Note: Update this path if your images are in 'assets' instead of 'public'
            source={require('../../public/pin-icons/flying.png')}
            style={{ width: 80, height: 80 }}
            resizeMode="contain"
          />
        </Animated.View>

        {/* The Progress Bar Container */}
        <View className="w-full bg-gray-800 rounded-full h-2.5 overflow-hidden shadow-lg mb-6">
          {/* Note: React Native doesn't support 'bg-gradient-to-r' natively without expo-linear-gradient.
            I used your app's signature 'cyan-400' color for a solid, clean Native look.
          */}
          <View
            className="bg-cyan-400 h-full rounded-full"
            style={{ width: `${progress}%` }}
          />
        </View>

        {/* The Text */}
        <Text className="text-white text-lg font-bold tracking-wider text-center">
          Entering Hyrosy Interactive Map... {progress}%
        </Text>
        
      </View>
    </View>
  );
}