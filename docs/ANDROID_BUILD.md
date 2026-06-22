# Android Build Configuration & Setup Guide

This document provides detailed information about the Android build configuration, package versions, and workarounds applied to successfully build the Pyonea app.

## 📋 Table of Contents

- [Environment Versions](#environment-versions)
- [Dependencies](#dependencies)
- [Android Build Configuration](#android-build-configuration)
- [Known Issues & Workarounds](#known-issues--workarounds)
- [Building the Release APK](#building-the-release-apk)
- [Troubleshooting](#troubleshooting)

---

## Environment Versions

| Component             | Version                        |
| --------------------- | ------------------------------ |
| Node.js               | v20.19.0                       |
| npm                   | Latest (included with Node.js) |
| Expo                  | ~52.0.23                       |
| React Native          | 0.76.9                         |
| React                 | 18.3.1                         |
| TypeScript            | ~5.3.3                         |
| Kotlin                | 1.9.25                         |
| Gradle                | 8.10.2                         |
| Android Gradle Plugin | 8.6.0                          |
| Build Tools           | 35.0.0                         |
| Min SDK               | 24                             |
| Target SDK            | 34                             |
| Compile SDK           | 35                             |
| NDK                   | 26.1.10909125                  |

---

## Dependencies

### Core Dependencies

```json
{
  "@expo/vector-icons": "^14.0.0",
  "@react-native-async-storage/async-storage": "1.23.1",
  "@react-native-community/datetimepicker": "^9.1.0",
  "babel-plugin-module-resolver": "^5.0.3",
  "expo": "~52.0.23",
  "expo-auth-session": "~6.0.0",
  "expo-constants": "~17.0.3",
  "expo-crypto": "~14.0.1",
  "expo-dev-client": "~5.0.10",
  "expo-device": "~7.0.1",
  "expo-document-picker": "~12.0.2",
  "expo-file-system": "~18.0.6",
  "expo-font": "~13.0.2",
  "expo-image": "~2.0.3",
  "expo-image-picker": "~16.0.3",
  "expo-linking": "~7.0.3",
  "expo-localization": "~16.0.0",
  "expo-notifications": "~0.29.11",
  "expo-print": "~14.0.2",
  "expo-router": "~4.0.15",
  "expo-secure-store": "~14.0.0",
  "expo-sharing": "~13.0.1",
  "expo-splash-screen": "~0.29.18",
  "expo-status-bar": "~2.0.1",
  "expo-symbols": "~0.2.0",
  "expo-system-ui": "~4.0.6",
  "expo-web-browser": "~14.0.1",
  "i18next": "^26.3.1",
  "nativewind": "^4.1.23",
  "react": "18.3.1",
  "react-dom": "18.3.1",
  "react-ga4": "^3.0.1",
  "react-native": "0.76.5",
  "react-native-gesture-handler": "~2.20.2",
  "react-native-qrcode-svg": "^6.3.21",
  "react-native-reanimated": "~3.16.1",
  "react-native-safe-area-context": "4.12.0",
  "react-native-screens": "~4.1.0",
  "react-native-svg": "15.8.0",
  "react-native-web": "~0.19.13",
  "tailwindcss": "^3.4.19"
}
```

### Dev Dependencies

```json
{
  "@react-native-community/cli": "^15.0.1",
  "@types/react": "~18.3.12",
  "babel-preset-expo": "~12.0.0",
  "eslint": "^9.0.0",
  "eslint-config-expo": "~8.0.0",
  "prettier-plugin-tailwindcss": "^0.8.0",
  "typescript": "~5.3.3"
}
```

### Package Overrides

```json
{
  "expo-application": "~6.0.2"
}
```

---

## Android Build Configuration

### `android/build.gradle` Settings

```groovy
buildscript {
    ext {
        buildToolsVersion = '35.0.0'
        minSdkVersion = 24
        compileSdkVersion = 36
        targetSdkVersion = 34
        kotlinVersion = '1.9.25'
        ndkVersion = "26.1.10909125"
    }
}
```

### Dependency Resolution Strategy

The following dependencies are pinned to ensure compatibility:

```groovy
configurations.all {
    resolutionStrategy {
        // Pin androidx.core to version compatible with AGP 8.6.0
        force 'androidx.core:core:1.15.0'
        force 'androidx.core:core-ktx:1.15.0'
        // Pin Compose Compiler to version compatible with Kotlin 1.9.24
        force 'androidx.compose.compiler:compiler:1.5.14'
    }
}
```

### `android/gradle.properties` Configuration

```properties
# JVM Arguments & Network Fixes
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m -XX:+HeapDumpOnOutOfMemoryError -Dhttps.protocols=TLSv1.2,TLSv1.3 -Djava.net.preferIPv4Stack=true -Dcom.sun.net.ssl.checkRevocation=false -Dfile.encoding=UTF-8

# Limit parallel tasks to save RAM on Windows
org.gradle.parallel=false
org.gradle.workers.max=1

# Network timeouts
systemProp.org.gradle.internal.http.connectionTimeout=120000
systemProp.org.gradle.internal.http.socketTimeout=120000

# Android Settings
android.useAndroidX=true
android.enablePngCrunchInReleaseBuilds=true

# Architectures (Limited to arm64-v8a for faster local builds)
reactNativeArchitectures=arm64-v8a

# Architecture Settings
newArchEnabled=false
hermesEnabled=true

# Image Support
expo.gif.enabled=true
expo.webp.enabled=true
expo.webp.animated=false

# Development
EX_DEV_CLIENT_NETWORK_INSPECTOR=true

# Build Settings
android.suppressUnsupportedCompileSdk=36
expo.useLegacyPackaging=false
```

---

## Known Issues & Workarounds

### 1. react-ga4 Module Resolution Issue

**Problem:** The `react-ga4` package (v3.0.1) uses ESM-only format with `"type": "module"` and doesn't have a `main` field, causing Metro bundler to fail resolving the module.

**Solution:** Patch the `react-ga4/package.json` to add a `main` field:

```bash
node -e "const fs = require('fs'); const p = JSON.parse(fs.readFileSync('./node_modules/react-ga4/package.json', 'utf8')); p.main = 'dist/index.mjs'; fs.writeFileSync('./node_modules/react-ga4/package.json', JSON.stringify(p, null, 2));"
```

**Permanent Fix:** Create a postinstall script in `package.json`:

```json
{
  "scripts": {
    "postinstall": "node scripts/patch-react-ga4.js"
  }
}
```

Create `scripts/patch-react-ga4.js`:

```javascript
const fs = require("fs");
const path = require("path");

const packagePath = path.join(
  __dirname,
  "..",
  "node_modules",
  "react-ga4",
  "package.json",
);
const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));

if (!pkg.main) {
  pkg.main = "dist/index.mjs";
  fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2));
  console.log("Patched react-ga4 package.json with main field");
}
```

### 2. react-native-worklets Dependency Issue

**Problem:** The `react-native-css-interop` package (dependency of `nativewind`) requires `react-native-worklets/plugin` which in turn requires React Native New Architecture to be enabled. Since `newArchEnabled=false`, this causes a build failure.

**Solution:** Create a shim package that provides a no-op babel plugin:

**Create `node_modules/react-native-worklets/package.json`:**

```json
{
  "name": "react-native-worklets",
  "version": "0.0.0-shim",
  "description": "Shim package for react-native-worklets",
  "main": "plugin.js"
}
```

**Create `node_modules/react-native-worklets/plugin.js`:**

```javascript
// Shim for react-native-worklets/plugin
// This is a no-op plugin that satisfies the babel preset requirement
// when react-native-worklets is not installed

module.exports = function () {
  return {
    name: "react-native-worklets-shim",
    visitor: {},
  };
};
```

**Permanent Fix:** Create a postinstall script to generate the shim:

```json
{
  "scripts": {
    "postinstall": "node scripts/patch-react-ga4.js && node scripts/create-worklets-shim.js"
  }
}
```

Create `scripts/create-worklets-shim.js`:

```javascript
const fs = require("fs");
const path = require("path");

const workletsDir = path.join(
  __dirname,
  "..",
  "node_modules",
  "react-native-worklets",
);

if (!fs.existsSync(workletsDir)) {
  fs.mkdirSync(workletsDir, { recursive: true });
}

const packageJson = {
  name: "react-native-worklets",
  version: "0.0.0-shim",
  description: "Shim package for react-native-worklets",
  main: "plugin.js",
};

const pluginJs = `// Shim for react-native-worklets/plugin
// This is a no-op plugin that satisfies the babel preset requirement
// when react-native-worklets is not installed

module.exports = function() {
  return {
    name: 'react-native-worklets-shim',
    visitor: {}
  };
};
`;

fs.writeFileSync(
  path.join(workletsDir, "package.json"),
  JSON.stringify(packageJson, null, 2),
);

fs.writeFileSync(path.join(workletsDir, "plugin.js"), pluginJs);

console.log("Created react-native-worklets shim package");
```

### 3. androidx.core Compatibility Issue

**Problem:** When using `compileSdkVersion=36` with Android Gradle Plugin 8.6.0, there's a compatibility issue with `androidx.core` versions.

**Solution:** Pin `androidx.core` to version 1.15.0 in `android/build.gradle`:

```groovy
configurations.all {
    resolutionStrategy {
        force 'androidx.core:core:1.15.0'
        force 'androidx.core:core-ktx:1.15.0'
    }
}
```

### 4. Compose Compiler Version Mismatch

**Problem:** The Compose Compiler version must be compatible with the Kotlin version. Kotlin 1.9.25 requires a specific Compose Compiler version.

**Solution:** Pin Compose Compiler to version 1.5.14 in `android/build.gradle`:

```groovy
configurations.all {
    resolutionStrategy {
        force 'androidx.compose.compiler:compiler:1.5.14'
    }
}
```

### 5. Compile SDK 36 Warning

**Problem:** AGP 8.6.0 doesn't officially support compileSdkVersion 36, causing a warning.

**Solution:** Add the following to `android/gradle.properties`:

```properties
android.suppressUnsupportedCompileSdk=36
```

---

## Building the Release APK

### Prerequisites

1. Ensure you have Java Development Kit (JDK) 17 or higher installed
2. Ensure Android SDK is properly configured
3. Run `npm install` to install all dependencies

### Build Commands

#### Clean and Build Release APK

```bash
cd android
.\gradlew clean assembleRelease
```

Or from the project root:

```bash
npm run android:release
```

#### Build Debug APK

```bash
cd android
.\gradlew assembleDebug
```

### Output Location

The release APK will be generated at:

```
android/app/build/outputs/apk/release/app-release.apk
```

### Build Time

Expected build time: ~30 minutes on a standard development machine.

---

## Troubleshooting

### Common Issues

#### 1. "Cannot find module 'react-native-worklets/plugin'"

**Cause:** The worklets shim package is missing.

**Solution:** Run the postinstall script or manually create the shim as described in the workarounds section.

#### 2. "Unable to resolve module react-ga4"

**Cause:** The react-ga4 package.json is missing the main field.

**Solution:** Run the patch script or manually add the main field as described in the workarounds section.

#### 3. "BUILD FAILED: Execution failed for task ':app:createBundleReleaseJsAndAssets'"

**Cause:** Metro bundler failed to bundle the JavaScript code.

**Solution:**

- Clear Metro cache: `npx expo start --clear`
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Check for any missing dependencies

#### 4. "Unsupported compileSdk" warning

**Cause:** AGP 8.6.0 doesn't officially support SDK 36.

**Solution:** This is just a warning and can be safely ignored. The build will still succeed. To suppress it, ensure `android.suppressUnsupportedCompileSdk=36` is set in `gradle.properties`.

#### 5. Out of Memory or Connection Handshake errors during build

**Cause:** Gradle daemon doesn't have enough memory or is blocked by network filters (especially in Myanmar).

**Solution:** Use optimized JVM arguments and TLS protocols in `gradle.properties`:

```properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m -Dhttps.protocols=TLSv1.2,TLSv1.3 -Djava.net.preferIPv4Stack=true
```

#### 6. Emulator Stuck on Logo or Boot Loop

**Solution:**
1. Open Device Manager in Android Studio.
2. Right-click the device and select **Wipe Data**.
3. Select **Cold Boot Now**.
4. If still slow, change Graphics to **Software - GLES 2.0** in device settings.

#### 7. ADB Server out of date

**Solution:** Ensure you are using the latest ADB (1.0.41+). Point your Windows PATH to the latest SDK platform-tools: `C:\Users\USER\AppData\Local\Android\Sdk\platform-tools`.

### Clean Build

If you encounter persistent issues, try a complete clean build:

```bash
# Clean node_modules
rm -rf node_modules
npm install

# Clean Android build
cd android
.\gradlew clean

# Rebuild
.\gradlew assembleRelease
```

---

## Additional Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Android Developer Documentation](https://developer.android.com/)
- [Gradle Documentation](https://docs.gradle.org/)

## Google Authentication Configuration

The app uses Google Sign-In for authentication. The configuration is managed through environment variables in the `.env` file.

### Environment Variables

Copy `.env.example` to `.env` and configure the following variables:

```bash
# Google OAuth web client (for web and general use)
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com

# Native Google Sign-In — create separate OAuth clients in Google Cloud Console
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-android-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id.apps.googleusercontent.com
```

### Google Cloud Console Setup

1. **Create OAuth 2.0 Client IDs** in Google Cloud Console:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Navigate to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth 2.0 Client ID**

2. **Web Application Client**:
   - Application type: **Web application**
   - Name: `Pyonea Web`
   - Authorized JavaScript origins:
     - `https://pyonea.com`
     - `https://www.pyonea.com`
     - `http://localhost:8082`
   - Authorized redirect URIs: (leave empty for now)

3. **Android Client**:
   - Application type: **Android**
   - Name: `Pyonea Android`
   - Package name: `com.pyonea.app`
   - SHA-1 certificate fingerprint: Get this from your upload keystore or debug keystore
     ```bash
     cd android
     .\gradlew signingReport
     ```

4. **iOS Client** (if building for iOS):
   - Application type: **iOS**
   - Name: `Pyonea iOS`
   - Bundle ID: `com.yourcompany.pyonea`

### Verify Google OAuth Setup

Run the verification script to ensure your Google OAuth configuration is correct:

```bash
npm run verify:google-oauth
```

This script checks:

- Environment variables are set correctly
- OAuth client IDs are valid
- Authorized origins are configured properly

### google-services.json

The `google-services.json` file is required for Android builds and should be placed in the project root. This file is automatically downloaded when you add Firebase to your project.

**Important:** This file contains sensitive information and should be kept secure. It's included in `.gitignore` for security.

### Common Issues

#### 1. "DEVELOPER_ERROR" in Google Sign-In

**Cause:** SHA-1 fingerprint mismatch or incorrect package name.

**Solution:**

- Verify the SHA-1 fingerprint in Google Cloud Console matches your keystore
- Check that the package name matches exactly (case-sensitive)
- For debug builds, use the debug keystore SHA-1
- For release builds, use the upload keystore SHA-1

#### 2. "Sign-in Failed" with Network Error

**Cause:** Missing or incorrect OAuth client configuration.

**Solution:**

- Ensure all environment variables are set correctly
- Verify OAuth client IDs in Google Cloud Console
- Check that authorized origins include your app's domain

#### 3. Google Sign-In Works in Development but Not Production

**Cause:** Different SHA-1 fingerprints between debug and release keystores.

**Solution:**

- Add both debug and release SHA-1 fingerprints to Google Cloud Console
- For EAS Build, use the upload keystore SHA-1
- For local release builds, use the keystore you're signing with

---

## Version History

| Date       | Changes                                                              |
| ---------- | -------------------------------------------------------------------- |
| 2026-06-21 | Updated for Expo 52, standard port 8082, and local build optimizations |
| 2026-06-21 | Initial documentation of Android build configuration and workarounds |

---

**Last Updated:** June 21, 2026
