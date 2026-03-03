import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';

// Helper for cross-platform alerts
const showAlert = (title, message) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}: ${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export default function AddToExperiencePopover({ pin, closePopover }) {
  const { session } = useAuth();
  const [maps, setMaps] = useState([]); // Changed from 'routes' to 'maps'
  const [loading, setLoading] = useState(true);
  const [newMapTitle, setNewMapTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // 1. Fetch the user's existing Maps and their current Pins
  useEffect(() => {
    const fetchUserMaps = async () => {
      if (!session?.user) return;
      setLoading(true);
      
      const { data, error } = await supabase
        .from('user_maps')
        .select('id, title, user_map_pins(location_id)') // Fetch the map and its pins
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching user maps:', error);
      } else {
        setMaps(data);
      }
      setLoading(false);
    };
    fetchUserMaps();
  }, [session]);

  // 2. Add the pin to an existing Map
  const handleAddToExisting = async (map) => {
    // Check if the pin is already in this map
    const existingPinIds = map.user_map_pins.map(p => p.location_id);
    
    if (existingPinIds.includes(pin.id)) {
        showAlert("Already exists", `This location is already in "${map.title}".`);
        closePopover();
        return;
    }

    // Insert into the relational table. We put it at the end of the list (order_index)
    const { error } = await supabase
      .from('user_map_pins')
      .insert({
          map_id: map.id,
          location_id: pin.id,
          order_index: existingPinIds.length 
      });
    
    if (error) {
        showAlert("Error", "Could not add to experience.");
    } else {
        showAlert("Success!", `Added to "${map.title}".`);
    }
    closePopover();
  };

  // 3. Create a new Map and add the current pin to it
  const handleCreateAndAdd = async () => {
    if (!newMapTitle.trim() || !session?.user) return;
    
    setIsCreating(true);
    
    // Step A: Create the new Map
    const { data: newMapData, error: mapError } = await supabase
      .from('user_maps')
      .insert({
        title: newMapTitle,
        user_id: session.user.id,
      })
      .select()
      .single();

    if (mapError) {
        showAlert("Error", "Could not create experience.");
        setIsCreating(false);
        return;
    }

    // Step B: Add the Pin to the newly created Map
    const { error: pinError } = await supabase
        .from('user_map_pins')
        .insert({
            map_id: newMapData.id,
            location_id: pin.id,
            order_index: 0
        });

    if (pinError) {
        showAlert("Error", `Created "${newMapTitle}" but failed to add the location.`);
    } else {
        showAlert("Success!", `Created "${newMapTitle}" and added location.`);
    }
    
    setIsCreating(false);
    closePopover();
  };

  if (loading) {
    return (
        <View className="p-6 items-center justify-center">
            <ActivityIndicator color="#22d3ee" />
        </View>
    );
  }

  return (
    <View className="flex-col w-full">
        <Text className="font-bold text-gray-300 text-sm mb-3 uppercase tracking-wider">Your Maps</Text>
        
        {/* Existing Maps List */}
        <ScrollView className="max-h-40 mb-4" showsVerticalScrollIndicator={false}>
            {maps.length > 0 ? (
                maps.map(map => (
                    <TouchableOpacity 
                        key={map.id} 
                        onPress={() => handleAddToExisting(map)}
                        className="w-full bg-gray-900 border border-gray-700 p-3 rounded-lg mb-2 active:bg-gray-700 transition-colors"
                    >
                        <Text className="text-white font-medium">{map.title}</Text>
                        <Text className="text-xs text-cyan-400 mt-1">{map.user_map_pins.length} locations</Text>
                    </TouchableOpacity>
                ))
            ) : (
                <Text className="text-gray-500 italic text-sm py-2">No maps created yet.</Text>
            )}
        </ScrollView>

        <View className="pt-4 border-t border-gray-700">
            <Text className="font-bold text-gray-300 text-sm mb-3 uppercase tracking-wider">Create New Map</Text>
            <View className="space-y-3">
                <TextInput 
                    placeholder="New experience name..." 
                    placeholderTextColor="#9ca3af"
                    value={newMapTitle}
                    onChangeText={setNewMapTitle}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white"
                />
                <TouchableOpacity 
                    onPress={handleCreateAndAdd}
                    disabled={isCreating || !newMapTitle.trim()}
                    className={`w-full h-12 rounded-lg items-center justify-center ${isCreating || !newMapTitle.trim() ? 'bg-gray-700' : 'bg-green-600 active:bg-green-700'}`}
                >
                    {isCreating ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="text-white font-bold">Create & Add</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    </View>
  );
}