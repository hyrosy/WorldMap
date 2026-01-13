'use client';

import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useState } from 'react';
import { Button } from '@/components/ui/button'; // Import the shadcn Button
import { Alert, AlertDescription } from '@/components/ui/alert'; // Import the shadcn Alert

export default function CheckoutForm({ onPaymentSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) {
      return;
    }
    setIsLoading(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required', // Important: Prevents Stripe from redirecting
    });
    
    if (error) {
      if (error.type === "card_error" || error.type === "validation_error") {
        setMessage(error.message);
      } else {
        setMessage("An unexpected error occurred.");
      }
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      setMessage("Payment successful!");
      onPaymentSuccess(); // Call the success handler from the parent page
    }

    setIsLoading(false);
  };

  return (
    <form id="payment-form" onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement id="payment-element" />
      
      <Button disabled={isLoading || !stripe || !elements} id="submit" className="w-full" size="lg">
        <span id="button-text">
          {isLoading ? "Processing..." : "Pay now"}
        </span>
      </Button>
      
      {/* Show error or success messages in a styled Alert component */}
      {message && (
        <Alert variant={message.includes('succeeded') ? 'default' : 'destructive'}>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
    </form>
  );
}