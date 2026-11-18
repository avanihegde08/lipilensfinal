// Free, on-device Kannada OCR with Tesseract.js. Browser-only: call from event handlers.
// The photo never leaves the device. The reader program and Kannada + English language data
// (about 9 MB) download from a free public CDN the first time, then are cached by the browser.
//
// Settings chosen by measurement (see docs/ocr-accuracy.md): the photo is cropped to the text,
// so it is read as one block of text (page-segmentation mode 6) after upscaling small crops.
// Grayscale/threshold/sharpen filters were tested and made results worse, so they are not used;
// Tesseract already binarises the image internally.
import type Tesseract from "tesseract.js";

import { upscaleForOcr } from "./image";
import { normalizeKannadaText } from "./text";
import { transliterateKannada } from "./transliterate";
import type { BlockLanguage, Legibility, ScanResult, TextBlock } from "./types";

export type OcrProgress = { stage: "online" | "loading" | "reading"; progress: number };
export type OcrErrorCode = "busy" | "unsupported" | "download" | "no_text" | "failed";

export class OcrError extends Error {
  constructor(
    public code: OcrErrorCode,
    message: string,
  ) {
    super(message);
  }
}

let workerPromise: Promise<Tesseract.Worker> | null = null;
let onProgress: ((p: OcrProgress) => void) | null = null;
let busy = false;

/** A stalled download on a weak connection must not leave the user waiting forever. */
const LOAD_TIMEOUT_MS = 120_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function getWorker() {
  workerPromise ??= (async () => {
    const { createWorker, PSM } = await import("tesseract.js");
    const worker = await withTimeout(
      createWorker(["kan", "eng"], 1, {
        logger: (m) =>
          onProgress?.({
            stage: m.status.startsWith("recognizing") ? "reading" : "loading",
            progress: Math.round((m.progress ?? 0) * 100),
          }),
      }),
      LOAD_TIMEOUT_MS,
    );
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK });
    return worker;
  })().catch((error) => {
    workerPromise = null; // allow a retry after a failed download
    throw error;
  });
  return workerPromise;
}

const KANNADA = /[\u0C80-\u0CFF]/g;
const LATIN = /[A-Za-z]/g;

export function languageOf(text: string): BlockLanguage {
  const kn = text.match(KANNADA)?.length ?? 0;
  const en = text.match(LATIN)?.length ?? 0;
  if (kn > 0 && kn >= en) return "kn";
  if (en > 0) return "en";
  return "other";
}

export function legibilityOf(confidence: number): Legibility {
  if (confidence >= 80) return "clear";
  if (confidence >= 60) return "partly_unclear";
  return "unclear";
}

