import { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // 1. Load Cart on Mount (Works on Web & Mobile automatically!)
  useEffect(() => {
    const loadCart = async () => {
      try {
        const savedCart = await AsyncStorage.getItem('hyrosy-cart');
        if (savedCart) {
            setCart(JSON.parse(savedCart));
        }
      } catch (error) {
        console.error('Failed to load cart:', error);
      } finally {
        setIsLoaded(true);
      }
    };
    loadCart();
  }, []);

  // 2. Save Cart whenever it changes
  useEffect(() => {
    if (!isLoaded) return; // Don't overwrite storage with empty array on initial load

    const saveCart = async () => {
      try {
        const jsonValue = JSON.stringify(cart);
        await AsyncStorage.setItem('hyrosy-cart', jsonValue);
      } catch (error) {
        console.error('Failed to save cart:', error);
      }
    };
    saveCart();
  }, [cart, isLoaded]);

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  };

  const clearCart = async () => {
    setCart([]);
    await AsyncStorage.removeItem('hyrosy-cart');
  };

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}