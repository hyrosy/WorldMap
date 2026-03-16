import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
  Image,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from "react-native";
import { ArrowLeft, X, Plus, Package, Store, Tag } from "lucide-react-native";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

const ITEM_TYPES = ["physical", "ticket", "lore", "booking"];
const RARITIES = ["common", "rare", "epic", "legendary"];

const RARITY_COLORS = {
  common: "border-gray-500 text-gray-400",
  rare: "border-blue-500 text-blue-400",
  epic: "border-purple-500 text-purple-400",
  legendary: "border-[#d3bc8e] text-[#d3bc8e]",
};

export default function MerchantDashboardPanel({ isOpen, onClose }) {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width >= 800;
  const { session } = useAuth();

  const [myItems, setMyItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // New Item Form State
  const [newItem, setNewItem] = useState({
    name: "",
    description: "",
    price: "0",
    item_type: "physical",
    rarity: "common",
    image_url: "",
    stock: "-1",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && session?.user) {
      fetchMyItems();
    }
  }, [isOpen, session]);

  const fetchMyItems = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("merchant_items")
      .select("*")
      .eq("merchant_id", session.user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setMyItems(data);
    }
    setIsLoading(false);
  };

  const handleCreateItem = async () => {
    if (!newItem.name || !newItem.price) {
      toast.error("Name and Price are required!");
      return;
    }

    setIsSubmitting(true);
    const { data, error } = await supabase
      .from("merchant_items")
      .insert([
        {
          merchant_id: session.user.id,
          name: newItem.name,
          description: newItem.description,
          price: parseFloat(newItem.price),
          item_type: newItem.item_type,
          rarity: newItem.rarity,
          image_url:
            newItem.image_url ||
            "https://placehold.co/400x400/1c1d28/d3bc8e?text=New+Item",
          stock: parseInt(newItem.stock, 10),
          currency: "MAD",
        },
      ])
      .select();

    if (error) {
      toast.error("Failed to list item. Check your Guild permissions.");
    } else {
      toast.success(`${newItem.name} has been added to your stock!`);
      setMyItems([data[0], ...myItems]);
      setIsCreating(false);
      setNewItem({
        name: "",
        description: "",
        price: "0",
        item_type: "physical",
        rarity: "common",
        image_url: "",
        stock: "-1",
      });
    }
    setIsSubmitting(false);
  };

  const deleteItem = async (id) => {
    const { error } = await supabase
      .from("merchant_items")
      .delete()
      .eq("id", id);
    if (!error) {
      setMyItems(myItems.filter((item) => item.id !== id));
      toast.info("Item removed from your inventory.");
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      visible={isOpen}
      animationType={Platform.OS === "web" ? "fade" : "slide"}
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View
          className={`flex-1 bg-black/80 backdrop-blur-md ${
            Platform.OS === "web"
              ? "items-center justify-center p-4"
              : "justify-end"
          }`}
        >
          <TouchableOpacity className="absolute inset-0" onPress={onClose} />

          <View
            className={`bg-[#1c1d28] flex-col overflow-hidden shadow-[0_-10px_50px_rgba(0,0,0,0.8)] ${
              isDesktop
                ? "w-[700px] h-[85vh] rounded-2xl border border-[#3b3e52]"
                : "h-[90%] w-full rounded-t-[40px] border-t-2 border-[#3b3e52]"
            }`}
          >
            {/* HEADER */}
            <View className="px-6 py-5 border-b border-[#3b3e52] flex-row justify-between items-center bg-[#2e3142] z-10">
              {isCreating ? (
                <TouchableOpacity
                  onPress={() => setIsCreating(false)}
                  className="p-2 -ml-2 active:scale-95"
                >
                  <ArrowLeft size={20} color="#d3bc8e" />
                </TouchableOpacity>
              ) : (
                <View className="flex-row items-center gap-3">
                  <View className="bg-[#d3bc8e]/20 p-2 rounded-full border border-[#d3bc8e]/50">
                    <Store size={20} color="#d3bc8e" />
                  </View>
                  <Text className="text-xl font-black text-white tracking-tight">
                    Guild Supply
                  </Text>
                </View>
              )}

              <TouchableOpacity
                onPress={onClose}
                className="p-2 bg-[#1c1d28] rounded-full border border-[#3b3e52] active:scale-95"
              >
                <X size={18} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            {/* CONTENT */}
            {isCreating ? (
              // 🌟 CREATION FORM 🌟
              <ScrollView
                className="flex-1 p-6"
                showsVerticalScrollIndicator={false}
              >
                <Text className="text-2xl font-black text-white mb-6">
                  Forge New Item
                </Text>

                <View className="space-y-4 mb-8">
                  <View>
                    <Text className="text-gray-400 font-bold text-xs uppercase mb-2 ml-1">
                      Item Name
                    </Text>
                    <TextInput
                      value={newItem.name}
                      onChangeText={(t) => setNewItem({ ...newItem, name: t })}
                      placeholder="e.g. Desert Quad Tour"
                      placeholderTextColor="#6b7280"
                      className="bg-[#2e3142] border border-[#3b3e52] rounded-xl px-4 h-14 text-white font-bold outline-none"
                    />
                  </View>

                  <View>
                    <Text className="text-gray-400 font-bold text-xs uppercase mb-2 ml-1">
                      Description
                    </Text>
                    <TextInput
                      value={newItem.description}
                      onChangeText={(t) =>
                        setNewItem({ ...newItem, description: t })
                      }
                      placeholder="Describe the item or experience..."
                      placeholderTextColor="#6b7280"
                      multiline
                      className="bg-[#2e3142] border border-[#3b3e52] rounded-xl px-4 py-4 min-h-[100px] text-white outline-none"
                    />
                  </View>

                  <View className="flex-row gap-4">
                    <View className="flex-1">
                      <Text className="text-gray-400 font-bold text-xs uppercase mb-2 ml-1">
                        Price (MAD)
                      </Text>
                      <TextInput
                        value={newItem.price}
                        onChangeText={(t) =>
                          setNewItem({ ...newItem, price: t })
                        }
                        keyboardType="numeric"
                        className="bg-[#2e3142] border border-[#3b3e52] rounded-xl px-4 h-14 text-[#d3bc8e] font-black text-lg outline-none"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-gray-400 font-bold text-xs uppercase mb-2 ml-1">
                        Stock (-1 = Infinite)
                      </Text>
                      <TextInput
                        value={newItem.stock}
                        onChangeText={(t) =>
                          setNewItem({ ...newItem, stock: t })
                        }
                        keyboardType="numeric"
                        className="bg-[#2e3142] border border-[#3b3e52] rounded-xl px-4 h-14 text-white font-bold outline-none"
                      />
                    </View>
                  </View>

                  <View>
                    <Text className="text-gray-400 font-bold text-xs uppercase mb-2 ml-1">
                      Item Type
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                      {ITEM_TYPES.map((type) => (
                        <TouchableOpacity
                          key={type}
                          onPress={() =>
                            setNewItem({ ...newItem, item_type: type })
                          }
                          className={`px-4 py-2 rounded-full border ${
                            newItem.item_type === type
                              ? "bg-[#d3bc8e] border-[#d3bc8e]"
                              : "bg-[#2e3142] border-[#3b3e52]"
                          }`}
                        >
                          <Text
                            className={`${
                              newItem.item_type === type
                                ? "text-[#1c1d28]"
                                : "text-gray-400"
                            } font-bold capitalize`}
                          >
                            {type}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View>
                    <Text className="text-gray-400 font-bold text-xs uppercase mb-2 ml-1">
                      Rarity
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                      {RARITIES.map((rarity) => (
                        <TouchableOpacity
                          key={rarity}
                          onPress={() => setNewItem({ ...newItem, rarity })}
                          className={`px-4 py-2 rounded-full border-2 ${
                            newItem.rarity === rarity
                              ? RARITY_COLORS[rarity]
                              : "border-[#3b3e52] text-gray-500"
                          } bg-[#2e3142]`}
                        >
                          <Text
                            className={`${
                              newItem.rarity === rarity
                                ? RARITY_COLORS[rarity].split(" ")[1]
                                : "text-gray-500"
                            } font-black uppercase text-xs tracking-wider`}
                          >
                            {rarity}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View>
                    <Text className="text-gray-400 font-bold text-xs uppercase mb-2 ml-1">
                      Image URL (Optional)
                    </Text>
                    <TextInput
                      value={newItem.image_url}
                      onChangeText={(t) =>
                        setNewItem({ ...newItem, image_url: t })
                      }
                      placeholder="https://..."
                      placeholderTextColor="#6b7280"
                      className="bg-[#2e3142] border border-[#3b3e52] rounded-xl px-4 h-14 text-white outline-none text-sm"
                    />
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleCreateItem}
                  disabled={isSubmitting}
                  className="w-full h-14 bg-[#4ade80] rounded-xl flex-row items-center justify-center shadow-[0_0_20px_rgba(74,222,128,0.3)] active:scale-95 mb-10"
                >
                  <Text className="text-[#1c1d28] font-black text-lg uppercase tracking-wider">
                    {isSubmitting ? "Forging..." : "List Item For Sale"}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            ) : (
              // 🌟 INVENTORY LIST 🌟
              <View className="flex-1">
                <TouchableOpacity
                  onPress={() => setIsCreating(true)}
                  className="m-6 bg-[#d3bc8e]/10 border border-[#d3bc8e] border-dashed rounded-2xl h-20 items-center justify-center flex-row active:bg-[#d3bc8e]/20"
                >
                  <Plus color="#d3bc8e" size={24} className="mr-2" />
                  <Text className="text-[#d3bc8e] font-black text-lg">
                    Add New Product
                  </Text>
                </TouchableOpacity>

                <ScrollView
                  className="flex-1 px-6"
                  showsVerticalScrollIndicator={false}
                >
                  <Text className="text-gray-500 font-bold uppercase tracking-widest text-xs mb-4 ml-1 border-b border-[#3b3e52] pb-2">
                    Active Stock
                  </Text>

                  {isLoading ? (
                    <ActivityIndicator
                      color="#d3bc8e"
                      size="large"
                      className="mt-10"
                    />
                  ) : myItems.length === 0 ? (
                    <View className="items-center justify-center mt-10 opacity-50">
                      <Package size={48} color="#6b7280" className="mb-3" />
                      <Text className="text-gray-400 font-bold text-base">
                        You have no items listed.
                      </Text>
                    </View>
                  ) : (
                    myItems.map((item) => (
                      <View
                        key={item.id}
                        className="bg-[#2e3142] rounded-xl border border-[#3b3e52] mb-3 p-3 flex-row items-center"
                      >
                        <View className="w-14 h-14 bg-[#1c1d28] rounded-lg overflow-hidden border border-[#3b3e52] mr-3">
                          <Image
                            source={{
                              uri: item.image_url || "https://placehold.co/100",
                            }}
                            className="w-full h-full opacity-80"
                          />
                        </View>
                        <View className="flex-1">
                          <Text
                            className="text-white font-bold text-base mb-0.5"
                            numberOfLines={1}
                          >
                            {item.name}
                          </Text>
                          <Text className="text-[#d3bc8e] font-black text-xs">
                            {item.price} MAD{" "}
                            <Text className="text-gray-500 font-medium ml-2">
                              • Stock: {item.stock}
                            </Text>
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => deleteItem(item.id)}
                          className="p-2 bg-red-500/10 rounded-full border border-red-500/30 active:bg-red-500/20"
                        >
                          <X size={16} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    ))
                  )}
                </ScrollView>
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
