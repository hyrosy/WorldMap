import { Stack } from "expo-router";
import { Providers } from "./providers"; // <-- Use our new unified wrapper!
import "./globals.css"; // <-- Fixed relative path

export default function RootLayout() {
  return (
    <Providers>
      {/* The Stack is the mobile navigation router */}
      <Stack 
        screenOptions={{ 
          headerShown: false, // We are building custom headers/overlays
          contentStyle: { backgroundColor: '#111827' } // Tailwind gray-900 to match your dark theme
        }} 
      />
    </Providers>
  );
}