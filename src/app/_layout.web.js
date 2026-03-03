import { Slot } from "expo-router";
import Head from "expo-router/head"; // Expo's way of managing the <head> tags
import { Providers } from "./providers";
import "./globals.css";

export default function WebLayout() {
  return (
    <>
      {/* Replaces the Next.js 'metadata' export */}
      <Head>
        <title>Hyrosy</title>
        <meta name="description" content="Explore authentic experiences around Morocco." />
        {/* If you have a favicon, Expo will automatically pick it up from your public folder, 
            or you can explicitly link it here! */}
      </Head>

      <Providers>
        {/* <Slot /> is Expo Router's web equivalent of Next.js {children} */}
        <Slot /> 
      </Providers>
    </>
  );
}