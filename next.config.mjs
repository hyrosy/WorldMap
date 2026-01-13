// In next.config.mjs
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {},
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'rugprcqrjickuzcjzzly.supabase.co', // Your Supabase project hostname
        port: '',
        pathname: '/storage/v1/object/public/comment-images/**', // Allows all images from this bucket
      },
      {
        protocol: 'https',
        hostname: 'data.hyrosy.com',
        pathname: '/wp-content/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'd2ucgc4rch4k6r.cloudfront.net',
      },
    ],
  },
};

export default withPWA(nextConfig);