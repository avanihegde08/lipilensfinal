// Street-sign reader: sends the framed photo to the free Lipi Lens OCR server (IndicPhotoOCR,
// self-hosted on a free Hugging Face Space, see ocr-server/). No paid API and no AI credits.
// If the server is not set up, asleep, slow or unreachable, the caller falls back to the
// on-device Tesseract reader in ./ocr.ts.
import { cleanOcrLine, isLikelyNoise, languageOf, legibilityOf } from "./ocr";
import { transliterateKannada } from "./transliterate";
import type { ScanResult, TextBlock } from "./types";

/**
 * Address of the free OCR server. Empty means "not set up yet": the app then uses only the
 * on-device reader. Can be overridden on one device with localStorage key OCR_URL_KEY (testing).
 */
export const SCENE_OCR_URL = "";
export const OCR_URL_KEY = "lipi-lens:ocr-url";
/** A free server that was asleep can take minutes to wake; don't make the user wait that long. */
export const SCENE_OCR_TIMEOUT_MS = 45_000;

export type SceneWord = { text: string; confidence: number; language: "kn" | "en"; bbox: number[] };
export type SceneResponse = { engine: string; ms: number; lines: { words: SceneWord[] }[] };

export class SceneOcrError extends Error {
  constructor(
    public code: "not_configured" | "offline" | "timeout" | "unavailable" | "rejected",
    message: string,
  ) {
    super(message);
  }
}

export function sceneOcrUrl(): string {
  if (typeof window === "undefined") return SCENE_OCR_URL;
  try {
    return (localStorage.getItem(OCR_URL_KEY) || SCENE_OCR_URL).replace(/\/+$/, "");
  } catch {
    return SCENE_OCR_URL;
  }
}

/** Fire-and-forget ping so a sleeping free server starts waking while the user frames the photo. */
export function wakeSceneOcr() {
  const url = sceneOcrUrl();
  if (!url || navigator.onLine === false) return;
  fetch(`${url}/`, { method: "GET", mode: "cors" }).catch(() => undefined);
}

/** Splits each detected line into runs of one language, so Kannada and English get their own rows. */
export function sceneToScanResult(response: SceneResponse): ScanResult {
  const blocks: TextBlock[] = [];
  let confSum = 0;
  let confN = 0;
  for (const line of response.lines ?? []) {
    const runs: SceneWord[][] = [];
    for (const word of line.words ?? []) {
      if (!word.text?.trim()) continue;
      const last = runs[runs.length - 1];
      if (last && last[0]!.language === word.language) last.push(word);
      else runs.push([word]);
    }
    for (const run of runs) {
      const raw = run.map((w) => w.text.trim()).join(" ");
      const text = run[0]!.language === "kn" ? cleanOcrLine(raw) : raw;
      if (!/[\p{L}\p{N}]/u.test(text)) continue;
      const language = languageOf(text);
      const confidence = (run.reduce((s, w) => s + w.confidence, 0) / run.length) * 100;
      if (isLikelyNoise(text, language, confidence)) continue;
      confSum += confidence;
      confN++;
      const doubtful = run.filter((w) => w.confidence < 0.6).map((w) => w.text.trim());
      blocks.push({
        as_written: text,
        language,
        suggested_kannada: null,
        corrections: [],
        transliteration: language === "kn" ? transliterateKannada(text) : language === "en" ? text : "",
        translation: language === "en" ? text : "",
        legibility: legibilityOf(confidence),
        uncertain_parts: doubtful.length ? doubtful.join(" ") : null,
      });
    }
  }
  const mean = confN ? confSum / confN : 0;
  return {
    kannada_text_found: blocks.some((b) => b.language === "kn"),
    category: "other",
    image_issue: blocks.length === 0 ? "no_text" : "none",
    readability: legibilityOf(mean),
    blocks,
    structured: { places: [], distances: [], route_numbers: [] },
    context_note: null,
    engine: "scene",
  };
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return (await fetch(dataUrl)).blob();
}

/** Reads the photo with the free OCR server. Throws SceneOcrError so the caller can fall back. */
export async function readKannadaOnline(image: string): Promise<ScanResult> {
  const url = sceneOcrUrl();
  if (!url) throw new SceneOcrError("not_configured", "The street-sign reader is not set up.");
  if (navigator.onLine === false) throw new SceneOcrError("offline", "You're offline.");
  const form = new FormData();
  form.append("image", await dataUrlToBlob(image), "photo.jpg");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SCENE_OCR_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${url}/ocr`, { method: "POST", body: form, signal: controller.signal });
  } catch {
    throw controller.signal.aborted
      ? new SceneOcrError("timeout", "The street-sign reader took too long (it may be waking up).")
      : new SceneOcrError("unavailable", "The street-sign reader could not be reached.");
  } finally {
    clearTimeout(timer);
  }
  if (response.status === 413 || response.status === 415) {
    throw new SceneOcrError("rejected", "The street-sign reader could not open this photo.");
  }
  if (!response.ok) {
    throw new SceneOcrError(
      "unavailable",
      response.status === 429 ? "The street-sign reader is busy right now." : "The street-sign reader is unavailable.",
    );
  }
  let body: SceneResponse;
  try {
    body = (await response.json()) as SceneResponse;
  } catch {
    throw new SceneOcrError("unavailable", "The street-sign reader sent an unreadable reply.");
  }
  return sceneToScanResult(body);
}
