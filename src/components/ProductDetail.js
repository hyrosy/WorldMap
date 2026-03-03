import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Platform, Dimensions } from 'react-native';
import { Calendar, Clock, User, ShoppingCart, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

// Helper to strip HTML from product descriptions
const stripHtml = (html) => html ? html.replace(/<[^>]*>?/gm, '').trim() : '';
const { width: screenWidth } = Dimensions.get('window');

const ProductDetail = ({ product, onAddToCart, onBack }) => {
    // State for booking options
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedTime, setSelectedTime] = useState('');
    const [participants, setParticipants] = useState(1);
    const [isAdded, setIsAdded] = useState(false);
    const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);

    // Reset state when a new product is viewed
    useEffect(() => {
        setSelectedDate(new Date());
        setSelectedTime('');
        setParticipants(1);
        setIsAdded(false);
        setIsDescriptionOpen(false);
    }, [product]);

    if (!product) return null;

    const handleAddToCartClick = () => {
        const cartItemDetails = {
            quantity: product.acf?.requires_participants ? participants : 1,
            ...(product.acf?.enable_booking && {
                date: selectedDate,
                time: selectedTime,
            })
        };
        onAddToCart(product, cartItemDetails);
        setIsAdded(true);
        setTimeout(() => setIsAdded(false), 2000);
    };

    const handleDateChange = (event, date) => {
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
        }
        if (date) {
            setSelectedDate(date);
        }
    };

    // Because WooCommerce data structures can vary, we safely access metadata
    // In a fully migrated Supabase setup, this would be flatter, but we'll support both for now.
    const timeSlots = product.acf?.available_time_slots?.split(',').map(t => t.trim()) || [];
    const isBookable = product.acf?.enable_booking === true || product.acf?.enable_booking === 'true';
    const requiresParticipants = product.acf?.requires_participants === true || product.acf?.requires_participants === 'true';
    
    // Parse price safely
    const basePrice = parseFloat(product.price || 0);
    const totalPrice = (basePrice * (isBookable && requiresParticipants ? participants : 1)).toFixed(2);

    return (
        <View className="flex-1 flex-col bg-gray-900 h-full p-4">
            
            {/* --- HEADER: GALLERY, TITLE, PRICE --- */}
            <View className="mb-4">
                {product.images && product.images.length > 0 ? (
                    <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} className="w-full h-64 bg-gray-800 rounded-xl overflow-hidden mb-4">
                        {product.images.map((image, index) => (
                            <Image 
                                key={index}
                                source={{ uri: image.src }}
                                style={{ width: screenWidth - 32, height: 256 }} // Screen width minus padding
                                resizeMode="cover"
                            />
                        ))}
                    </ScrollView>
                ) : (
                    <View className="w-full h-64 bg-gray-800 rounded-xl items-center justify-center mb-4">
                         <Text className="text-gray-500">No Image Available</Text>
                    </View>
                )}
                
                <Text className="text-2xl font-bold text-white leading-tight">{product.name}</Text>
                
                <View className="flex-row justify-between items-center mt-2 border-b border-gray-800 pb-4">
                    <Text className="text-gray-400 text-sm flex-1 mr-4" numberOfLines={2}>
                        {stripHtml(product.short_description)}
                    </Text>
                    <Text className="text-3xl font-black text-cyan-400">€{totalPrice}</Text>
                </View>
            </View>

            {/* --- MAIN CONTENT (SCROLLABLE) --- */}
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                {isBookable ? (
                    <View className="space-y-4 mb-4">
                        
                        {/* --- DATE PICKER --- */}
                        <View className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                            <View className="flex-row items-center mb-3">
                                <Calendar size={18} color="#22d3ee" className="mr-2"/>
                                <Text className="font-bold text-white text-base">Select Date</Text>
                            </View>
                            
                            {/* Universal Date Picker trigger */}
                            <TouchableOpacity 
                                onPress={() => setShowDatePicker(true)}
                                className="w-full bg-gray-900 border border-gray-600 rounded-lg p-4 items-center"
                            >
                                <Text className="text-white font-medium">{selectedDate.toDateString()}</Text>
                            </TouchableOpacity>

                            {showDatePicker && (
                                <DateTimePicker
                                    value={selectedDate}
                                    mode="date"
                                    display="default"
                                    minimumDate={new Date()}
                                    onChange={handleDateChange}
                                />
                            )}
                        </View>

                        {/* --- TIME & PARTICIPANTS GRID --- */}
                        <View className="flex-row gap-4">
                            {/* Time Slots */}
                            {product.acf?.booking_type === 'date_time' && timeSlots.length > 0 && (
                                <View className="flex-1 bg-gray-800 p-4 rounded-xl border border-gray-700">
                                    <View className="flex-row items-center mb-3">
                                        <Clock size={18} color="#22d3ee" className="mr-2"/>
                                        <Text className="font-bold text-white text-base">Time</Text>
                                    </View>
                                    <View className="flex-row flex-wrap gap-2">
                                        {timeSlots.map(time => (
                                            <TouchableOpacity 
                                                key={time} 
                                                onPress={() => setSelectedTime(time)}
                                                className={`px-3 py-2 rounded-lg border ${selectedTime === time ? 'bg-cyan-500 border-cyan-400' : 'bg-gray-900 border-gray-600'}`}
                                            >
                                                <Text className={selectedTime === time ? 'text-white font-bold text-sm' : 'text-gray-300 font-medium text-sm'}>
                                                    {time}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {/* Participants */}
                            {requiresParticipants && (
                                <View className="flex-1 bg-gray-800 p-4 rounded-xl border border-gray-700">
                                    <View className="flex-row items-center mb-3">
                                        <User size={18} color="#22d3ee" className="mr-2"/>
                                        <Text className="font-bold text-white text-base">Guests</Text>
                                    </View>
                                    <View className="flex-row items-center justify-between bg-gray-900 border border-gray-600 rounded-lg p-1">
                                        <TouchableOpacity 
                                            onPress={() => setParticipants(p => Math.max(1, p - 1))}
                                            className="w-10 h-10 items-center justify-center bg-gray-800 rounded-md"
                                        >
                                            <Text className="text-white font-bold text-xl">-</Text>
                                        </TouchableOpacity>
                                        
                                        <Text className="text-white font-bold text-lg mx-2">{participants}</Text>
                                        
                                        <TouchableOpacity 
                                            onPress={() => setParticipants(p => p + 1)}
                                            className="w-10 h-10 items-center justify-center bg-gray-800 rounded-md"
                                        >
                                            <Text className="text-white font-bold text-xl">+</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}
                        </View>
                    </View>
                ) : null}

                {/* --- CUSTOM ACCORDION FOR FULL DESCRIPTION --- */}
                {product.description && (
                    <View className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden mt-2">
                        <TouchableOpacity 
                            onPress={() => setIsDescriptionOpen(!isDescriptionOpen)}
                            className="flex-row justify-between items-center p-4 active:bg-gray-700"
                        >
                            <Text className="font-bold text-white text-base">Full Details</Text>
                            {isDescriptionOpen ? <ChevronUp size={20} color="#9ca3af" /> : <ChevronDown size={20} color="#9ca3af" />}
                        </TouchableOpacity>
                        
                        {isDescriptionOpen && (
                            <View className="p-4 border-t border-gray-700 bg-gray-900/50">
                                <Text className="text-gray-300 leading-6 text-sm">
                                    {stripHtml(product.description)}
                                </Text>
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>

            {/* --- FOOTER ACTION BAR --- */}
            <View className="flex-row gap-3 pt-4 border-t border-gray-800 bg-gray-900 mt-auto">
                <TouchableOpacity 
                    onPress={onBack} 
                    className="flex-1 bg-gray-800 border border-gray-700 h-14 rounded-xl items-center justify-center active:bg-gray-700"
                >
                    <Text className="text-white font-bold text-base">Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                    onPress={handleAddToCartClick} 
                    disabled={isAdded}
                    className={`flex-[2] h-14 rounded-xl flex-row items-center justify-center shadow-lg transition-colors ${isAdded ? 'bg-green-500' : 'bg-[#d3bc8e] active:bg-[#c2a977]'}`}
                >
                    {isAdded ? <CheckCircle size={20} color="white" /> : <ShoppingCart size={20} color="black" />}
                    <Text className={`font-bold text-base ml-2 ${isAdded ? 'text-white' : 'text-black'}`}>
                        {isAdded ? 'Added to Cart!' : 'Add to Experience'}
                    </Text>
                </TouchableOpacity>
            </View>

        </View>
    );
};

export default ProductDetail;