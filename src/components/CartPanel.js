import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, Modal, SafeAreaView } from 'react-native';
import { useCart } from "@/context/CartContext";
import { useRouter } from 'expo-router';
import { Trash2, ShoppingBag, Calendar, Clock, User, X } from "lucide-react-native";
import { format } from 'date-fns';

const CartPanel = () => {
  const { isCartOpen, closeCart, cartItems, removeFromCart, updateQuantity, total } = useCart();
  const router = useRouter();

  const handleCheckout = () => {
      closeCart();
      router.push('/checkout');
  };

  return (
    <Modal
        visible={isCartOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={closeCart}
    >
      {/* Background Overlay */}
      <View className="flex-1 justify-end bg-black/70 flex-row">
        
        {/* Clickable transparent area to close */}
        <TouchableOpacity className="flex-1" onPress={closeCart} />

        {/* Slide-in Panel (Takes up full height on mobile, constrained width) */}
        <SafeAreaView className="w-[85%] max-w-sm h-full bg-gray-900 shadow-2xl flex-col border-l border-gray-800 pt-10">
          
          {/* Panel Header */}
          <View className="flex-row justify-between items-center p-5 bg-black border-b border-gray-800">
            <Text className="text-xl font-bold text-white tracking-wide">Your Itinerary</Text>
            <TouchableOpacity onPress={closeCart} className="p-2 bg-gray-800 rounded-full">
                <X size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          {cartItems.length > 0 ? (
            <>
              {/* Cart Items List */}
              <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
                {cartItems.map((item) => (
                  <View key={item.id} className="flex-row items-start gap-4 py-5 border-b border-gray-800">
                    
                    {/* Item Image */}
                    <View className="h-20 w-20 rounded-xl overflow-hidden bg-gray-800 border border-gray-700">
                       <Image
                        source={{ uri: item.images?.[0]?.src || 'https://placehold.co/100' }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    </View>

                    {/* Item Details */}
                    <View className="flex-1 flex-col">
                      <View className="flex-row justify-between items-start mb-1">
                          <Text className="text-base font-bold text-white leading-tight flex-1 mr-2">{item.name}</Text>
                          <TouchableOpacity className="p-1" onPress={() => removeFromCart(item.id)}>
                            <Trash2 size={18} color="#ef4444" />
                          </TouchableOpacity>
                      </View>
                      
                      {/* Formatted Price */}
                      <Text className="text-sm font-black text-cyan-400 mb-2">€{item.price}</Text>
                      
                      {/* Booking Details */}
                      <View className="space-y-1.5 mb-3">
                        {item.date && (
                            <View className="flex-row items-center">
                                <Calendar size={14} color="#9ca3af" className="mr-2"/> 
                                <Text className="text-xs text-gray-400 font-medium">{format(new Date(item.date), 'PPP')}</Text>
                            </View>
                        )}
                        {item.time && (
                            <View className="flex-row items-center">
                                <Clock size={14} color="#9ca3af" className="mr-2"/> 
                                <Text className="text-xs text-gray-400 font-medium">{item.time}</Text>
                            </View>
                        )}
                         <View className="flex-row items-center">
                             <User size={14} color="#9ca3af" className="mr-2"/> 
                             <Text className="text-xs text-gray-400 font-medium">{item.quantity} Participant(s)</Text>
                         </View>
                      </View>
                      
                      {/* Quantity Controls */}
                      <View className="flex-row items-center bg-gray-800 border border-gray-700 rounded-lg self-start">
                        <TouchableOpacity 
                            onPress={() => updateQuantity(item.id, item.quantity - 1)} 
                            className="h-8 w-8 items-center justify-center border-r border-gray-700 active:bg-gray-700"
                        >
                            <Text className="text-gray-300 font-bold">-</Text>
                        </TouchableOpacity>
                        <Text className="text-sm font-bold text-white w-8 text-center">{item.quantity}</Text>
                        <TouchableOpacity 
                            onPress={() => updateQuantity(item.id, item.quantity + 1)} 
                            className="h-8 w-8 items-center justify-center border-l border-gray-700 active:bg-gray-700"
                        >
                            <Text className="text-gray-300 font-bold">+</Text>
                        </TouchableOpacity>
                      </View>

                    </View>
                  </View>
                ))}
              </ScrollView>

              {/* Panel Footer */}
              <View className="p-5 bg-black border-t border-gray-800 mt-auto pb-8">
                  <View className="flex-row justify-between items-center mb-5">
                      <Text className="font-bold text-gray-400 uppercase tracking-widest text-sm">Total</Text>
                      <Text className="font-black text-2xl text-cyan-400">€{total}</Text>
                  </View>
                  <TouchableOpacity 
                    className="w-full h-14 bg-[#d3bc8e] active:bg-[#c2a977] rounded-xl flex-row items-center justify-center shadow-lg"
                    onPress={handleCheckout}
                  >
                    <Text className="text-black font-bold text-lg">Proceed to Checkout</Text>
                  </TouchableOpacity>
              </View>
            </>
          ) : (
            // Empty Cart State
            <View className="flex-1 items-center justify-center p-6">
              <View className="bg-gray-800 p-6 rounded-full mb-6 border border-gray-700 shadow-sm">
                  <ShoppingBag size={48} color="#6b7280" />
              </View>
              <Text className="text-xl font-bold text-white mb-2">Itinerary is empty</Text>
              <Text className="text-gray-400 text-center mb-8">You haven't added any experiences to your journey yet.</Text>
              
              <TouchableOpacity 
                className="bg-gray-800 border border-gray-700 h-12 px-6 rounded-full items-center justify-center active:bg-gray-700"
                onPress={closeCart}
              >
                <Text className="text-white font-bold">Keep Exploring</Text>
              </TouchableOpacity>
            </View>
          )}

        </SafeAreaView>
      </View>
    </Modal>
  );
};

export default CartPanel;