import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';

// NOTE: On Native, you MUST pass the clientSecret directly to this component as a prop!
export default function CheckoutForm({ clientSecret, onPaymentSuccess }) {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [loading, setLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Initialize the Native Payment Sheet as soon as we get the clientSecret from your backend
  useEffect(() => {
    const initializePaymentSheet = async () => {
      if (!clientSecret) return;

      const { error } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'Hyrosy',
        allowsDelayedPaymentMethods: true,
        // Set to true if you want to support Apple Pay / Google Pay automatically!
        applePay: { merchantCountryCode: 'MA' }, 
        googlePay: { merchantCountryCode: 'MA', testEnv: true }, 
      });

      if (error) {
        Alert.alert("Initialization Error", error.message);
      } else {
        setIsReady(true);
      }
    };

    initializePaymentSheet();
  }, [clientSecret, initPaymentSheet]);

  const openPaymentSheet = async () => {
    if (!isReady) return;
    setLoading(true);

    // Slide up the native Apple/Google/Card payment sheet
    const { error } = await presentPaymentSheet();

    if (error) {
      if (error.code === 'Canceled') {
        // User closed the sheet without paying, just ignore
        console.log('Payment canceled by user');
      } else {
        Alert.alert(`Error code: ${error.code}`, error.message);
      }
    } else {
      Alert.alert('Success', 'Your payment is confirmed!');
      onPaymentSuccess();
    }
    
    setLoading(false);
  };

  return (
    <View className="w-full mt-6 space-y-4">
      <TouchableOpacity 
        onPress={openPaymentSheet}
        disabled={loading || !isReady}
        className={`w-full h-14 rounded-xl items-center justify-center shadow-lg ${loading || !isReady ? 'bg-gray-700' : 'bg-cyan-600 active:bg-cyan-700'}`}
      >
        {loading || !isReady ? (
            <ActivityIndicator color="white" />
        ) : (
            <Text className="text-white font-bold text-lg">Pay Securely</Text>
        )}
      </TouchableOpacity>

      {!isReady && !clientSecret && (
          <Text className="text-gray-500 text-center text-xs mt-2">Preparing secure payment...</Text>
      )}
    </View>
  );
}