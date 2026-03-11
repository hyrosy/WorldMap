import React, { useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  Dimensions,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import {
  MapPin,
  ShoppingBag,
  User,
  Search,
  ArrowRight,
  MessageCircle,
  Compass,
  Trophy,
  CloudRain,
  Users,
  ShieldCheck,
  Coins,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import ChatHub from "../components/ChatHub"; // 🌟 Import ChatHub

const { width } = Dimensions.get("window");

const REGIONS = [
  {
    id: "marrakech",
    name: "Marrakech",
    image:
      "https://images.unsplash.com/photo-1597211661944-8e433c1d5e46?q=80&w=800&auto=format&fit=crop", // Fixed URL parameters
    description: "The Red City",
    exploration: 14,
    stats: { weather: "28°C", crowds: "High", safety: "Secure" },
  },
  {
    id: "casablanca",
    name: "Casablanca",
    image:
      "https://images.unsplash.com/photo-1539020140153-e479b8c22e70?q=80&w=800&auto=format&fit=crop",
    description: "Modern Heritage",
    exploration: 0,
    stats: { weather: "22°C", crowds: "Moderate", safety: "Secure" },
  },
  {
    id: "rabat",
    name: "Rabat",
    image:
      "https://images.unsplash.com/photo-1534449835073-61aa157b120a?q=80&w=800&auto=format&fit=crop",
    description: "Capital of Culture",
    exploration: 5,
    stats: { weather: "21°C", crowds: "Low", safety: "High" },
  },
];

const FEATURES = [
  {
    title: "Fog of War",
    desc: "Every step you take in Morocco clears the dark mist on your personal 3D map.",
    icon: Search,
  },
  {
    title: "Merchant Guild",
    desc: "Buy authentic local artifacts directly from verified artisans.",
    icon: ShoppingBag,
  },
  {
    title: "Party Radar",
    desc: "See your friends moving in real-time on the GTA-style mini-map.",
    icon: Users,
  },
];

export default function UniversalHome() {
  const { user } = useAuth();
  const { cart } = useCart();
  const router = useRouter();
  const [isChatOpen, setIsChatOpen] = useState(false); // 🌟 Chat State

  const displayName = user?.user_metadata?.username || "Traveler";

  return (
    <View className="flex-1 bg-[#050608]">
      <Stack.Screen options={{ headerShown: false }} />

      {/* 🌟 FULL WIDTH CONTAINER 🌟 */}
      <SafeAreaView className="flex-1 w-full bg-[#1c1d28]">
        {/* HEADER */}
        <View className="flex-row justify-between items-center px-6 py-4 bg-[#2e3142] border-b border-[#3b3e52] pt-12 shadow-md z-20">
          <View className="flex-row items-center gap-3">
            <View className="w-10 h-10 bg-[#1c1d28] border-2 border-[#d3bc8e] rounded-full items-center justify-center">
              <Text className="text-[#d3bc8e] font-black text-xl">H</Text>
            </View>
            <View className="hidden sm:flex">
              <Text className="text-xl font-black text-white">hyrosy</Text>
              <Text className="text-[#d3bc8e] text-[10px] font-bold tracking-widest">
                RANK 12 TRAVELER
              </Text>
            </View>
          </View>

          <View className="flex-row items-center gap-4">
            <TouchableOpacity
              onPress={() => setIsChatOpen(true)}
              className="p-2 relative"
            >
              <MessageCircle size={24} color="#d3bc8e" />
              <View className="absolute top-1 right-1 bg-red-500 w-3 h-3 rounded-full border-2 border-[#2e3142]" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/store")}
              className="p-2 relative"
            >
              <ShoppingBag size={24} color="#9ca3af" />
              {cart.length > 0 && (
                <View className="absolute top-1 right-1 bg-[#d3bc8e] w-4 h-4 rounded-full items-center justify-center">
                  <Text className="text-[9px] text-[#1c1d28] font-bold">
                    {cart.length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push(user ? "/account" : "/auth")}
            >
              <View className="w-10 h-10 bg-[#1c1d28] rounded-full items-center justify-center border border-[#d3bc8e]">
                <User size={20} color="#d3bc8e" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {/* HERO SECTION - Responsive Grid */}
          <View className="flex-row flex-wrap lg:flex-nowrap px-6 pt-10 pb-10 gap-10">
            <View className="flex-1 min-w-[300px] justify-center">
              <Text className="text-[#d3bc8e] font-bold text-lg mb-2 uppercase tracking-[4px]">
                Initiate Discovery
              </Text>
              <Text className="text-6xl font-black text-white leading-tight tracking-tighter">
                Explore the <Text className="text-[#d3bc8e]">Unseen.</Text>
              </Text>
              <Text className="text-gray-400 mt-4 text-xl leading-8 max-w-lg">
                The first real-world RPG. Track your physical movements through
                Morocco, clear the fog, and connect with fellow adventurers.
              </Text>

              <View className="flex-row gap-4 mt-10">
                <TouchableOpacity
                  className="bg-[#d3bc8e] px-8 py-4 rounded-2xl flex-row items-center gap-3 shadow-xl"
                  onPress={() => router.push("/map")}
                >
                  <Compass color="#1c1d28" size={24} />
                  <Text className="text-[#1c1d28] font-black text-lg">
                    LAUNCH MAP
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="bg-[#2e3142] border border-[#3b3e52] px-8 py-4 rounded-2xl flex-row items-center gap-3"
                  onPress={() => router.push("/store")}
                >
                  <Coins color="#d3bc8e" size={24} />
                  <Text className="text-white font-bold text-lg">
                    TRADING POST
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Feature Cards Column */}
            <View className="w-full lg:w-96 gap-4">
              {FEATURES.map((feat, i) => (
                <View
                  key={i}
                  className="bg-[#2e3142] p-6 rounded-3xl border border-[#3b3e52]"
                >
                  <View className="flex-row items-center gap-4 mb-2">
                    <feat.icon size={20} color="#d3bc8e" />
                    <Text className="text-white font-black text-lg">
                      {feat.title}
                    </Text>
                  </View>
                  <Text className="text-gray-400 text-sm leading-5">
                    {feat.desc}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* 🌟 REGIONS SECTION 🌟 */}
          <View className="px-6 py-10 bg-[#050608]/30">
            <View className="flex-row justify-between items-end mb-8">
              <View>
                <Text className="text-[#d3bc8e] font-bold tracking-widest uppercase text-xs mb-1">
                  Active Waypoints
                </Text>
                <Text className="text-3xl font-black text-white">
                  Known Regions
                </Text>
              </View>
              <TouchableOpacity>
                <Text className="text-[#d3bc8e] font-bold">Show All</Text>
              </TouchableOpacity>
            </View>

            <View className="flex-row flex-wrap gap-6">
              {REGIONS.map((region) => (
                <TouchableOpacity
                  key={region.id}
                  className="flex-1 min-w-[320px] h-96 rounded-[40px] overflow-hidden border border-[#3b3e52]"
                  onPress={() =>
                    router.push({
                      pathname: "/map",
                      params: { city: region.id },
                    })
                  }
                >
                  <Image
                    source={{ uri: region.image }}
                    className="absolute inset-0 w-full h-full"
                    resizeMode="cover"
                  />
                  <LinearGradient
                    colors={["transparent", "rgba(28,29,40,1)"]}
                    className="absolute inset-0 justify-end p-8"
                  >
                    <Text className="text-white text-4xl font-black mb-2">
                      {region.name}
                    </Text>

                    {/* RPG STATS FOR TRAVEL */}
                    <View className="flex-row gap-4 mb-6">
                      <View className="flex-row items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-full border border-white/10">
                        <CloudRain size={14} color="#d3bc8e" />
                        <Text className="text-white text-[10px] font-bold">
                          {region.stats.weather}
                        </Text>
                      </View>
                      <View className="flex-row items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-full border border-white/10">
                        <Users size={14} color="#d3bc8e" />
                        <Text className="text-white text-[10px] font-bold">
                          {region.stats.crowds}
                        </Text>
                      </View>
                      <View className="flex-row items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-full border border-white/10">
                        <ShieldCheck size={14} color="#4ade80" />
                        <Text className="text-white text-[10px] font-bold">
                          {region.stats.safety}
                        </Text>
                      </View>
                    </View>

                    <View className="w-full h-2 bg-black/50 rounded-full overflow-hidden">
                      <View
                        className="h-full bg-[#d3bc8e]"
                        style={{ width: `${region.exploration}%` }}
                      />
                    </View>
                    <Text className="text-[#d3bc8e] text-[10px] font-bold uppercase mt-2">
                      Exploration: {region.exploration}%
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 🌟 TRAVEL INTEL (FOOTER INFO) 🌟 */}
          <View className="px-6 py-20 border-t border-[#3b3e52]">
            <View className="bg-[#2e3142] p-10 rounded-[50px] border border-[#d3bc8e]/20 flex-row flex-wrap lg:flex-nowrap gap-10">
              <View className="flex-1">
                <Text className="text-white text-3xl font-black mb-4">
                  Traveler Intel
                </Text>
                <Text className="text-gray-400 text-lg leading-7">
                  Morocco uses the MAD (Dirham). Travelers from most regions do
                  not require a visa for up to 90 days. Always carry cash for
                  the Medinas!
                </Text>
              </View>
              <View className="w-full lg:w-80 gap-6">
                <View className="flex-row items-center gap-4">
                  <View className="w-12 h-12 bg-[#1c1d28] rounded-2xl items-center justify-center border border-[#3b3e52]">
                    <Coins color="#d3bc8e" />
                  </View>
                  <View>
                    <Text className="text-white font-bold">Currency</Text>
                    <Text className="text-gray-500 text-sm">
                      1 USD ≈ 10.1 MAD
                    </Text>
                  </View>
                </View>
                <View className="flex-row items-center gap-4">
                  <View className="w-12 h-12 bg-[#1c1d28] rounded-2xl items-center justify-center border border-[#3b3e52]">
                    <Compass color="#d3bc8e" />
                  </View>
                  <View>
                    <Text className="text-white font-bold">
                      Best Time to Visit
                    </Text>
                    <Text className="text-gray-500 text-sm">
                      March - May (Spring)
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          <View className="h-20" />
        </ScrollView>

        {/* 🌟 FLOATING CHAT TRIGGER (FOR MOBILE) 🌟 */}
        <TouchableOpacity
          className="absolute bottom-8 right-8 w-16 h-16 bg-[#d3bc8e] rounded-full items-center justify-center shadow-2xl z-50 lg:hidden"
          onPress={() => setIsChatOpen(true)}
        >
          <MessageCircle color="#1c1d28" size={30} />
        </TouchableOpacity>

        {/* 🌟 INTEGRATED CHAT HUB COMPONENT 🌟 */}
        <ChatHub
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          userLocation={null} // Can be wired to a global location provider later
          mapRef={null}
          currentWorld={null} // 🌟 Add this line
        />
      </SafeAreaView>
    </View>
  );
}
