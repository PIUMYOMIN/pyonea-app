import { Platform } from "react-native";

import { markWelcomeLoaderSeen } from "@/utils/welcome-loader-storage";

declare global {
  interface Window {
    __pyoneaWelcome?: {
      setProgress: (progress: number) => void;
      hide: () => void;
      startedAt?: number;
    };
  }
}

export function setPyoneaWelcomeProgress(progress: number) {
  if (Platform.OS !== "web" || typeof window === "undefined") return;
  window.__pyoneaWelcome?.setProgress(progress);
}

export function hidePyoneaWelcomeLoader(markSeen = false) {
  if (Platform.OS !== "web" || typeof window === "undefined") return;
  if (markSeen) {
    markWelcomeLoaderSeen();
  }
  window.__pyoneaWelcome?.hide();
}

export function getWelcomeLoaderStartedAt() {
  if (Platform.OS !== "web" || typeof window === "undefined") return Date.now();
  return window.__pyoneaWelcome?.startedAt ?? Date.now();
}
