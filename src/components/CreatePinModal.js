import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { MapPin, X, Check } from "lucide-react-native";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

export default function CreatePinModal({
  isOpen,
  onClose,
  coordinates,
  session,
  currentWorld,
  existingLists,
  onSuccess,
}) {
  const [isSubmittingPin, setIsSubmittingPin] = useState(false);
  const [isCreatingNewList, setIsCreatingNewList] = useState(false);
  const [newPinData, setNewPinData] = useState({
    name: "",
    category: "Favorites",
    description: "",
    image_url: "",
  });

  // Reset form when opened with new coordinates
  useEffect(() => {
    if (isOpen) {
      setNewPinData({
        name: "",
        category: "Favorites",
        description: "",
        image_url: "",
      });
      setIsCreatingNewList(false);
    }
  }, [isOpen, coordinates]);

  const handleCreatePin = async () => {
    if (!newPinData.name) return toast.error("Please name your location!");
    if (!newPinData.category) return toast.error("Please provide a list name!");

    setIsSubmittingPin(true);
    let targetTable = "personal_pins";
    let insertPayload = {
      ...newPinData,
      lat: coordinates.lat,
      lng: coordinates.lng,
      user_id: session.user.id,
    };

    if (currentWorld.id !== "base") {
      targetTable = "world_pins";
      insertPayload = {
        ...newPinData,
        lat: coordinates.lat,
        lng: coordinates.lng,
        world_id: currentWorld.id,
        added_by: session.user.id,
      };
      delete insertPayload.user_id;
    }

    const { error } = await supabase.from(targetTable).insert([insertPayload]);
    setIsSubmittingPin(false);

    if (error) {
      toast.error("Failed to save location");
    } else {
      toast.success("Location secured!");
      onSuccess(insertPayload); // Updates the pins on the map
      onClose();
    }
  };

  if (!isOpen || !coordinates) return null;

  return (
    <Modal
      visible={isOpen}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 items-center justify-center bg-black/80 p-4 pointer-events-auto backdrop-blur-sm">
          <View className="bg-[#2e3142] border border-[#3b3e52] rounded-3xl p-6 w-full max-w-md shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden">
            <View className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#e6ce9a] to-[#d3bc8e]" />

            <View className="flex-row justify-between items-center mb-6 mt-2">
              <View>
                <Text className="text-2xl font-black text-white flex-row items-center gap-2">
                  <MapPin color="#d3bc8e" size={24} /> Drop Location
                </Text>
                <Text className="text-gray-400 text-xs font-mono mt-1">
                  {coordinates.lat?.toFixed(5)}°, {coordinates.lng?.toFixed(5)}°
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                className="p-2 bg-[#1c1d28] rounded-full hover:bg-[#3b3e52] border border-[#3b3e52] active:scale-95"
              >
                <X color="#9ca3af" size={20} />
              </TouchableOpacity>
            </View>

            <View className="space-y-4 mb-8">
              <View>
                <Text className="text-[#d3bc8e] text-xs font-bold uppercase tracking-wider mb-2">
                  Location Name
                </Text>
                <TextInput
                  className="w-full bg-[#1c1d28] text-white px-4 py-4 rounded-xl border border-[#3b3e52] focus:border-[#d3bc8e]"
                  placeholder="e.g., Secret Rooftop Cafe"
                  placeholderTextColor="#6b7280"
                  value={newPinData.name}
                  onChangeText={(text) =>
                    setNewPinData({ ...newPinData, name: text })
                  }
                />
              </View>

              <View>
                <View className="flex-row justify-between items-end mb-2 mt-4">
                  <Text className="text-[#d3bc8e] text-xs font-bold uppercase tracking-wider">
                    List / Category
                  </Text>
                  <TouchableOpacity
                    onPress={() => setIsCreatingNewList(!isCreatingNewList)}
                  >
                    <Text className="text-[#d3bc8e] text-[10px] font-bold uppercase tracking-wider bg-[#1c1d28] px-2 py-1 rounded-md border border-[#3b3e52]">
                      {isCreatingNewList ? "Choose Existing" : "+ New List"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {isCreatingNewList ? (
                  <TextInput
                    className="w-full bg-[#1c1d28] text-white px-4 py-4 rounded-xl border border-[#3b3e52]"
                    placeholder="e.g., Hidden Gems"
                    placeholderTextColor="#6b7280"
                    value={newPinData.category}
                    onChangeText={(text) =>
                      setNewPinData({ ...newPinData, category: text })
                    }
                  />
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="flex-row pb-2"
                  >
                    {existingLists.map((listName) => (
                      <TouchableOpacity
                        key={listName}
                        onPress={() =>
                          setNewPinData({ ...newPinData, category: listName })
                        }
                        className={`mr-2 px-4 py-3 rounded-xl border ${
                          newPinData.category === listName
                            ? "bg-[#d3bc8e] border-[#d3bc8e]"
                            : "bg-[#1c1d28] border-[#3b3e52]"
                        }`}
                      >
                        <Text
                          className={
                            newPinData.category === listName
                              ? "text-[#1c1d28] font-bold"
                              : "text-gray-400 font-medium"
                          }
                        >
                          {listName}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>

              <View className="mt-2">
                <Text className="text-[#d3bc8e] text-xs font-bold uppercase tracking-wider mb-2">
                  Description / Notes
                </Text>
                <TextInput
                  className="w-full bg-[#1c1d28] text-white px-4 py-4 rounded-xl border border-[#3b3e52]"
                  placeholder="What makes this place special?"
                  placeholderTextColor="#6b7280"
                  multiline={true}
                  numberOfLines={4}
                  value={newPinData.description}
                  onChangeText={(text) =>
                    setNewPinData({ ...newPinData, description: text })
                  }
                  style={{ minHeight: 100, textAlignVertical: "top" }}
                />
              </View>
            </View>

            <TouchableOpacity
              className="w-full bg-[#e6ce9a] py-4 rounded-xl flex-row justify-center items-center gap-2 shadow-[0_0_20px_rgba(230,206,154,0.3)] active:scale-95"
              onPress={handleCreatePin}
              disabled={isSubmittingPin}
            >
              {isSubmittingPin ? (
                <ActivityIndicator color="#1c1d28" />
              ) : (
                <>
                  <Check color="#1c1d28" size={20} />
                  <Text className="text-[#1c1d28] font-bold text-lg">
                    Save Location
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
