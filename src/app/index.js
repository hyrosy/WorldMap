import { View, Text, SafeAreaView, ScrollView, TouchableOpacity, Image, Platform } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { MapPin, ShoppingBag, User, Search, PlayCircle, ArrowRight } from "lucide-react-native";
import { LinearGradient } from 'expo-linear-gradient';

const CITY_DATA = [
  { id: 'marrakech', name: 'Marrakech', image: 'https://images.unsplash.com/photo-1597211661944-8e433c1d5e46?auto=format&fit=crop&q=80', description: 'The Red City' },
  { id: 'casablanca', name: 'Casablanca', image: 'https://images.unsplash.com/photo-1539020140153-e479b8c22e70?auto=format&fit=crop&q=80', description: 'Modern Heritage' },
  { id: 'rabat', name: 'Rabat', image: 'https://images.unsplash.com/photo-1534449835073-61aa157b120a?auto=format&fit=crop&q=80', description: 'Capital of Culture' },
];

// UPDATED: Replaced WP IDs with Supabase Category Strings
const CATEGORIES = [
  { id: 'Activities', name: 'Adventures' },
  { id: 'Food & Cooking', name: 'Culinary' },
  { id: 'Monuments', name: 'Monuments' },
  { id: 'Shops', name: 'Shopping' },
  { id: 'Experiences', name: 'Experiences' },
];