const EDGE_JUNK = /^[`'"_|~^*•¦\\]+|[`'"_|~^*•¦\\]+$/g;

/**
 * Fixes well-known Tesseract artefacts in one recognised line without touching real text.
 * - Anusvara (ಂ) misread as the Kannada digit zero (೦) right after a letter or vowel sign.
 * - The invisible ZWNJ Tesseract appends after a word-final virama (not present on the sign).
 * - Stray border/frame marks such as ` ' _ | at the start or end of the line.
 * Exported for tests.
 */
export function cleanOcrLine(raw: string): string {
  let text = normalizeKannadaText(raw.replace(/[ \t]+/g, " "));
  text = text.replace(/(?<=[\u0C85-\u0CB9\u0CBC-\u0CCC])\u0CE6(?![\u0CE6-\u0CEF0-9])/g, "\u0C82");
  text = text.replace(/\u0CCD\u200C(?=\s|$)/g, "\u0CCD");
  text = text
    .split(" ")
    .map((token, i, all) => (i === 0 || i === all.length - 1 ? token.replace(EDGE_JUNK, "") : token))
    .filter(Boolean)
    .join(" ");
  return text.normalize("NFC");
}

const LATIN_ONLY_WORD = /^[^\u0C80-\u0CFF]*[A-Za-z][^\u0C80-\u0CFF]*$/;

/**
 * In a mostly-Kannada line, the English model sometimes "reads" Kannada letters as made-up
 * English words (e.g. "omens"). Those come with low confidence, so they are removed; confident
 * English words (real bilingual signs) are kept. Exported for tests.
 */
export function dropMisreadLatin(line: {
  text: string;
  words: { text: string; confidence: number }[];
}): string {
  if (languageOf(line.text) !== "kn" || !line.words?.length) return line.text;
  const kept = line.words.filter((w) => !(LATIN_ONLY_WORD.test(w.text.trim()) && w.confidence < 75));
  return kept.length === line.words.length ? line.text : kept.map((w) => w.text.trim()).join(" ");
}

/**
 * Drops lines that are probably drawings, textures or a sign's border rather than words.
 * Real Kannada lines read as one block often score 30-40, so only very low scores, or short
 * low-confidence fragments (like a single stray letter from a frame), are dropped. Exported for tests.
 */
export function isLikelyNoise(text: string, language: BlockLanguage, confidence: number): boolean {
  // Vowel signs and anusvara count too, so a short real word like ದಂಡ is not treated as a fragment.
  const letters = text.match(/[\p{L}\p{M}\p{N}]/gu)?.length ?? 0;
  if (language === "kn") return confidence < 25 || (confidence < 60 && letters < 2);
  return confidence < 55 || (confidence < 75 && letters < 3);
}

/** Turns Tesseract's page into the app's scan result. Exported for tests. */
export function pageToScanResult(page: Pick<Tesseract.Page, "blocks" | "confidence">): ScanResult {
  const lines = (page.blocks ?? []).flatMap((b) => b.paragraphs.flatMap((p) => p.lines));
  const blocks: TextBlock[] = [];
  for (const line of lines) {
    const text = cleanOcrLine(dropMisreadLatin(line));
    if (!/[\p{L}\p{N}]/u.test(text)) continue;
    const language = languageOf(text);
    if (isLikelyNoise(text, language, line.confidence)) continue;
    const doubtful = line.words.filter((w) => w.confidence < 50).map((w) => w.text.trim().replace(EDGE_JUNK, "")).filter((w) => /[\p{L}\p{N}]/u.test(w));
    blocks.push({
      as_written: text,
      language,
      suggested_kannada: null,
      corrections: [],
      transliteration: language === "kn" ? transliterateKannada(text) : language === "en" ? text : "",
      // English needs no translation; Kannada is translated only when the user asks.
      translation: language === "en" ? text : "",
      legibility: legibilityOf(line.confidence),
      uncertain_parts: doubtful.length ? doubtful.join(" ") : null,
    });
  }
  const confidence = page.confidence ?? 0;
  return {
    kannada_text_found: blocks.some((b) => b.language === "kn"),
    category: "other",
    image_issue: blocks.length === 0 ? "no_text" : confidence < 45 ? "unreadable" : "none",
    readability: legibilityOf(confidence),
    blocks,
    structured: { places: [], distances: [], route_numbers: [] },
    context_note: null,
    engine: "device",
  };
}

export async function readKannadaLocally(
  image: string,
  progress: (p: OcrProgress) => void,
): Promise<ScanResult> {
  if (busy) throw new OcrError("busy", "Already reading a photo. Please wait a moment.");
  if (typeof WebAssembly === "undefined" || typeof Worker === "undefined") {
    throw new OcrError(
      "unsupported",
      "This browser cannot run the on-device text reader. Please update it, or try Chrome or Safari.",
    );
  }
  busy = true;
  onProgress = progress;
  try {
    let worker: Tesseract.Worker;
    try {
      progress({ stage: "loading", progress: 0 });
      worker = await getWorker();
    } catch {
      throw new OcrError(
        "download",
        navigator.onLine === false
          ? "You're offline. The Kannada reader needs internet once to download its language data (about 5 MB)."
          : "The Kannada language data could not be downloaded. Check your internet connection and try again.",
      );
    }
    let input: string | HTMLCanvasElement;
    try {
      input = await upscaleForOcr(image);
    } catch {
      throw new OcrError("unsupported", "This photo could not be opened. Please try a JPG or PNG photo.");
    }
    // Tesseract's rotateAuto deskew was measured and made results worse, so it stays off;
    // Tesseract still tolerates small tilts, and the crop screen can rotate the photo.
    const { data } = await worker.recognize(input, {}, { text: true, blocks: true });
    const result = pageToScanResult(data);
    if (result.blocks.length === 0) {
      throw new OcrError(
        "no_text",
        "No text could be found in this photo. Try a closer, sharper, well-lit photo with the words filling the frame.",
      );
    }
    return result;
  } catch (error) {
    if (error instanceof OcrError) throw error;
    console.error("On-device OCR failed", error);
    throw new OcrError(
      "failed",
      "The text reader stopped unexpectedly. Please try again, or crop closer to the words.",
    );
  } finally {
    busy = false;
    onProgress = null;
  }
}
