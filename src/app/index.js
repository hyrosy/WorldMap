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

const CATEGORIES = [
  { id: 37, name: 'Camel Ride', icon: 'camel' },
  { id: 44, name: 'Food', icon: 'utensils' },
  { id: 35, name: 'Monuments', icon: 'landmark' },
  { id: 45, name: 'Shopping', icon: 'shopping-bag' },
  { id: 39, name: 'Balloon', icon: 'wind' },
];

export default function UniversalHome() {
  const { user } = useAuth();
  const { cart } = useCart();
  const router = useRouter();

  const isWeb = Platform.OS === 'web';
  const containerStyle = isWeb ? "w-full max-w-md mx-auto shadow-2xl h-full min-h-screen border-x border-gray-100" : "flex-1";

  return (
    <View className="flex-1 bg-[#F9FAFB] items-center justify-center">
    <SafeAreaView className={`bg-[#F9FAFB] ${containerStyle}`}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View className="flex-row justify-between items-center px-6 py-4 bg-white border-b border-gray-100">
        <View className="flex-row items-center gap-2">
          <View className="w-9 h-9 bg-[#d3bc8e] rounded-full items-center justify-center">
            <Text className="text-white font-bold text-lg">H</Text>
          </View>
          <Text className="text-xl font-bold text-gray-900 tracking-tight">hyrosy</Text>
        </View>

        <View className="flex-row items-center gap-4">
          <TouchableOpacity onPress={() => router.push("/store")}>
            <View>
              <ShoppingBag size={24} color="#1f2937" />
              {cart.length > 0 && (
                <View className="absolute -top-1 -right-1 bg-[#d3bc8e] w-4 h-4 rounded-full items-center justify-center border border-white">
                  <Text className="text-[10px] text-white font-bold">{cart.length}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={() => router.push(user ? "/account" : "/auth")}>
             {user?.user_metadata?.avatar_url ? (
                <Image 
                  source={{ uri: user.user_metadata.avatar_url }} 
                  className="w-8 h-8 rounded-full border border-gray-200"
                />
             ) : (
                <View className="w-8 h-8 bg-gray-100 rounded-full items-center justify-center">
                   <User size={20} color="#6B7280" />
                </View>
             )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-8 pb-6">
          <Text className="text-4xl font-extrabold text-gray-900 leading-tight">
            Discover <Text className="text-[#d3bc8e]">Morocco</Text>
          </Text>
          <Text className="text-gray-500 mt-2 text-lg">
            Explore authentic craftsmanship and hidden gems.
          </Text>

          <View className="flex-row gap-3 mt-8">
            <TouchableOpacity 
              className="flex-1 bg-[#1f2937] py-4 rounded-2xl flex-row justify-center items-center gap-2 shadow-sm active:opacity-90"
              onPress={() => router.push("/map")}
            >
              <MapPin color="white" size={20} />
              <Text className="text-white font-semibold text-base">Open Map</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              className="flex-1 bg-white border border-gray-200 py-4 rounded-2xl flex-row justify-center items-center gap-2 shadow-sm active:bg-gray-50"
              onPress={() => router.push("/store")}
            >
              <Search color="#1f2937" size={20} />
              <Text className="text-gray-900 font-semibold text-base">Browse Shop</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="py-4">
          <View className="flex-row justify-between items-center px-6 mb-4">
            <Text className="text-xl font-bold text-gray-900">Popular Cities</Text>
            <TouchableOpacity><Text className="text-[#d3bc8e] font-semibold">View All</Text></TouchableOpacity>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, gap: 16 }}>
            {CITY_DATA.map((city) => (
              <TouchableOpacity 
                key={city.id}
                className="w-64 h-80 rounded-3xl overflow-hidden relative shadow-md bg-gray-200 active:scale-95 transition-transform"
                onPress={() => router.push({ pathname: "/map", params: { city: city.id } })}
              >
                <Image source={{ uri: city.image }} className="absolute inset-0 w-full h-full" resizeMode="cover" />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.8)']}
                  className="absolute inset-0 justify-end p-5"
                >
                  <Text className="text-white text-2xl font-bold">{city.name}</Text>
                  <Text className="text-gray-300 text-sm mt-1">{city.description}</Text>
                  <View className="flex-row items-center mt-3 bg-white/20 self-start px-3 py-1 rounded-full backdrop-blur-md">
                     <PlayCircle size={14} color="white" />
                     <Text className="text-white text-xs font-medium ml-1">Watch Story</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View className="px-6 py-6">
          <Text className="text-xl font-bold text-gray-900 mb-4">Categories</Text>
          <View className="flex-row flex-wrap gap-3">
             {CATEGORIES.map((cat) => (
                <TouchableOpacity key={cat.id} className="bg-white border border-gray-100 px-4 py-3 rounded-xl shadow-sm flex-row items-center active:bg-gray-50">
                   <View className="w-2 h-2 rounded-full bg-[#d3bc8e] mr-2" />
                   <Text className="text-gray-700 font-medium">{cat.name}</Text>
                </TouchableOpacity>
             ))}
          </View>
        </View>

        <View className="px-6 pb-24">
          <View className="bg-[#d3bc8e]/10 p-6 rounded-3xl border border-[#d3bc8e]/20">
             <View className="flex-row justify-between items-start">
                <View>
                   <Text className="text-[#8f7a54] font-bold text-sm tracking-widest uppercase mb-1">Active Quest</Text>
                   <Text className="text-xl font-bold text-gray-900 w-48">Secrets of the Medina</Text>
                </View>
                <View className="bg-[#d3bc8e] px-3 py-1 rounded-full">
                   <Text className="text-white font-bold text-xs">2/5 Steps</Text>
                </View>
             </View>
             <Text className="text-gray-600 mt-2 mb-4">Continue your journey through the ancient streets...</Text>
             <TouchableOpacity className="bg-[#1f2937] self-start px-5 py-3 rounded-xl flex-row items-center">
                <Text className="text-white font-bold mr-2">Continue</Text>
                <ArrowRight size={16} color="white" />
             </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
    </View>
  );
}