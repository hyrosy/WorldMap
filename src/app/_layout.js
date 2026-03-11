import { Stack } from "expo-router";
import { Providers } from "./providers";
import { Toaster } from "sonner"; // <-- 1. Import Toaster
import "./globals.css";

export default function RootLayout() {
  return (
    <Providers>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#111827" },
        }}
      />
      {/* 2. Add the global Toaster overlaid on the app */}
      <Toaster theme="dark" position="top-center" richColors closeButton />
    </Providers>
  );
}
