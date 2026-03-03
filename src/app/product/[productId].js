import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, ActivityIndicator, SafeAreaView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCart } from "@/context/CartContext";
import { ArrowLeft, ShoppingCart, CheckCircle } from 'lucide-react-native';
import { encode as base64Encode } from 'base-64'; // Universal Base64 Encoder

// Helper to strip HTML tags for Native Text
const stripHtml = (html) => html ? html.replace(/<[^>]*>?/gm, '').trim() : '';

export default function ProductPage() {
    const router = useRouter();
    const { productId } = useLocalSearchParams(); // Replaces Next.js useParams()
    const { addToCart } = useCart();
    
    const [product, setProduct] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdded, setIsAdded] = useState(false);

    useEffect(() => {
        if (!productId) return;

        const fetchProduct = async () => {
            setIsLoading(true);
            
            // Use Environment Variables for security
            const consumerKey = process.env.EXPO_PUBLIC_WOOCOMMERCE_KEY || 'ck_6083a60490a09aa1bcfe51c7c726b6688aa7ae31';
            const consumerSecret = process.env.EXPO_PUBLIC_WOOCOMMERCE_SECRET || 'cs_32aa0ca86999411c24a3aeb4b11c2cb0ce9f186b';
            
            // Native-safe base64 encoding
            const authString = base64Encode(`${consumerKey}:${consumerSecret}`);
            const headers = { 'Authorization': `Basic ${authString}` };

            try {
                const response = await fetch(`https://data.hyrosy.com/wp-json/wc/v3/products/${productId}`, { headers });
                if (!response.ok) throw new Error('Failed to fetch product');
                const data = await response.json();
                setProduct(data);
            } catch (error) {
                console.error("Failed to fetch product:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchProduct();
    }, [productId]);
    
    const handleAddToCartClick = () => {
        if (!product) return;
        addToCart(product);
        setIsAdded(true);
        setTimeout(() => setIsAdded(false), 2000); // Reset button state after 2 seconds
    };

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-black items-center justify-center">
                <ActivityIndicator size="large" color="#22d3ee" />
                <Text className="text-gray-400 mt-4 text-base font-bold">Loading Experience...</Text>
            </SafeAreaView>
        );
    }

    if (!product) {
        return (
            <SafeAreaView className="flex-1 bg-black items-center justify-center p-6">
                <Text className="text-2xl font-bold text-white mb-4">Product Not Found</Text>
                <TouchableOpacity 
                    onPress={() => router.push('/store')} 
                    className="bg-gray-800 px-6 py-3 rounded-full border border-gray-700 active:bg-gray-700"
                >
                    <Text className="text-cyan-400 font-bold">Return to Store</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    const imageUrl = product.images?.[0]?.src || 'https://placehold.co/600';

    return (
        <SafeAreaView className="flex-1 bg-black">
            
            {/* Header / Back Navigation */}
            <View className="flex-row items-center justify-between p-5 border-b border-gray-800 bg-gray-900">
                <TouchableOpacity onPress={() => router.back()} className="flex-row items-center p-2 -ml-2 active:opacity-70">
                    <ArrowLeft size={24} color="#d1d5db" />
                    <Text className="text-gray-300 font-bold text-base ml-2">Back to Store</Text>
                </TouchableOpacity>
            </View>

            {/* Main Content */}
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                <View className={`flex-1 p-5 ${Platform.OS === 'web' ? 'max-w-6xl mx-auto w-full flex-row gap-12' : 'flex-col'}`}>
                    
                    {/* Image Section */}
                    <View className={`${Platform.OS === 'web' ? 'flex-1' : 'w-full mb-8'}`}>
                        <View className="w-full aspect-square bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 shadow-xl">
                            <Image
                                source={{ uri: imageUrl }}
                                className="w-full h-full"
                                resizeMode="cover"
                            />
                        </View>
                    </View>

                    {/* Details Section */}
                    <View className={`${Platform.OS === 'web' ? 'flex-1 py-4' : 'flex-col'}`}>
                        
                        <Text className="text-3xl sm:text-4xl font-black text-white mb-4 tracking-tight">
                            {product.name}
                        </Text>
                        
                        {product.description && (
                            <Text className="text-gray-300 text-base leading-7 mb-8">
                                {stripHtml(product.description)}
                            </Text>
                        )}

                        {/* Spacer to push pricing/button to the bottom on larger screens */}
                        <View className="flex-1" />

                        <View className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-sm mt-auto">
                            <Text className="text-gray-400 font-bold uppercase tracking-wider text-sm mb-1">Price</Text>
                            <Text className="text-4xl font-black text-cyan-400 mb-6">
                                €{product.price}
                            </Text>
                            
                            <TouchableOpacity 
                                onPress={handleAddToCartClick}
                                disabled={isAdded}
                                className={`w-full h-16 rounded-xl flex-row items-center justify-center shadow-lg active:opacity-80 transition-colors ${
                                    isAdded ? "bg-green-600" : "bg-cyan-600"
                                }`}
                            >
                                {isAdded ? (
                                    <CheckCircle size={24} color="#ffffff" className="mr-3" />
                                ) : (
                                    <ShoppingCart size={24} color="#ffffff" className="mr-3" />
                                )}
                                <Text className="text-white font-bold text-lg">
                                    {isAdded ? 'Added to Itinerary!' : 'Add to Itinerary'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                        
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}