import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';

const ProductCard = ({ product }) => {
  const router = useRouter();
  
  // Use the first image from WooCommerce, or a default placeholder
  const imageUrl = product.images && product.images.length > 0 
    ? product.images[0].src 
    : 'https://placehold.co/400x400/1f2937/a1a1aa?text=No+Image';

  return (
    <TouchableOpacity 
      onPress={() => router.push(`/product/${product.id}`)}
      // Added 'active:scale-95' for a premium "button press" feel on mobile
      className="flex-1 flex-col overflow-hidden rounded-2xl bg-gray-900 border border-gray-800 active:scale-95 active:bg-gray-800 transition-all m-2 shadow-lg"
    >
      {/* Image Container */}
      <View className="w-full aspect-square bg-gray-800">
        <Image
          source={{ uri: imageUrl }}
          className="w-full h-full"
          resizeMode="cover"
        />
      </View>
      
      {/* Text Content */}
      <View className="p-4 flex-col justify-between flex-1">
        {/* numberOfLines={2} ensures long product names don't break the grid layout */}
        <Text className="text-lg font-bold text-white mb-2 leading-tight" numberOfLines={2}>
          {product.name}
        </Text>
        
        {/* Note: I matched the currency to your database schema (EUR) but feel free to change back to $ if needed */}
        <Text className="text-xl font-black text-cyan-400">
          €{product.price}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default ProductCard;