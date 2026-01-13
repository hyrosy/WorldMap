import { useState, useEffect } from 'react';

export default function usePinProducts(selectedPin) {
  const [productsState, setProductsState] = useState({ status: 'idle', data: [] });

  useEffect(() => {
    // If there's no selected pin, reset and do nothing.
    if (!selectedPin) {
      setProductsState({ status: 'idle', data: [] });
      return;
    }

    // Check if the pin has product connectors.
    if (selectedPin.acf.category_connector_id || selectedPin.acf.connector_id) {
      const fetchProducts = async () => {
        setProductsState({ status: 'loading', data: [] });
        
        const wooApiUrl = selectedPin.acf.category_connector_id
          ? `https://www.hyrosy.com/wp-json/wc/v3/products?category=${selectedPin.acf.category_connector_id}`
          : `https://www.hyrosy.com/wp-json/wc/v3/products/${selectedPin.acf.connector_id}`;
        
        const authString = btoa(`${process.env.NEXT_PUBLIC_WOOCOMMERCE_KEY}:${process.env.NEXT_PUBLIC_WOOCOMMERCE_SECRET}`);
        
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
