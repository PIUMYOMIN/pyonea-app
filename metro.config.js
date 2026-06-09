const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const os = require("os");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

if (process.platform === "win32") {
  config.maxWorkers = Math.max(1, Math.min(4, os.availableParallelism?.() ?? os.cpus().length));
}

module.exports = withNativeWind(config, { input: "./src/global.css" });
