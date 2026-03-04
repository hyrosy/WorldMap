import { Slot } from "expo-router";
import { Providers } from "./providers";
import "./globals.css";

export default function WebLayout() {
  return (
    <Providers>
      {/* <Slot /> is Expo Router's web equivalent of Next.js {children} */}
      <Slot />
    </Providers>
  );
}
