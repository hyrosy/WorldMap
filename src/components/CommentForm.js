import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Image, ScrollView, Platform } from 'react-native';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { ImagePlus, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

export default function CommentForm({ locationId, onCommentPosted }) {
  const { session } = useAuth();
  const [content, setContent] = useState('');
  const [images, setImages] = useState([]); // Holds selected image objects
  const [uploading, setUploading] = useState(false);

  // Cross-platform Image Picker
  const pickImages = async () => {
    // Request permission on Native
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Sorry, we need camera roll permissions to upload images!');
        return;
      }
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 3 - images.length, // Max 3 images total
      quality: 0.8,
    });

    if (!result.canceled) {
      const newImages = result.assets.map(asset => ({
        uri: asset.uri,
        // Provide fallbacks for file names and types if missing
        fileName: asset.fileName || asset.uri.split('/').pop() || `image_${Date.now()}.jpg`,
        type: asset.mimeType || 'image/jpeg',
      }));
      setImages(prev => [...prev, ...newImages].slice(0, 3));
    }
  };

  const removeImage = (indexToRemove) => {
    setImages(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  // Helper to upload a single image to Supabase
  const uploadImageToSupabase = async (image) => {
    try {
      // Universal way to get file blob from URI (works on Web & Native!)
      const res = await fetch(image.uri);
      const fileBody = await res.blob();

      const fileExt = image.fileName.split('.').pop() || 'jpg';
      const filePath = `${session.user.id}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('comment-images')
        .upload(filePath, fileBody, {
          contentType: image.type,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('comment-images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!content.trim() && images.length === 0) return;

    setUploading(true);

    let imageUrls = [];
    if (images.length > 0) {
      for (const img of images) {
        const url = await uploadImageToSupabase(img);
        if (url) imageUrls.push(url);
      }
    }

    // Pass both content and imageUrls to the parent to post to the DB
    await onCommentPosted(content, imageUrls);

    // Reset form
    setContent('');
    setImages([]);
    setUploading(false);
  };

  return (
    <View className="bg-gray-800/80 border border-gray-700 p-4 rounded-2xl mb-4 shadow-sm">
      <Text className="font-bold text-white mb-3 text-sm uppercase tracking-wider">Leave a Tip</Text>
      
      <TextInput
        value={content}
        onChangeText={setContent}
        placeholder="Share your experience or tips for others..."
        placeholderTextColor="#6b7280"
        multiline
        textAlignVertical="top"
        className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl p-3 min-h-[80px] mb-3 text-base leading-6"
      />

      {/* Image Previews */}
      {images.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
          {images.map((img, index) => (
            <View key={index} className="relative mr-3">
              <Image 
                source={{ uri: img.uri }} 
                className="w-20 h-20 rounded-lg bg-gray-900 border border-gray-700" 
                resizeMode="cover"
              />
              <TouchableOpacity 
                onPress={() => removeImage(index)}
                className="absolute -top-2 -right-2 bg-gray-800 rounded-full p-1 border border-gray-600"
              >
                <X size={14} color="#fca5a5" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Action Row */}
      <View className="flex-row justify-between items-center">
        <TouchableOpacity 
          onPress={pickImages} 
          disabled={images.length >= 3 || uploading}
          className={`flex-row items-center p-2 rounded-lg ${images.length >= 3 ? 'opacity-50' : 'active:bg-gray-700'}`}
        >
          <ImagePlus size={22} color={images.length >= 3 ? '#6b7280' : '#22d3ee'} />
          <Text className={`ml-2 font-medium ${images.length >= 3 ? 'text-gray-500' : 'text-cyan-400'}`}>
            {images.length >= 3 ? 'Max 3 Photos' : 'Add Photo'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={handleSubmit}
          disabled={uploading || (!content.trim() && images.length === 0)}
          className={`px-5 py-2.5 rounded-full flex-row items-center justify-center shadow-lg ${
            uploading || (!content.trim() && images.length === 0) 
              ? 'bg-gray-700' 
              : 'bg-[#d3bc8e] active:bg-[#c2a977]'
          }`}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text className="text-black font-bold">Post Tip</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}