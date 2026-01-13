import { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Modal, Pressable } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useCart } from '@/context/CartContext';
import { ShoppingCart, User, LogOut, UserCog, X } from 'lucide-react-native';

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
    <View className="z-50 w-full border-b border-gray-700 bg-black/90 pt-12 pb-4">
      <View className="flex-row items-center justify-between px-6">

        {/* Left side: Store Link */}
        <View className="flex-1 items-start">
           <Link href="/store" asChild>
             <TouchableOpacity>
                <Text className="text-sm font-medium text-gray-300">Store</Text>
             </TouchableOpacity>
           </Link>
        </View>

        {/* Center: Logo */}
        <View className="items-center justify-center">
          <Link href="/" asChild>
            <TouchableOpacity>
                {/* Note: For Expo, local images often work best with 'require'. 
                   Ensure the path is correct relative to this file. 
                */}
                <Image 
                  source={require('../../public/hyrosy.png')} 
                  style={{ width: 40, height: 40, resizeMode: 'contain' }}
                />
            </TouchableOpacity>
          </Link>
        </View>

        {/* Right side: Cart & Auth */}
        <View className="flex-1 flex-row items-center justify-end gap-4">
            
            {/* Cart Button */}
            <TouchableOpacity onPress={toggleCart} className="relative p-2">
              <ShoppingCart size={24} color="#d1d5db" /> {/* text-gray-300 */}
              {itemCount > 0 && (
                  <View className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 border border-black">
                      <Text className="text-[10px] font-bold text-white">
                          {itemCount}
                      </Text>
                  </View>
              )}
            </TouchableOpacity>

            {/* === AUTH SECTION === */}
            {session ? (
              <View className="relative">
                <TouchableOpacity 
                    onPress={() => setMenuOpen(!isMenuOpen)}
                    className="h-8 w-8 rounded-full bg-gray-800 items-center justify-center border border-gray-600"
                >
                     <User size={18} color="#d1d5db" />
                </TouchableOpacity>

                {/* Mobile Dropdown / Menu Overlay */}
                {isMenuOpen && (
                    <>
                        {/* Invisible backdrop to close menu when clicking outside */}
                        <Pressable 
                            className="absolute -top-[1000px] -left-[1000px] w-[2000px] h-[2000px] z-0" 
                            onPress={() => setMenuOpen(false)}
                        />
                        
                        {/* The Menu */}
                        <View className="absolute top-10 right-0 w-48 bg-white rounded-lg shadow-xl z-50 overflow-hidden py-1">
                            <TouchableOpacity 
                                onPress={() => handleNavigation('/account')}
                                className="flex-row items-center px-4 py-3 active:bg-gray-100"
                            >
                                <UserCog size={16} color="black" className="mr-2" />
                                <Text className="text-gray-900 text-sm">Account Info</Text>
                            </TouchableOpacity>
                            
                            <View className="h-[1px] bg-gray-200 w-full" />
                            
                            <TouchableOpacity 
                                onPress={handleLogout}
                                className="flex-row items-center px-4 py-3 active:bg-gray-100"
                            >
                                <LogOut size={16} color="#dc2626" className="mr-2" />
                                <Text className="text-red-600 text-sm">Log out</Text>
                            </TouchableOpacity>
                        </View>
                    </>
                )}
              </View>
            ) : (
              <TouchableOpacity 
                className="border border-gray-500 rounded-md px-3 py-1.5 active:bg-white/10"
                onPress={() => setAuthPanelOpen(true)}
              >
                <Text className="text-white text-sm font-medium">Log In</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

      {/* Auth Modal/Panel */}
      <Modal
        visible={isAuthPanelOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAuthPanelOpen(false)}
      >
         <View className="flex-1 justify-end">
            {/* Pass onClose to your existing AuthPanel logic */}
            <AuthPanel onClose={() => setAuthPanelOpen(false)} />
         </View>
      </Modal>
    </View>
  );
}