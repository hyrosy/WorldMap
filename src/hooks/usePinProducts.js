import { useState, useEffect } from 'react';

export default function usePinProducts(selectedPin) {
  const [productsState, setProductsState] = useState({ status: 'idle', data: [] });

  useEffect(() => {
    // If there's no selected pin, reset and do nothing.
    if (!selectedPin) {
      setProductsState({ status: 'idle', data: [] });
      return;
    }

    // UPDATED SCHEMA: Removed the ".acf" nesting
    const categoryId = selectedPin.category_connector_id;
    const productId = selectedPin.connector_id;

    // Check if the pin has product connectors.
    if (categoryId || productId) {
      const fetchProducts = async () => {
        setProductsState({ status: 'loading', data: [] });
        
        const wooApiUrl = categoryId
          ? `https://www.hyrosy.com/wp-json/wc/v3/products?category=${categoryId}`
          : `https://www.hyrosy.com/wp-json/wc/v3/products/${productId}`;
        
        // EXPO UPDATE: Make sure your .env file uses EXPO_PUBLIC_ prefix for mobile!
        // We check for both to ensure it works on Web and Mobile during the transition.
        const key = process.env.EXPO_PUBLIC_WOOCOMMERCE_KEY || process.env.NEXT_PUBLIC_WOOCOMMERCE_KEY;
        const secret = process.env.EXPO_PUBLIC_WOOCOMMERCE_SECRET || process.env.NEXT_PUBLIC_WOOCOMMERCE_SECRET;
        
        const authString = btoa(`${key}:${secret}`);
        
        try {
          const response = await fetch(wooApiUrl, { headers: { 'Authorization': `Basic ${authString}` } });
          if (!response.ok) throw new Error('WooCommerce API response not ok');
          
          let products = await response.json();
          // Ensure the result is always an array
          if (!Array.isArray(products)) products = [products];
          
          setProductsState({ status: 'success', data: products });
        } catch (error) {
          console.error("Failed to fetch WooCommerce products:", error);
          setProductsState({ status: 'error', data: [] });
        }
      };

      fetchProducts();
    } else {
      // If the pin has no product connectors, set to idle.
      setProductsState({ status: 'idle', data: [] });
    }
  }, [selectedPin]); // This effect re-runs ONLY when the selectedPin changes.

  return productsState;
}