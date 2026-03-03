import { CartProvider } from '@/context/CartContext';
import { AuthProvider } from "@/context/AuthContext";
import { RouteBuilderProvider } from "@/context/RouteBuilderContext";

export function Providers({ children }) {
  // Pure, clean wrapper for all your global state.
  // This will be imported into your _layout.js files!
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