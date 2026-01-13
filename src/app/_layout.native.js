import { Stack } from "expo-router";
import { AuthProvider } from "../context/AuthContext";
import { CartProvider } from "../context/CartContext";
import "../app/globals.css"; // Load Tailwind styles

export default function RootLayout() {
  return (
    <AuthProvider>
      <CartProvider>
        {/* The Stack is like the mobile version of a Router */}
        <Stack 
          screenOptions={{ 
            headerShown: false, // We will build custom headers
            contentStyle: { backgroundColor: '#ffffff' } 
          }} 
        />
      </CartProvider>
    </AuthProvider>
  );
}