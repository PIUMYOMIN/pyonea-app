module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      [
        "module-resolver",
        {
          root: ["."],
          alias: {
            "@/assets": "./assets",
            "@": "./src",
            "react-native-worklets/plugin": "./babel-plugin-worklets-shim.js",
          },
        },
      ],
      "react-native-reanimated/plugin",
    ],
  };
};
