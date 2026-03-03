import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Tag } from 'lucide-react-native';

const CategorySidebar = ({ categories, selectedCategory, onSelectCategory }) => {
  return (
    <View className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex-1 shadow-sm">
      
      {/* Sidebar Header */}
      <View className="flex-row items-center mb-5 pb-4 border-b border-gray-800">
        <Tag size={20} color="#22d3ee" className="mr-3" />
        <Text className="text-lg font-bold text-white tracking-wide">Categories</Text>
      </View>
      
      {/* Scrollable Category List */}
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        
        {/* "All" Button */}
        <TouchableOpacity
          onPress={() => onSelectCategory(null)}
          className={`w-full px-4 py-3.5 rounded-xl flex-row items-center mb-2 transition-colors ${
            !selectedCategory 
                ? 'bg-cyan-600 shadow-md' 
                : 'bg-transparent active:bg-gray-800'
          }`}
        >
          <Text className={`text-sm ${!selectedCategory ? 'text-white font-black' : 'text-gray-400 font-semibold'}`}>
            All Experiences
          </Text>
        </TouchableOpacity>

        {/* Mapped Categories */}
        {categories && categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            onPress={() => onSelectCategory(category.id)}
            className={`w-full px-4 py-3.5 rounded-xl flex-row items-center mb-2 transition-colors ${
              selectedCategory === category.id 
                ? 'bg-cyan-600 shadow-md' 
                : 'bg-transparent active:bg-gray-800'
            }`}
          >
            <Text className={`text-sm ${selectedCategory === category.id ? 'text-white font-black' : 'text-gray-400 font-semibold'}`}>
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
        
      </ScrollView>
    </View>
  );
};

export default CategorySidebar;