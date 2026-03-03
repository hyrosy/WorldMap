import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Modal, Platform } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useCart } from '@/context/CartContext';
import { ShoppingCart, User, LogOut, UserCog } from 'lucide-react-native';

import { useAuth } from "@/context/AuthContext"; 
import { supabase } from "@/lib/supabaseClient";   
import AuthPanel from "@/components/AuthPanel"; 

export default function Header() {
  const { toggleCart, itemCount } = useCart();
  const { session } = useAuth();
  const router = useRouter();
  
  const [isAuthPanelOpen, setAuthPanelOpen] = useState(false);
  const [isMenuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    setMenuOpen(false);
    await supabase.auth.signOut();
  };

  const handleNavigation = (path) => {
    setMenuOpen(false);
    router.push(path);
  };

  return (
    <View className="z-50 w-full border-b border-gray-800 bg-gray-900 pt-12 pb-4">
      <View className="flex-row items-center justify-between px-6">

        {/* Left side: Store Link */}
        <View className="flex-1 items-start">
           <Link href="/store" asChild>
             <TouchableOpacity className="active:opacity-70">
                <Text className="text-base font-bold text-gray-300">Store</Text>
             </TouchableOpacity>
           </Link>
        </View>

        {/* Center: Logo */}
        <View className="items-center justify-center">
          <Link href="/" asChild>
            <TouchableOpacity className="active:scale-95 transition-transform">
                <Image 
                  source={require('../../public/hyrosy.png')} 
                  style={{ width: 40, height: 40, resizeMode: 'contain' }}
                />
            </TouchableOpacity>
          </Link>
        </View>

        {/* Right side: Cart & Auth */}
        <View className="flex-1 flex-row items-center justify-end gap-5">
            
            {/* Cart Button */}
            <TouchableOpacity onPress={toggleCart} className="relative p-1 active:opacity-70">
              <ShoppingCart size={24} color="#d1d5db" />
              {itemCount > 0 && (
                  <View className="absolute -top-1 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500 border-2 border-gray-900">
                      <Text className="text-[10px] font-black text-gray-900">
                          {itemCount}
                      </Text>
                  </View>
              )}
            </TouchableOpacity>

            {/* === AUTH SECTION === */}
            {session ? (
              <View>
                <TouchableOpacity 
                    onPress={() => setMenuOpen(true)}
                    className="h-8 w-8 rounded-full bg-gray-800 items-center justify-center border border-gray-700 active:bg-gray-700"
                >
                     <User size={18} color="#d1d5db" />
                </TouchableOpacity>

                {/* Safely Overlay the Dropdown Menu */}
                {isMenuOpen && (
                  <Modal transparent visible={isMenuOpen} animationType="fade" onRequestClose={() => setMenuOpen(false)}>
                    <TouchableOpacity 
                      className="flex-1" 
                      activeOpacity={1} 
                      onPress={() => setMenuOpen(false)}
                    >
                      {/* Positioned relative to the top right of the screen */}
                      <View className="absolute top-24 right-6 w-52 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden py-2">
                          <TouchableOpacity 
                              onPress={() => handleNavigation('/account')}
                              className="flex-row items-center px-5 py-3.5 active:bg-gray-800"
                          >
                              <UserCog size={18} color="#9ca3af" className="mr-3" />
                              <Text className="text-white font-bold text-sm">Account Info</Text>
                          </TouchableOpacity>
                          
                          <View className="h-[1px] bg-gray-800 w-full my-1" />
                          
                          <TouchableOpacity 
                              onPress={handleLogout}
                              className="flex-row items-center px-5 py-3.5 active:bg-gray-800"
                          >
                              <LogOut size={18} color="#f87171" className="mr-3" />
                              <Text className="text-red-400 font-bold text-sm">Log out</Text>
                          </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  </Modal>
                )}
              </View>
            ) : (
              <TouchableOpacity 
                className="bg-gray-800 border border-gray-700 rounded-full px-4 py-2 active:bg-gray-700"
                onPress={() => setAuthPanelOpen(true)}
              >
                <Text className="text-white text-sm font-bold">Log In</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

      {/* Conditionally Render the Auth Panel (AuthPanel handles its own Modal now!) */}
      {isAuthPanelOpen && (
        <AuthPanel onClose={() => setAuthPanelOpen(false)} />
      )}
    </View>
  );
}