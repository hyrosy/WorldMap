import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // Swapped Next.js rules for Expo's universal rules!
  ...compat.extends("expo"),
  {
    ignores: [
      "node_modules/**",
      ".expo/**",       // Replaced .next
      "dist/**",        // Replaced out
      "build/**",
      "expo-env.d.ts",  // Replaced next-env.d.ts
    ],
  },
];

export default eslintConfig;