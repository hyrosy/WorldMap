'use client';

import React, { useState } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

export default function CheckoutForm({ onPaymentSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    
    setIsLoading(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required', // Prevents Stripe from redirecting away from your PWA
    });
    
    if (error) {
      if (error.type === "card_error" || error.type === "validation_error") {
        setMessage(error.message);
      } else {
        setMessage("An unexpected error occurred.");
      }
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      setMessage("Payment successful!");
      onPaymentSuccess(); 
    }

    setIsLoading(false);
  };

  return (
    <form id="payment-form" onSubmit={handleSubmit} className="space-y-6 w-full mt-4">
      {/* Stripe Web Iframe Element */}
      <div className="bg-white p-4 rounded-xl">
         <PaymentElement id="payment-element" />
      </div>
      
      <button 
        disabled={isLoading || !stripe || !elements} 
        id="submit" 
        className="w-full h-14 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 text-white font-bold rounded-xl transition-colors shadow-lg flex items-center justify-center"
      >
        <span id="button-text">
          {isLoading ? "Processing..." : "Pay Securely"}
        </span>
      </button>
      
      {/* Alert Message */}
      {message && (
        <div className={`p-4 rounded-xl border ${message.includes('successful') ? 'bg-green-900/30 border-green-500 text-green-400' : 'bg-red-900/30 border-red-500 text-red-400'}`}>
          <p className="text-sm font-medium">{message}</p>
        </div>
      )}
    </form>
  );
}