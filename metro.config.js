const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { FileStore } = require("@expo/metro-config/build/file-store");
const { withNativeWind } = require("nativewind/metro");
const os = require("os");

/**
 * Custom FileStore that prevents build crashes on Windows when clearing cache.
 * Metro sometimes hits ENOTEMPTY errors on Windows due to file locks from background processes.
 */
class SafeFileStore extends FileStore {
  clear() {
    try {
      super.clear();
    } catch (error) {
      console.warn(
        `[Metro] Warning: Could not fully clear cache directory: ${error.message}. Proceeding with build...`
      );
    }
  }
}

const projectRoot = __dirname;

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// Metro treats .ttf as assets by default, but not .woff2 — required for web font loading.
if (!config.resolver.assetExts.includes("woff2")) {
  config.resolver.assetExts.push("woff2");
}

const blockList = [
  /\.git\//,
  /\.cursor\//,
  /\.expo-perf-check\//,
  /^dist\//,
  /web-build\//,
  /^scripts\//,
  /uploads\//,
  /page\.html$/,
];

config.resolver.blockList = Array.isArray(config.resolver.blockList)
  ? [...config.resolver.blockList, ...blockList]
  : blockList;

config.watchFolders = [projectRoot];

// Keep transform cache inside the project (avoids Windows Temp EMFILE storms).
config.cacheStores = [
  new SafeFileStore({
    root: path.join(projectRoot, "node_modules", ".cache", "metro"),
  }),
];

// Some libraries' "node" build uses AMD requires that Metro cannot parse (breaks SSG export).
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "canvg" || moduleName === "dompurify") {
    return { type: "empty" };
  }
  return (defaultResolveRequest ?? context.resolveRequest)(context, moduleName, platform);
};

if (process.platform === "win32") {
  // Windows can hit EMFILE when Metro opens too many cache files in parallel during HMR.
  config.maxWorkers = 1;
  config.useWatchman = false;
  config.watcher = {
    ...config.watcher,
    healthCheck: {
      enabled: true,
      interval: 30000,
      timeout: 10000,
    },
  };
} else {
  config.maxWorkers = Math.max(1, Math.min(4, os.availableParallelism?.() ?? os.cpus().length));
}

module.exports = withNativeWind(config, { input: "./src/global.css" });
