'use client';

import { CartProvider } from '@/context/CartContext';
import { usePathname } from 'next/navigation';
import { AuthProvider } from "@/context/AuthContext"; // 1. Import AuthProvider
import { RouteBuilderProvider } from "@/context/RouteBuilderContext"; // 1. Import


export function Providers({ children }) {
  const pathname = usePathname();

  // Conditionally render based on the path
  const isMapPage = pathname === '/';
  
  return (
    <AuthProvider>
    <CartProvider>
      <RouteBuilderProvider>
        {children}
      </RouteBuilderProvider>
    </CartProvider>
    </AuthProvider>
  );
}