'use client';

import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from 'next/link';
import { Trash2, ShoppingBag, Calendar, Clock, User } from "lucide-react"; // Added ShoppingBag for empty state
import clsx from 'clsx';
import { format } from 'date-fns';


const CartPanel = () => {
  const { isCartOpen, closeCart, cartItems, removeFromCart, updateQuantity, total } = useCart();

  const panelClasses = clsx(
    'fixed top-0 left-0 w-96 h-full bg-black/80 backdrop-blur-md text-white shadow-2xl z-[1001] flex flex-col transition-transform duration-500 ease-in-out',
    isCartOpen ? 'translate-x-0' : '-translate-x-full'
  );

  return (
    <div className={panelClasses}>
      {/* Panel Header */}
      <div className="flex justify-between items-center p-4 bg-black/30 border-b border-gray-700">
        <h2 className="text-xl font-bold">Your Itinerary</h2>
        <button onClick={closeCart} className="text-3xl">&times;</button>
      </div>

      {cartItems.length > 0 ? (
        <>
          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 divide-y divide-gray-700">
            {cartItems.map((item) => (
              <div key={item.id} className="flex items-start gap-4 py-4">
                <div className="relative h-16 w-16 rounded-md overflow-hidden border border-gray-600 flex-shrink-0">
                   <Image
                    src={item.images?.[0]?.src || '/placeholder.png'}
                    alt={item.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-white">{item.name}</h3>
                  <p className="text-sm text-gray-400">${item.price}</p>
                  
                  {/* --- THIS IS THE NEW DISPLAY LOGIC --- */}
                  <div className="text-xs text-gray-400 mt-2 space-y-1">
                    {item.date && (
                        <p className="flex items-center"><Calendar className="w-3 h-3 mr-1.5"/> {format(new Date(item.date), 'PPP')}</p>
                    )}
                    {item.time && (
                        <p className="flex items-center"><Clock className="w-3 h-3 mr-1.5"/> {item.time}</p>
                    )}
                     <p className="flex items-center"><User className="w-3 h-3 mr-1.5"/> {item.quantity} Participant(s)</p>
                  </div>
                  
                  <div className="flex items-center gap-1 mt-2 border border-gray-600 rounded-md w-fit bg-white/5">
                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="h-7 w-7 text-gray-300 hover:bg-white/10 rounded-l-md">-</button>
                    <span className="text-sm w-5 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="h-7 w-7 text-gray-300 hover:bg-white/10 rounded-r-md">+</button>
                  </div>


                </div>
                <button className="text-gray-500 hover:text-red-500 transition-colors" onClick={() => removeFromCart(item.id)}>
                  
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Panel Footer */}
          <div className="p-4 bg-black/30 border-t border-gray-700 mt-auto">
              <div className="w-full space-y-4">
                  <div className="flex justify-between font-semibold text-lg">
                      <span>Total</span>
                      <span>${total}</span>
                  </div>
                  <Link href="/checkout" passHref>
                    <Button 
                      className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-bold" 
                      size="lg" 
                      onClick={closeCart}
                    >
                      Proceed to Checkout
                    </Button>
                  </Link>
              </div>
          </div>
        </>
      ) : (
        // Empty Cart State
        <div className="flex flex-col items-center justify-center h-full text-center">
          <ShoppingBag className="h-16 w-16 text-gray-600 mb-4" />
          <p className="text-gray-400">Your itinerary is empty.</p>
          <Button 
            variant="outline" 
            className="mt-4 bg-transparent border-gray-500 hover:bg-gray-700 hover:text-white" 
            onClick={closeCart}
          >
            Keep Exploring
          </Button>
        </div>
      )}
    </div>
  );
};

export default CartPanel;