import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  Platform,
  KeyboardAvoidingView,
  useWindowDimensions,
} from "react-native";
import { X, Trash2, CreditCard, Backpack } from "lucide-react-native";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";

// 🌟 RPG RARITY COLORS 🌟
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

export default function TravelerBackpack({ isOpen, onClose }) {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width >= 800;

  // Hook into your existing CartContext!
  // (Assuming it exposes 'cart' or 'cartItems', and 'removeFromCart')
  const { cart, cartItems, removeFromCart } = useCart();

  // Safe fallback depending on how your context is named
  const items = cart || cartItems || [];

  // Calculate the total cost of all items in the backpack
  const totalAmount = items.reduce(
    (sum, item) => sum + (Number(item.price) || 0),
    0
  );

  const handleRemove = (id, name) => {
    if (removeFromCart) {
      removeFromCart(id);
      toast.info(`${name} removed from backpack.`);
    }
  };

  const handleCheckout = () => {
    if (items.length === 0) return;
    toast.success("Initiating checkout sequence...");
    // 🌟 TODO: Route to your actual payment gateway / booking confirmation screen!
  };

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
                ? "w-[500px] max-h-[85vh] rounded-2xl border border-[#3b3e52]"
                : "h-[85%] w-full rounded-t-[40px] border-t-2 border-[#3b3e52]"
            }`}
          >
            {/* 🌟 HEADER 🌟 */}
            <View className="px-6 py-5 border-b border-[#3b3e52] flex-row justify-between items-center bg-[#2e3142] z-10">
              <View className="flex-row items-center gap-3">
                <View className="bg-[#4ade80]/20 p-2 rounded-full border border-[#4ade80]/50">
                  <Backpack size={20} color="#4ade80" />
                </View>
                <Text className="text-xl font-black text-white tracking-tight">
                  Traveler's Backpack
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                className="p-2 bg-[#1c1d28] rounded-full border border-[#3b3e52] active:scale-95"
              >
                <X size={18} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            {/* 🌟 INVENTORY LIST 🌟 */}
            <ScrollView
              className="flex-1 p-4"
              showsVerticalScrollIndicator={false}
            >
              {items.length === 0 ? (
                <View className="items-center justify-center mt-20 opacity-50">
                  <Backpack size={64} color="#6b7280" className="mb-4" />
                  <Text className="text-gray-400 font-bold text-lg">
                    Your backpack is empty.
                  </Text>
                  <Text className="text-gray-500 text-sm mt-2 text-center">
                    Visit a Guild Merchant to stock up for your journey.
                  </Text>
                </View>
              ) : (
                items.map((item, index) => {
                  const rarityTheme =
                    RARITY_COLORS[item.rarity] || RARITY_COLORS.common;
                  // Use item.id combined with index in case they added the same item twice
                  const uniqueKey = `${item.id}-${index}`;

                  return (
                    <View
                      key={uniqueKey}
                      className={`flex-row items-center gap-4 p-3 bg-[#2e3142] rounded-xl mb-3 border-l-4 ${rarityTheme.border} border-t border-r border-b border-t-[#3b3e52] border-r-[#3b3e52] border-b-[#3b3e52] shadow-sm`}
                    >
                      {/* Item Icon */}
                      <View className="w-16 h-16 bg-[#1c1d28] rounded-lg border border-[#3b3e52] overflow-hidden">
                        <Image
                          source={{
                            uri: item.image_url || "https://placehold.co/100",
                          }}
                          className="w-full h-full opacity-90"
                          resizeMode="cover"
                        />
                      </View>

                      {/* Item Details */}
                      <View className="flex-1">
                        <Text
                          className="font-bold text-white text-sm mb-1"
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                        <Text
                          className={`${rarityTheme.text} font-black text-[10px] uppercase tracking-widest mb-1`}
                        >
                          {item.item_type || "Item"}
                        </Text>
                        <Text className="text-[#d3bc8e] font-black text-sm">
                          {item.price} {item.currency || "MAD"}
                        </Text>
                      </View>

                      {/* Drop Item Action */}
                      <TouchableOpacity
                        onPress={() => handleRemove(item.id, item.name)}
                        className="p-3 bg-red-500/10 rounded-full border border-red-500/30 active:bg-red-500/20"
                      >
                        <Trash2 size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
            </ScrollView>

            {/* 🌟 CHECKOUT FOOTER 🌟 */}
            <View className="p-6 bg-[#2e3142] border-t border-[#3b3e52] pb-8">
              <View className="flex-row justify-between items-end mb-4">
                <Text className="text-gray-400 font-bold uppercase tracking-widest text-xs">
                  Total Provisions
                </Text>
                <Text className="text-2xl font-black text-[#d3bc8e]">
                  {totalAmount.toFixed(2)} MAD
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleCheckout}
                disabled={items.length === 0}
                className={`w-full py-4 rounded-xl flex-row items-center justify-center shadow-lg transition-transform active:scale-95 ${
                  items.length === 0
                    ? "bg-[#3b3e52] opacity-50"
                    : "bg-[#4ade80] shadow-[0_0_20px_rgba(74,222,128,0.3)]"
                }`}
              >
                <CreditCard
                  color={items.length === 0 ? "#9ca3af" : "#1c1d28"}
                  size={20}
                  className="mr-2"
                />
                <Text
                  className={`${
                    items.length === 0 ? "text-gray-400" : "text-[#1c1d28]"
                  } font-black text-lg uppercase tracking-wider`}
                >
                  Proceed to Checkout
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
