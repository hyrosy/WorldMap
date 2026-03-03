import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useCart } from '@/context/CartContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Trash2 } from 'lucide-react-native';

// Import our Universal Checkout Form
import CheckoutForm from '@/components/CheckoutForm';

// Stripe Web Only Imports
let Elements, loadStripe;
let stripePromise = null;
if (Platform.OS === 'web') {
  const StripeWeb = require('@stripe/react-stripe-js');
  Elements = StripeWeb.Elements;
  loadStripe = require('@stripe/stripe-js').loadStripe;
  stripePromise = loadStripe(process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
}

export default function CheckoutPage() {
  const router = useRouter();
  const { cartItems, total, clearCart, updateQuantity, removeFromCart } = useCart();
  const [clientSecret, setClientSecret] = useState('');
  
  const [shippingDetails, setShippingDetails] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address1: '',
    city: '',
    postcode: '',
    country: 'Morocco' 
  });

  useEffect(() => {
    if (cartItems.length > 0 && !clientSecret) {
      // IMPORTANT: In a real Expo app, this cannot be a relative path ('/api/...').
      // It MUST be the absolute URL to your deployed Next.js backend or Supabase Edge Function.
      // E.g., 'https://your-domain.com/api/create-payment-intent'
      const apiUrl = Platform.OS === 'web' 
        ? '/api/create-payment-intent' 
        : 'YOUR_PRODUCTION_API_URL_HERE/api/create-payment-intent'; 

      fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cartItems }),
      })
      .then(res => res.json())
      .then(data => setClientSecret(data.clientSecret))
      .catch(error => console.error("Error creating payment intent:", error));
    }
  }, [cartItems, clientSecret]);

  const onPaymentSuccess = () => {
    clearCart();
    router.replace('/'); 
  };

  const updateShipping = (key, value) => {
    setShippingDetails(prev => ({ ...prev, [key]: value }));
  };

  // Empty Cart State
  if (cartItems.length === 0 && !clientSecret) { 
    return (
        <SafeAreaView className="flex-1 bg-gray-900 items-center justify-center p-6">
            <Text className="text-3xl font-black text-white mb-4 text-center">Your Itinerary is Empty</Text>
            <Text className="text-gray-400 mb-8 text-center text-lg">Add some experiences to proceed to checkout.</Text>
            <TouchableOpacity 
                onPress={() => router.push('/store')}
                className="bg-cyan-600 px-8 py-4 rounded-full active:bg-cyan-700 shadow-lg"
            >
                <Text className="text-gray-900 font-bold text-lg">Browse Experiences</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      
      {/* Header */}
      <View className="flex-row items-center justify-between p-5 border-b border-gray-800 bg-gray-900">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 active:opacity-70">
            <ChevronLeft size={28} color="#d1d5db" />
        </TouchableOpacity>
        <Text className="text-xl font-black text-white tracking-wide">Checkout</Text>
        <View style={{ width: 44 }} /> 
      </View>

      {/* Main Content */}
      {/* Platform check: On web we limit width, on mobile it takes full width */}
      <ScrollView 
        className={`flex-1 ${Platform.OS === 'web' ? 'w-full max-w-5xl mx-auto' : ''}`}
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        <View className={`${Platform.OS === 'web' ? 'flex-row gap-10' : 'flex-col'}`}>
            
            {/* LEFT COLUMN (Or Top on Mobile): Cart Summary & Shipping */}
            <View className={`${Platform.OS === 'web' ? 'flex-1' : 'w-full'}`}>
                
                {/* Order Summary Widget */}
                <View className="bg-gray-900 border border-gray-800 p-5 rounded-2xl mb-6 shadow-sm">
                    <Text className="text-lg font-bold text-white mb-5 uppercase tracking-wider">Order Summary</Text>
                    
                    {cartItems.map(item => (
                        <View key={item.id} className="flex-row items-start gap-4 mb-4 pb-4 border-b border-gray-800">
                            <Image 
                                source={{ uri: item.images?.[0]?.src || 'https://placehold.co/100' }} 
                                className="w-16 h-16 rounded-lg bg-gray-800" 
                            />
                            <View className="flex-1">
                                <Text className="text-white font-bold text-base mb-1" numberOfLines={2}>{item.name}</Text>
                                <Text className="text-cyan-400 font-black">€{item.price}</Text>
                                
                                <View className="flex-row items-center justify-between mt-3">
                                    <View className="flex-row items-center bg-gray-800 border border-gray-700 rounded-lg">
                                        <TouchableOpacity onPress={() => item.quantity > 1 ? updateQuantity(item.id, item.quantity - 1) : removeFromCart(item.id)} className="px-3 py-1.5 active:bg-gray-700"><Text className="text-white font-bold">-</Text></TouchableOpacity>
                                        <Text className="text-white font-bold px-2">{item.quantity}</Text>
                                        <TouchableOpacity onPress={() => updateQuantity(item.id, item.quantity + 1)} className="px-3 py-1.5 active:bg-gray-700"><Text className="text-white font-bold">+</Text></TouchableOpacity>
                                    </View>
                                    <Text className="text-gray-300 font-bold">€{(item.price * item.quantity).toFixed(2)}</Text>
                                </View>
                            </View>
                        </View>
                    ))}

                    <View className="flex-row justify-between items-center mt-2">
                        <Text className="text-gray-400 font-bold uppercase tracking-wider">Total Due</Text>
                        <Text className="text-2xl font-black text-white">€{total}</Text>
                    </View>
                </View>

                {/* Shipping Details Form */}
                <View className="bg-gray-900 border border-gray-800 p-5 rounded-2xl mb-6 shadow-sm">
                    <Text className="text-lg font-bold text-white mb-5 uppercase tracking-wider">Contact Info</Text>
                    
                    <View className="space-y-4">
                        <View className="flex-row gap-4">
                            <TextInput placeholder="First Name" placeholderTextColor="#6b7280" value={shippingDetails.firstName} onChangeText={(t) => updateShipping('firstName', t)} className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 h-14 text-white" />
                            <TextInput placeholder="Last Name" placeholderTextColor="#6b7280" value={shippingDetails.lastName} onChangeText={(t) => updateShipping('lastName', t)} className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 h-14 text-white" />
                        </View>
                        <TextInput placeholder="Email Address" placeholderTextColor="#6b7280" keyboardType="email-address" autoCapitalize="none" value={shippingDetails.email} onChangeText={(t) => updateShipping('email', t)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 h-14 text-white" />
                        <TextInput placeholder="Phone Number" placeholderTextColor="#6b7280" keyboardType="phone-pad" value={shippingDetails.phone} onChangeText={(t) => updateShipping('phone', t)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 h-14 text-white" />
                        <TextInput placeholder="Street Address" placeholderTextColor="#6b7280" value={shippingDetails.address1} onChangeText={(t) => updateShipping('address1', t)} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 h-14 text-white" />
                        
                        <View className="flex-row gap-4">
                            <TextInput placeholder="City" placeholderTextColor="#6b7280" value={shippingDetails.city} onChangeText={(t) => updateShipping('city', t)} className="flex-[2] bg-gray-800 border border-gray-700 rounded-xl px-4 h-14 text-white" />
                            <TextInput placeholder="Zip" placeholderTextColor="#6b7280" value={shippingDetails.postcode} onChangeText={(t) => updateShipping('postcode', t)} className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 h-14 text-white" />
                        </View>
                    </View>
                </View>

            </View>

            {/* RIGHT COLUMN (Or Bottom on Mobile): Payment Form */}
            <View className={`${Platform.OS === 'web' ? 'w-96' : 'w-full'}`}>
                <View className="bg-gray-900 border border-gray-800 p-5 rounded-2xl shadow-sm">
                    <Text className="text-lg font-bold text-white mb-2 uppercase tracking-wider">Payment</Text>
                    
                    {clientSecret ? (
                        Platform.OS === 'web' ? (
                            // Web Stripe Implementation (Requires <Elements> Wrapper)
                            <Elements options={{ clientSecret }} stripe={stripePromise}>
                                <CheckoutForm onPaymentSuccess={onPaymentSuccess} />
                            </Elements>
                        ) : (
                            // Native Stripe Implementation (No Wrapper, passes clientSecret directly)
                            <CheckoutForm clientSecret={clientSecret} onPaymentSuccess={onPaymentSuccess} />
                        )
                    ) : (
                        <View className="flex items-center justify-center h-32">
                            <ActivityIndicator size="large" color="#22d3ee" />
                            <Text className="text-gray-400 mt-4">Securing payment channel...</Text>
                        </View>
                    )}
                </View>
            </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}