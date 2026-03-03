import React from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Globe, X } from 'lucide-react-native';

const QuickLocator = ({ cities, onCitySelect, onResetView, isOpen, onClose }) => {
  return (
    <Modal 
      visible={isOpen} 
      transparent={true} 
      animationType="fade" 
      onRequestClose={onClose}
    >
      {/* Background Dimming Overlay */}
      <View className="flex-1 justify-center items-center bg-black/70 px-4">
        
        {/* Invisible pressable area to close the modal when tapping outside */}
        <Pressable className="absolute inset-0" onPress={onClose} />

        {/* Modal Content Box */}
        <View className="w-full max-w-xs bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden z-10">
          
          {/* Header */}
          <View className="p-4 border-b border-gray-800 flex-row justify-between items-center bg-black/40">
            <Text className="font-bold text-white text-lg tracking-wide">Quick Locator</Text>
            <TouchableOpacity 
              onPress={onClose} 
              className="p-1.5 bg-gray-800 rounded-full active:bg-gray-700"
            >
              <X size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>
          
          {/* Options List */}
          <View className="p-3">
            
            {/* Special Button for Reset View */}
            <TouchableOpacity
              onPress={onResetView}
              className="w-full flex-row items-center px-4 py-3.5 rounded-xl bg-cyan-900/20 border border-cyan-900/50 mb-3 active:bg-cyan-900/40 transition-colors"
            >
              <Globe size={18} color="#22d3ee" className="mr-3" />
              <Text className="text-cyan-400 font-bold text-base">View All Morocco</Text>
            </TouchableOpacity>

            {/* Map over the cities */}
            {cities && Object.entries(cities).map(([key, city]) => (
              <TouchableOpacity
                key={key}
                onPress={() => onCitySelect(key)}
                className="w-full px-4 py-3.5 rounded-xl bg-transparent mb-1 active:bg-gray-800 border border-transparent active:border-gray-700 transition-colors"
              >
                <Text className="text-gray-300 font-semibold text-base">{city.name}</Text>
              </TouchableOpacity>
            ))}
            
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default QuickLocator;