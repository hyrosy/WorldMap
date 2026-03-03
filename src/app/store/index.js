import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, SafeAreaView, ScrollView, Platform, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import ProductCard from '@/components/ProductCard';
import CategorySidebar from '@/components/CategorySidebar';
import { Search, ChevronLeft } from 'lucide-react-native';
import { encode as base64Encode } from 'base-64'; // Universal Base64 Encoder

export default function StorePage() {
    const router = useRouter();
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            // Replace with your real keys from environment variables
            const consumerKey = process.env.EXPO_PUBLIC_WOOCOMMERCE_KEY || 'ck_6083a60490a09aa1bcfe51c7c726b6688aa7ae31';
            const consumerSecret = process.env.EXPO_PUBLIC_WOOCOMMERCE_SECRET || 'cs_32aa0ca86999411c24a3aeb4b11c2cb0ce9f186b';
            
            // Native-safe base64 encoding
            const authString = base64Encode(`${consumerKey}:${consumerSecret}`);
            const headers = { 'Authorization': `Basic ${authString}` };

            try {
                const [productsRes, categoriesRes] = await Promise.all([
                    fetch('https://data.hyrosy.com/wp-json/wc/v3/products', { headers }),
                    fetch('https://data.hyrosy.com/wp-json/wc/v3/products/categories', { headers })
                ]);

                if (!productsRes.ok || !categoriesRes.ok) {
                    throw new Error('Failed to fetch data');
                }

                const productsData = await productsRes.json();
                const categoriesData = await categoriesRes.json();

                setProducts(productsData);
                const validCategories = Array.isArray(categoriesData) ? categoriesData : [];
                setCategories(validCategories.filter(cat => cat.slug !== 'uncategorized'));
            } catch (error) {
                console.error("Failed to fetch store data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const filteredProducts = selectedCategory
        ? products.filter(p => p.categories.some(c => c.id === selectedCategory))
        : products;

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-black items-center justify-center">
                <ActivityIndicator size="large" color="#22d3ee" />
                <Text className="text-gray-400 mt-4 text-base font-bold">Loading Store...</Text>
            </SafeAreaView>
        );
    }

    // Calculate how many columns to show based on Platform
    const numColumns = Platform.OS === 'web' ? 3 : 2;

    return (
        <SafeAreaView className="flex-1 bg-black">
            
            {/* Header */}
            <View className="flex-row items-center justify-between p-5 border-b border-gray-800 bg-gray-900">
                <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 active:opacity-70">
                    <ChevronLeft size={28} color="#d1d5db" />
                </TouchableOpacity>
                <View className="items-center flex-1">
                    <Text className="text-xl font-black text-white tracking-wide">Hyrosy Store</Text>
                    <Text className="text-xs text-gray-400 font-medium">Browse authentic experiences</Text>
                </View>
                <View style={{ width: 44 }} /> 
            </View>

            {/* Main Content Area */}
            <View className={`flex-1 ${Platform.OS === 'web' ? 'flex-row max-w-7xl mx-auto w-full p-8' : 'flex-col'}`}>
                
                {/* Sidebar (Top on Mobile, Left on Web) */}
                <View className={`${Platform.OS === 'web' ? 'w-64 mr-8' : 'w-full h-48 p-4 border-b border-gray-800 bg-gray-900'}`}>
                    <CategorySidebar
                        categories={categories}
                        selectedCategory={selectedCategory}
                        onSelectCategory={setSelectedCategory}
                    />
                </View>

                {/* Product Grid */}
                <View className="flex-1 p-2">
                    {filteredProducts.length > 0 ? (
                        <FlatList
                            data={filteredProducts}
                            keyExtractor={(item) => item.id.toString()}
                            numColumns={numColumns}
                            // Force FlatList to re-render if the number of columns changes
                            key={`flatlist-${numColumns}`} 
                            showsVerticalScrollIndicator={false}
                            renderItem={({ item }) => (
                                <View style={{ flex: 1 / numColumns, padding: 4 }}>
                                    <ProductCard product={item} />
                                </View>
                            )}
                            contentContainerStyle={{ paddingBottom: 40 }}
                        />
                    ) : (
                        <View className="flex-1 items-center justify-center p-10 bg-gray-900/50 rounded-2xl border border-gray-800 m-2">
                            <Search size={48} color="#6b7280" className="mb-4" />
                            <Text className="text-xl font-bold text-white mb-2">No Products Found</Text>
                            <Text className="text-gray-400 text-center">Try selecting a different category or view all experiences.</Text>
                        </View>
                    )}
                </View>
            </View>
            
        </SafeAreaView>
    );
}