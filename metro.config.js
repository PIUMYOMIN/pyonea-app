const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const os = require("os");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const blockList = [
  /\.git\//,
  /\.expo-perf-check\//,
  /dist\//,
  /web-build\//,
];

config.resolver.blockList = Array.isArray(config.resolver.blockList)
  ? [...config.resolver.blockList, ...blockList]
  : blockList;

config.watchFolders = [path.resolve(__dirname)];

if (process.platform === "win32") {
  // Windows can hit EMFILE when Metro opens too many files in parallel.
  config.maxWorkers = 2;
  config.server = {
    ...config.server,
    useWatchman: false,
  };
} else {
  config.maxWorkers = Math.max(1, Math.min(4, os.availableParallelism?.() ?? os.cpus().length));
}

module.exports = withNativeWind(config, { input: "./src/global.css" });
