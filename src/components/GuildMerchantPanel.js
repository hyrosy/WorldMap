import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  ActivityIndicator,
  Platform,
  SafeAreaView,
  useWindowDimensions,
} from "react-native";
import {
  X,
  ShoppingBag,
  MapPin,
  Package,
  Ticket,
  BookOpen,
  Star,
} from "lucide-react-native";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { useCart } from "@/context/CartContext"; // We will update this to an Inventory context later!

// RPG Rarity Color Mapping
const RARITY_COLORS = {
  common: {
    border: "border-gray-500",
    bg: "bg-gray-500/10",
    text: "text-gray-400",
  },
  rare: {
    border: "border-blue-500",
    bg: "bg-blue-500/10",
    text: "text-blue-400",
  },
  epic: {
    border: "border-purple-500",
    bg: "bg-purple-500/10",
    text: "text-purple-400",
  },
  legendary: {
    border: "border-[#d3bc8e]",
    bg: "bg-[#d3bc8e]/10",
    text: "text-[#d3bc8e]",
  },
};

export default function GuildMerchantPanel({ isOpen, onClose }) {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width >= 800;
  const { addToCart } = useCart();

  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all"); // 'all', 'physical', 'ticket', 'lore'
  const [selectedItem, setSelectedItem] = useState(null);

  // Fetch items from Supabase when the panel opens
  useEffect(() => {
    if (!isOpen) return;

    const fetchStoreItems = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("merchant_items")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        toast.error("Failed to contact the Guild Merchant.");
      } else {
        setItems(data || []);
      }
      setIsLoading(false);
    };

    fetchStoreItems();
  }, [isOpen]);

  const filteredItems =
    activeTab === "all"
      ? items
      : items.filter((item) => item.item_type === activeTab);

  const handlePurchase = (item) => {
    addToCart(item); // For now, we route it to your existing Cart!
    toast.success(`${item.name} added to your backpack!`);
    setSelectedItem(null);
  };

  // --- ITEM DETAIL VIEW (When you click an item in the grid) ---
  if (selectedItem) {
    const rarityTheme =
      RARITY_COLORS[selectedItem.rarity] || RARITY_COLORS.common;

    return (
      <Modal
        visible={isOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSelectedItem(null)}
      >
        <View className="flex-1 bg-black/80 items-center justify-center p-4 backdrop-blur-sm">
          <View
            className={`bg-[#1c1d28] border-2 ${rarityTheme.border} rounded-3xl w-full max-w-md overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]`}
          >
            <View className="relative w-full h-64 bg-[#2e3142]">
              <Image
                source={{
                  uri: selectedItem.image_url || "https://placehold.co/400",
                }}
                className="w-full h-full"
                resizeMode="cover"
              />
              <TouchableOpacity
                onPress={() => setSelectedItem(null)}
                className="absolute top-4 right-4 bg-[#1c1d28]/80 p-2 rounded-full border border-[#3b3e52]"
              >
                <X color="#9ca3af" size={20} />
              </TouchableOpacity>
              <View className="absolute bottom-4 left-4 bg-black/70 px-3 py-1 rounded-full border border-gray-600 backdrop-blur-md">
                <Text
                  className={`${rarityTheme.text} font-black text-xs uppercase tracking-widest`}
                >
                  {selectedItem.rarity}
                </Text>
              </View>
            </View>

            <View className="p-6">
              <Text className="text-2xl font-black text-white mb-2">
                {selectedItem.name}
              </Text>
              <Text className="text-gray-300 leading-6 mb-6">
                {selectedItem.description}
              </Text>

              <View className="flex-row items-center justify-between bg-[#2e3142] p-4 rounded-xl border border-[#3b3e52] mb-6">
                <View>
                  <Text className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">
                    Price
                  </Text>
                  <Text className="text-[#d3bc8e] font-black text-xl">
                    {selectedItem.price} {selectedItem.currency}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">
                    Stock
                  </Text>
                  <Text className="text-white font-bold">
                    {selectedItem.stock === -1
                      ? "Unlimited"
                      : selectedItem.stock}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => handlePurchase(selectedItem)}
                className={`w-full py-4 rounded-xl flex-row justify-center items-center gap-2 ${rarityTheme.bg} border ${rarityTheme.border} active:scale-95`}
              >
                <ShoppingBag
                  color={
                    selectedItem.rarity === "legendary" ? "#d3bc8e" : "white"
                  }
                  size={20}
                />
                <Text
                  className={`${
                    selectedItem.rarity === "legendary"
                      ? "text-[#d3bc8e]"
                      : "text-white"
                  } font-black text-lg uppercase tracking-wider`}
                >
                  Acquire Item
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // --- MAIN GRID VIEW ---
  return (
    <Modal
      visible={isOpen}
      animationType={Platform.OS === "web" ? "fade" : "slide"}
      transparent={true}
      onRequestClose={onClose}
    >
      <View
        className={`flex-1 bg-black/60 backdrop-blur-sm ${
          Platform.OS === "web"
            ? "items-center justify-center p-4"
            : "justify-end"
        }`}
      >
        <TouchableOpacity className="absolute inset-0" onPress={onClose} />

        <View
          className={`bg-[#1c1d28] flex-col overflow-hidden shadow-[0_-10px_50px_rgba(0,0,0,0.8)] ${
            isDesktop
              ? "w-[850px] h-[85vh] rounded-2xl border border-[#3b3e52]"
              : "h-[90%] w-full rounded-t-[40px] border-t-2 border-[#3b3e52]"
          }`}
        >
          {/* Header */}
          <View className="px-6 py-5 border-b border-[#3b3e52] flex-row justify-between items-center bg-[#2e3142] z-10">
            <View className="flex-row items-center gap-3">
              <View className="bg-[#d3bc8e]/20 p-2 rounded-full border border-[#d3bc8e]/50">
                <ShoppingBag size={20} color="#d3bc8e" />
              </View>
              <Text className="text-xl font-black text-white tracking-tight">
                Guild Merchant
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              className="p-2 bg-[#1c1d28] rounded-full border border-[#3b3e52] active:scale-95"
            >
              <X size={18} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          {/* Filtering Tabs */}
          <View className="flex-row border-b border-[#3b3e52] bg-[#1c1d28]">
            {[
              { id: "all", icon: Star, label: "All Items" },
              { id: "physical", icon: Package, label: "Physical" },
              { id: "ticket", icon: Ticket, label: "Tickets" },
              { id: "lore", icon: BookOpen, label: "Lore" },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                className={`flex-1 py-4 items-center justify-center flex-row gap-2 border-b-2 ${
                  activeTab === tab.id
                    ? "border-[#d3bc8e] bg-[#2e3142]/50"
                    : "border-transparent"
                }`}
              >
                <tab.icon
                  size={14}
                  color={activeTab === tab.id ? "#d3bc8e" : "#6b7280"}
                />
                {isDesktop && (
                  <Text
                    className={
                      activeTab === tab.id
                        ? "text-[#d3bc8e] font-bold text-xs uppercase tracking-wider"
                        : "text-gray-500 font-bold text-xs uppercase tracking-wider"
                    }
                  >
                    {tab.label}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Inventory Grid */}
          <ScrollView
            className="flex-1 p-4"
            showsVerticalScrollIndicator={false}
          >
            {isLoading ? (
              <ActivityIndicator
                color="#d3bc8e"
                size="large"
                className="mt-20"
              />
            ) : filteredItems.length === 0 ? (
              <View className="items-center justify-center mt-20 opacity-50">
                <ShoppingBag size={64} color="#6b7280" className="mb-4" />
                <Text className="text-gray-400 font-bold text-lg">
                  The merchant's stock is empty.
                </Text>
              </View>
            ) : (
              <View className="flex-row flex-wrap justify-between">
                {filteredItems.map((item) => {
                  const rarityTheme =
                    RARITY_COLORS[item.rarity] || RARITY_COLORS.common;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => setSelectedItem(item)}
                      className={`w-[48%] mb-4 bg-[#2e3142] rounded-2xl overflow-hidden border-2 ${rarityTheme.border} shadow-lg active:scale-95`}
                    >
                      <View className="h-32 w-full bg-[#1c1d28] relative">
                        <Image
                          source={{
                            uri: item.image_url || "https://placehold.co/200",
                          }}
                          className="w-full h-full opacity-90"
                          resizeMode="cover"
                        />
                        {/* Map Pin Indicator if tied to a location */}
                        {item.pin_id && (
                          <View className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-full backdrop-blur-sm border border-gray-500">
                            <MapPin size={12} color="white" />
                          </View>
                        )}
                      </View>
                      <View className="p-3">
                        <Text
                          className="text-white font-bold text-sm mb-1"
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                        <Text className="text-[#d3bc8e] font-black text-xs">
                          {item.price} {item.currency}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
