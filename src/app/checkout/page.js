'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { useCart } from '@/context/CartContext';
import CheckoutForm from '@/components/CheckoutForm';
import Image from 'next/image';
import Link from 'next/link';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input"; // Import Input component
import { Label } from "@/components/ui/label"; // Import Label component
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Import Select components

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

export default function CheckoutPage() {
  const { cartItems, total, clearCart, updateQuantity, removeFromCart } = useCart(); // Added removeFromCart
  const [clientSecret, setClientSecret] = useState('');
  const [shippingDetails, setShippingDetails] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    postcode: '',
    country: 'Morocco' // Default country
  });

  useEffect(() => {
    if (cartItems.length > 0 && !clientSecret) { // Only fetch clientSecret if not already set
      fetch('/api/create-payment-intent', {
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
    alert("Payment Successful! Your order has been placed.");
    clearCart();
    // In a real app, you'd navigate to an order confirmation page
    setTimeout(() => {
        window.location.href = '/'; 
    }, 2000);
  };

  const handleShippingChange = (e) => {
    const { id, value } = e.target;
    setShippingDetails(prev => ({ ...prev, [id]: value }));
  };

  const handleCountryChange = (value) => {
    setShippingDetails(prev => ({ ...prev, country: value }));
  };

  // If cart is empty, redirect or show message
  if (cartItems.length === 0 && !clientSecret) { // Check clientSecret too, in case it's loading
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-center">
            <h1 className="text-2xl font-bold mb-4">Your Cart is Empty!</h1>
            <p className="text-gray-600 mb-6">Add some products to proceed to checkout.</p>
            <Link href="/store">
                <Button>Go to Store</Button>
            </Link>
        </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <header className="py-4 px-8 border-b bg-white text-center">
        <Link href="/" className="text-2xl font-bold tracking-tight">Hyrosy</Link>
      </header>

      <main className="max-w-6xl mx-auto p-4 sm:p-8 grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Left Column: Order Summary & Shipping Details */}
        <div className="lg:col-span-1 space-y-8">
          {/* Order Summary */}
          <div className="bg-white p-6 rounded-lg border">
            <h2 className="text-xl font-semibold mb-4">Your Itinerary</h2>
            <div className="space-y-4">
              {cartItems.map(item => (
                <div key={item.id} className="flex items-start gap-4">
                  <div className="relative h-20 w-20 rounded-md overflow-hidden border">
                    <Image src={item.images?.[0]?.src || '/placeholder.png'} alt={item.name} fill className="object-cover" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium">{item.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">${item.price}</p>
                    <div className="flex items-center gap-2 mt-2 border rounded-md w-fit">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => item.quantity > 1 ? updateQuantity(item.id, item.quantity - 1) : removeFromCart(item.id)} // Remove if quantity is 1
                        className="p-0 h-8 w-8"
                      >-</Button>
                      <span className="text-sm w-4 text-center">{item.quantity}</span>
                      <Button variant="ghost" size="sm" onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-0 h-8 w-8">+</Button>
                    </div>
                  </div>
                  <p className="text-sm font-semibold">${(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
              <div className="border-t pt-4 mt-4 space-y-2">
                  <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Subtotal</span>
                      <span>${total}</span>
                  </div>
                   <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Shipping</span>
                      <span>Free</span> {/* Placeholder for now */}
                  </div>
                  <div className="flex justify-between font-semibold text-lg">
                      <span>Total</span>
                      <span>${total}</span>
                  </div>
              </div>
            </div>
          </div>

          {/* Shipping & Contact Information */}
          <div className="bg-white p-6 rounded-lg border">
            <h2 className="text-xl font-semibold mb-4">Shipping Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" placeholder="John" value={shippingDetails.firstName} onChange={handleShippingChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" placeholder="Doe" value={shippingDetails.lastName} onChange={handleShippingChange} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="john.doe@example.com" value={shippingDetails.email} onChange={handleShippingChange} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" type="tel" placeholder="+1 (555) 123-4567" value={shippingDetails.phone} onChange={handleShippingChange} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address1">Address</Label>
                <Input id="address1" placeholder="123 Main St" value={shippingDetails.address1} onChange={handleShippingChange} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address2">Apartment, suite, etc. (optional)</Label>
                <Input id="address2" placeholder="Apt 4B" value={shippingDetails.address2} onChange={handleShippingChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" placeholder="Marrakech" value={shippingDetails.city} onChange={handleShippingChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postcode">Postal Code</Label>
                <Input id="postcode" placeholder="40000" value={shippingDetails.postcode} onChange={handleShippingChange} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="country">Country</Label>
                 <Select onValueChange={handleCountryChange} defaultValue={shippingDetails.country}>
                    <SelectTrigger id="country" className="w-full">
                        <SelectValue placeholder="Select a country" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Morocco">Morocco</SelectItem>
                        {/* Add more countries as needed */}
                    </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Payment Details */}
        <div className="lg:col-span-1">
            <h1 className="text-2xl font-semibold mb-6"></h1> {/* Empty heading for alignment */}
          <div className="bg-white p-6 rounded-lg border">
            {clientSecret ? (
              <Elements options={{ clientSecret }} stripe={stripePromise}>
                <CheckoutForm onPaymentSuccess={onPaymentSuccess} />
              </Elements>
            ) : (
              <div className="flex items-center justify-center h-48">
                <p>Loading payment form...</p>
              </div>
            )}
          </div>
           <Accordion type="single" collapsible className="w-full mt-8">
              <AccordionItem value="item-1">
                <AccordionTrigger>Shipping & Returns</AccordionTrigger>
                <AccordionContent>
                  Shipping is calculated at the next step. We offer a 30-day return policy for all unused items.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>Need Help?</AccordionTrigger>
                <AccordionContent>
                  Contact our support team at support@hyrosy.com for any questions about your order.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
        </div>
      </main>
    </div>
  );
}