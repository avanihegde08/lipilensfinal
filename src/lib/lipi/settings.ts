import { useEffect, useSyncExternalStore } from "react";

export type TextSize = "sm" | "md" | "lg" | "xl";
export type Settings = {
  textSize: TextSize;
  showTransliteration: boolean;
  speechRate: number;
  saveImages: boolean;
  /** Send the framed photo to the free street-sign reader (falls back to on-device reading). */
  onlineReader: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  textSize: "md",
  showTransliteration: true,
  speechRate: 1,
  saveImages: true,
  onlineReader: true,
};

const KEY = "lipi-lens:settings";
const listeners = new Set<() => void>();
let cache: Settings | null = null;

function read(): Settings {
  if (cache) return cache;
  try {
    cache = { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    cache = DEFAULT_SETTINGS;
  }
  return cache!;
}

export function getSettings(): Settings {
  return typeof window === "undefined" ? DEFAULT_SETTINGS : read();
}

export function updateSettings(patch: Partial<Settings>) {
  cache = { ...read(), ...patch };
  localStorage.setItem(KEY, JSON.stringify(cache));
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, getSettings, () => DEFAULT_SETTINGS);
}

/** Mirrors the text-size preference onto <html> so result text scales everywhere. */
export function useApplySettings() {
  const { textSize } = useSettings();
  useEffect(() => {
    document.documentElement.dataset["textSize"] = textSize;
  }, [textSize]);
}
