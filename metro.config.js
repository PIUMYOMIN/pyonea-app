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

// jspdf's "node" build uses AMD requires that Metro cannot parse (breaks SSG export),
// so always resolve it to the browser ES build. Its optional peers (canvg, dompurify)
// are only needed for features we don't use — resolve them as empty modules.
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "jspdf") {
    return {
      type: "sourceFile",
      filePath: path.resolve(__dirname, "node_modules/jspdf/dist/jspdf.es.min.js"),
    };
  }
  if (moduleName === "canvg" || moduleName === "dompurify") {
    return { type: "empty" };
  }
  return (defaultResolveRequest ?? context.resolveRequest)(context, moduleName, platform);
};

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