export default function UniversalHome() {
  const { user } = useAuth();
  const { cart } = useCart();
  const router = useRouter();

  const isWeb = Platform.OS === 'web';
  // If on web, constrain width to act like a mobile simulator. If on mobile, take full width.
  const containerStyle = isWeb ? "w-full max-w-md mx-auto shadow-2xl h-full min-h-screen border-x border-gray-800" : "flex-1";

  return (
    // UPDATED THEME: Changed from light gray to deep black/gray-900
    <View className="flex-1 bg-black items-center justify-center">
    <SafeAreaView className={`bg-gray-900 ${containerStyle}`}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View className="flex-row justify-between items-center px-6 py-4 bg-gray-900 border-b border-gray-800 pt-12">
        <View className="flex-row items-center gap-3">
          <View className="w-10 h-10 bg-[#d3bc8e] rounded-full items-center justify-center shadow-lg">
            <Text className="text-black font-black text-xl">H</Text>
          </View>
          <Text className="text-2xl font-black text-white tracking-tight">hyrosy</Text>
        </View>

        <View className="flex-row items-center gap-5">
          <TouchableOpacity onPress={() => router.push("/store")} className="active:scale-95 transition-transform">
            <View>
              <ShoppingBag size={24} color="#d1d5db" />
              {cart.length > 0 && (
                <View className="absolute -top-2 -right-2 bg-cyan-500 w-5 h-5 rounded-full items-center justify-center border-2 border-gray-900">
                  <Text className="text-[10px] text-gray-900 font-bold">{cart.length}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={() => router.push(user ? "/account" : "/auth")} className="active:scale-95 transition-transform">
             {user?.user_metadata?.avatar_url ? (
                <Image 
                  source={{ uri: user.user_metadata.avatar_url }} 
                  className="w-9 h-9 rounded-full border-2 border-gray-700"
                />
             ) : (
                <View className="w-9 h-9 bg-gray-800 rounded-full items-center justify-center border border-gray-700">
                   <User size={20} color="#9ca3af" />
                </View>
             )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        
        {/* Hero Section */}
        <View className="px-6 pt-10 pb-6">
          <Text className="text-5xl font-black text-white leading-tight tracking-tight">
            Discover <Text className="text-[#d3bc8e]">Morocco</Text>
          </Text>
          <Text className="text-gray-400 mt-3 text-lg leading-6 font-medium">
            Explore authentic craftsmanship and hidden gems.
          </Text>

          <View className="flex-row gap-3 mt-8">
            <TouchableOpacity 
              className="flex-1 bg-cyan-500 py-4 rounded-2xl flex-row justify-center items-center gap-2 shadow-lg active:bg-cyan-600 transition-colors"
              onPress={() => router.push("/map")}
            >
              <MapPin color="#111827" size={20} />
              <Text className="text-gray-900 font-bold text-base">Open Map</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              className="flex-1 bg-gray-800 border border-gray-700 py-4 rounded-2xl flex-row justify-center items-center gap-2 shadow-sm active:bg-gray-700 transition-colors"
              onPress={() => router.push("/store")}
            >
              <Search color="#d1d5db" size={20} />
              <Text className="text-white font-bold text-base">Browse Shop</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Cities Carousel */}
        <View className="py-6">
          <View className="flex-row justify-between items-center px-6 mb-5">
            <Text className="text-xl font-bold text-white tracking-wide">Destinations</Text>
            <TouchableOpacity><Text className="text-[#d3bc8e] font-bold">View All</Text></TouchableOpacity>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, gap: 16 }}>
            {CITY_DATA.map((city) => (
              <TouchableOpacity 
                key={city.id}
                className="w-64 h-80 rounded-3xl overflow-hidden relative shadow-xl bg-gray-800 active:scale-95 transition-transform border border-gray-700"
                // Pass the city to the map route perfectly
                onPress={() => router.push({ pathname: "/map", params: { city: city.id } })}
              >
                <Image source={{ uri: city.image }} className="absolute inset-0 w-full h-full" resizeMode="cover" />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.9)']}
                  className="absolute inset-0 justify-end p-6"
                >
                  <Text className="text-white text-3xl font-black tracking-tight">{city.name}</Text>
                  <Text className="text-gray-300 text-sm mt-1 font-medium">{city.description}</Text>
                  <View className="flex-row items-center mt-4 bg-white/20 self-start px-4 py-2 rounded-full backdrop-blur-md">
                     <PlayCircle size={16} color="white" />
                     <Text className="text-white text-xs font-bold ml-2">Watch Story</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Categories Grid */}
        <View className="px-6 py-6">
          <Text className="text-xl font-bold text-white mb-5 tracking-wide">Categories</Text>
          <View className="flex-row flex-wrap gap-3">
             {CATEGORIES.map((cat) => (
                <TouchableOpacity 
                  key={cat.id} 
                  className="bg-gray-800 border border-gray-700 px-5 py-3.5 rounded-xl shadow-sm flex-row items-center active:bg-gray-700 transition-colors"
                >
                   <View className="w-2.5 h-2.5 rounded-full bg-[#d3bc8e] mr-3" />
                   <Text className="text-gray-200 font-bold">{cat.name}</Text>
                </TouchableOpacity>
             ))}
          </View>
        </View>

        {/* Featured Quest Widget */}
        <View className="px-6 pb-24 mt-4">
          <View className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-3xl border border-gray-700 shadow-lg">
             <View className="flex-row justify-between items-start">
                <View>
                   <Text className="text-[#d3bc8e] font-bold text-xs tracking-widest uppercase mb-2">Featured Quest</Text>
                   <Text className="text-2xl font-black text-white w-48 leading-tight">Secrets of the Medina</Text>
                </View>
                <View className="bg-cyan-500/20 border border-cyan-500/50 px-3 py-1.5 rounded-full">
                   <Text className="text-cyan-400 font-bold text-xs">5 Steps</Text>
                </View>
             </View>
             <Text className="text-gray-400 mt-3 mb-6 leading-6 font-medium">Continue your journey through the ancient streets and discover hidden artisans.</Text>
             <TouchableOpacity 
                className="bg-white self-start px-6 py-3.5 rounded-xl flex-row items-center active:bg-gray-200 transition-colors shadow-md"
                onPress={() => router.push("/map")}
             >
                <Text className="text-black font-black mr-2">Start Exploring</Text>
                <ArrowRight size={18} color="black" />
             </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
    </View>
  );
}