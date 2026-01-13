'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
    const [cartItems, setCartItems] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [total, setTotal] = useState(0);

    useEffect(() => {
        const newTotal = cartItems.reduce((acc, item) => acc + (parseFloat(item.price) * item.quantity), 0);
        setTotal(newTotal.toFixed(2));
    }, [cartItems]);

    // --- THIS IS THE CORRECTED FUNCTION ---
    const addToCart = (product, options = {}) => {
        const { quantity = 1, date = null, time = null } = options;

        setCartItems(prevItems => {
            // In a real app, you might want a more complex check for existing items 
            // (e.g., same product but different dates should be separate items).
            // For now, we'll keep it simple and just add it as a new item.
            const uniqueId = product.id + (date ? `-${date.toISOString()}` : '') + (time ? `-${time}` : '');
            
            const existingItem = prevItems.find(item => item.uniqueId === uniqueId);

            if (existingItem) {
                 return prevItems.map(item =>
                    item.uniqueId === uniqueId ? { ...item, quantity: item.quantity + quantity } : item
                );
            }
            
            // Add the new booking details to the item object
            return [...prevItems, { ...product, quantity, date, time, uniqueId }];
        });
        setIsCartOpen(true); // Open cart on add
    };

    const removeFromCart = (uniqueId) => {
        setCartItems(prevItems => prevItems.filter(item => item.uniqueId !== uniqueId));
    };

    const updateQuantity = (uniqueId, newQuantity) => {
        if (newQuantity < 1) {
            removeFromCart(uniqueId);
            return;
        }
        setCartItems(prevItems =>
            prevItems.map(item =>
                item.uniqueId === uniqueId ? { ...item, quantity: newQuantity } : item
            )
        );
    };
    
    const clearCart = () => setCartItems([]);
    const openCart = () => setIsCartOpen(true);
    const closeCart = () => setIsCartOpen(false);
    const toggleCart = () => setIsCartOpen(prevState => !prevState);

    const value = {
        cartItems,
        isCartOpen,
        total,
        itemCount: cartItems.reduce((acc, item) => acc + item.quantity, 0),
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        openCart,
        closeCart,
        toggleCart,
    };

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};