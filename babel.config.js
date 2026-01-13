module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    // Add this plugin array:
    plugins: [
      "react-native-reanimated/plugin",
    ],
  };
};