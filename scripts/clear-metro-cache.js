const fs = require("fs");
const os = require("os");
const path = require("path");

const projectRoot = path.join(__dirname, "..");

const targets = [
  path.join(projectRoot, "node_modules", ".cache", "metro"),
  path.join(os.tmpdir(), "metro-cache"),
  path.join(os.tmpdir(), "haste-map-metro"),
  path.join(os.tmpdir(), "metro-cache-graph"),
];

for (const target of targets) {
  if (!fs.existsSync(target)) continue;

  try {
    fs.rmSync(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    console.log(`Removed ${target}`);
  } catch (error) {
    console.warn(`Could not remove ${target}: ${error.message}`);
  }
}
