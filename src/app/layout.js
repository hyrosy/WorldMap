import "./globals.css";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "./providers"; 
import Header from "@/components/Header";
import CartPanel from "@/components/CartPanel";
import 'mapbox-gl/dist/mapbox-gl.css';
import { AuthProvider } from "@/context/AuthContext"; // <-- 1. IMPORT
import { Toaster } from "@/components/ui/sonner"; // 1. Import the new Toaster



const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "hyrosy World Map",
  description: "Discover Morocco with hyrosy",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="light h-full">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#d3bc8e" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <AuthProvider>
        <Providers>
          <div>
          <Header />
          <main>{children}</main> {/* Let the page component handle its own layout */}
          <CartPanel />
          <Toaster richColors />
          </div>
        </Providers>
        </AuthProvider>
      </body>
    </html>
  );
}