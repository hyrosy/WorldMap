'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { ShoppingCart, User, LogOut, UserCog } from 'lucide-react';

import { useAuth } from "@/context/AuthContext"; // Import the useAuth hook
import { supabase } from "@/lib/supabaseClient";   // Import supabase client for logout
import AuthPanel from "@/components/AuthPanel"; // <-- Correct: No curly braces
import { Button } from "@/components/ui/button";  // Using your existing Button component
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// A simple dropdown component for the menu
const Dropdown = ({ trigger, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="relative" onMouseLeave={() => setIsOpen(false)}>
      <button onMouseEnter={() => setIsOpen(true)}>
        {trigger}
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-30">
          {children}
        </div>
      )}
    </div>
  );
};

const DropdownItem = ({ children, onClick }) => (
  <button
    onClick={onClick}
    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
  >
    {children}
  </button>
);


export default function Header() {
  const { toggleCart, itemCount } = useCart();
  const { session } = useAuth(); // Get the user session from our context
  const [isAuthPanelOpen, setAuthPanelOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };



  return (
    <>
    <header className="sticky top-0 z-50 w-full border-b border-gray-700 bg-black/80 backdrop-blur-md text-white">
      <div className="container mx-auto h-20 flex items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* Left side: Store Link */}
        <div className="flex items-center">
           <Link href="/store" className="text-sm font-medium text-gray-300 transition-colors hover:text-white">
             Store
           </Link>
        </div>

        {/* Center: Logo */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <Link href="/">
            <Image 
              src="/hyrosy.png"
              alt="Hyrosy Logo" 
              width={80} // Slightly adjusted for balance
              height={80}
              className="object-contain"
            />
          </Link>
        </div>

        {/* Right side: Cart icon */}
        <div className="flex items-center">
            <button onClick={toggleCart} className="relative p-2 rounded-full text-gray-300 hover:bg-white/10 hover:text-white transition-colors">
              <ShoppingCart className="h-6 w-6" />
              {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                      {itemCount}
                  </span>
              )}
               <span className="sr-only">Open cart</span>
            </button>
            {/* === AUTH SECTION === */}
            {session ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                     <User className="h-6 w-6 text-gray-300" />
                  </Button>
                </DropdownMenuTrigger>
                {/* 1. Added bg-background and text-foreground for proper theme colors */}
                <DropdownMenuContent className="w-56 bg-background text-foreground" align="end" forceMount>
                  
                  {/* 2. Wrapped the content in a Link component */}
                  <DropdownMenuItem asChild>
                    <Link href="/account" className="cursor-pointer">
                      <UserCog className="mr-2 h-4 w-4" />
                      <span>Account Info</span>
                    </Link>
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem onSelect={handleLogout} className="text-red-600 focus:text-red-600 cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="outline" className="text-white border-gray-500 hover:bg-white/10 hover:text-white" onClick={() => setAuthPanelOpen(true)}>
                Log In
              </Button>
            )}
          </div>
        </div>
      </header>

      {isAuthPanelOpen && <AuthPanel onClose={() => setAuthPanelOpen(false)} />}
    </>
  );
}