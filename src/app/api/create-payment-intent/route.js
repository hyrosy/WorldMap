import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const getProductPrice = async (productId) => {
    // Log which product we are trying to fetch
    console.log(`[SERVER LOG] Fetching price for product ID: ${productId}`);
    const wooApiUrl = `https://www.hyrosy.com/wp-json/wc/v3/products/${productId}`;
    const authString = btoa(`${process.env.WOOCOMMERCE_KEY}:${process.env.WOOCOMMERCE_SECRET}`);
    
    try {
        const response = await fetch(wooApiUrl, { 
            headers: { 'Authorization': `Basic ${authString}` } 
        });

        // If the response is not OK, log the details
        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`[SERVER LOG] Failed to fetch product ${productId}. Status: ${response.status}. Body: ${errorBody}`);
            return null;
        }

        const product = await response.json();
        console.log(`[SERVER LOG] Successfully fetched product ${productId}. Price: ${product.price}`);
        return parseFloat(product.price);

    } catch (error) {
        // Log any network or other errors
        console.error(`[SERVER LOG] Catch Block Error fetching product ${productId}:`, error);
        return null;
    }
};

export async function POST(request) {
  console.log('[SERVER LOG] Received new payment intent request.');
  const { items } = await request.json();

  // Log the items received from the client
  console.log('[SERVER LOG] Cart items received:', JSON.stringify(items, null, 2));

  if (!items || !Array.isArray(items)) {
    console.error('[SERVER LOG] Invalid cart data received.');
    return new NextResponse("Invalid cart data", { status: 400 });
  }

  let calculatedTotal = 0;

  for (const item of items) {
    // Ensure item has an ID and quantity
    if (!item.id || !item.quantity) {
        console.error('[SERVER LOG] Invalid item in cart:', item);
        return new NextResponse(`Invalid item in cart`, { status: 400 });
    }
    const price = await getProductPrice(item.id);
    
    if (price === null) {
      console.error(`[SERVER LOG] Price lookup failed for item ID ${item.id}. Aborting.`);
      return new NextResponse(`Could not find price for product ID ${item.id}`, { status: 400 });
    }
    
    calculatedTotal += price * item.quantity;
  }
  
  console.log(`[SERVER LOG] Total calculated: ${calculatedTotal}`);
  const amountInCents = Math.round(calculatedTotal * 100);

  if (amountInCents <= 0) {
    console.error(`[SERVER LOG] Invalid final amount: ${amountInCents}`);
    return new NextResponse("Invalid amount", { status: 400 });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: "usd",
      automatic_payment_methods: {
        enabled: true,
      },
    });
    
    console.log(`[SERVER LOG] Successfully created Stripe Payment Intent.`);
    return NextResponse.json({ clientSecret: paymentIntent.client_secret });

  } catch (error) {
    console.error("[SERVER LOG] Stripe Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}