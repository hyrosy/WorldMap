module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel", // <-- Moved back to presets!
    ],
    plugins: [
      "react-native-reanimated/plugin", // Keep this in plugins
    ],
  };
};