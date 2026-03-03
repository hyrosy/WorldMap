import React from 'react';
import { View, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { X } from 'lucide-react-native';

const StoryModal = ({ videoUrl, onClose }) => {
  // If no URL is provided, don't render the modal
  if (!videoUrl) return null;

  return (
    <Modal
      visible={!!videoUrl}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Background Dimming Overlay */}
      <View className="flex-1 items-center justify-center bg-black/90 px-4">
        
        {/* Invisible pressable area to close the modal when tapping outside the video */}
        <Pressable className="absolute inset-0" onPress={onClose} />

        {/* Floating Close Button */}
        <TouchableOpacity 
          className="absolute top-12 right-6 z-50 p-2.5 bg-gray-800/80 border border-gray-600 rounded-full active:bg-gray-700"
          onPress={onClose}
        >
          <X size={24} color="#ffffff" />
        </TouchableOpacity>

        {/* Video Container */}
        <View className="w-full max-w-xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-gray-800 z-10">
          <Video
            source={{ uri: videoUrl }}
            className="w-full h-full"
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay // Replaces HTML 'autoPlay'
            isMuted    // Replaces HTML 'muted'
          />
        </View>

      </View>
    </Modal>
  );
};

export default StoryModal;