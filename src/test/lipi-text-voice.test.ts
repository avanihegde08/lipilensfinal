import { describe, expect, it } from "vitest";

import { normalizeKannadaText, normalizeScanResult } from "@/lib/lipi/text";
import { isAppleMobile, pickVoice } from "@/lib/lipi/voices";
import type { ScanResult } from "@/lib/lipi/types";

const v = (lang: string, name = lang, localService = true) => ({ lang, name, localService });

describe("voice selection", () => {
  it("picks an installed Kannada voice, including kn_IN style tags", () => {
    expect(pickVoice([v("en-US"), v("kn_IN", "Kannada India")], "kn")?.name).toBe("Kannada India");
  });

  it("returns no Kannada voice when none is installed (like an iPhone), instead of a wrong-language voice", () => {
    expect(pickVoice([v("en-US"), v("hi-IN"), v("en-GB")], "kn")).toBeNull();
  });

  it("prefers Indian English, then US English, for English", () => {
    expect(pickVoice([v("en-GB"), v("en-US"), v("en-IN")], "en")?.lang).toBe("en-IN");
    expect(pickVoice([v("en-GB"), v("en-US")], "en")?.lang).toBe("en-US");
    expect(pickVoice([v("en-AU")], "en")?.lang).toBe("en-AU");
    expect(pickVoice([], "en")).toBeNull();
  });

  it("recognises iPhones and iPads that report themselves as a Mac", () => {
    expect(isAppleMobile("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)", 5)).toBe(true);
    expect(isAppleMobile("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 5)).toBe(true);
    expect(isAppleMobile("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 0)).toBe(false);
    expect(isAppleMobile("Mozilla/5.0 (Linux; Android 14; Pixel 8)", 5)).toBe(false);
  });
});

describe("Kannada text handling", () => {
  it("keeps a full Kannada sentence, its spaces and punctuation unchanged", () => {
    const sentence = "ಬೆಂಗಳೂರು ಬಸ್ ನಿಲ್ದಾಣ, ೧೨ ಕಿ.ಮೀ. — ದಯವಿಟ್ಟು ಸಾಲಿನಲ್ಲಿ ನಿಲ್ಲಿ!";
    expect(normalizeKannadaText(sentence)).toBe(sentence);
    expect(normalizeKannadaText("ಹಸಿರೇ ಉಸಿರು.. ತಂತ್ರಜ್ಞಾನವೇ ಉಸಿರು..")).toBe("ಹಸಿರೇ ಉಸಿರು.. ತಂತ್ರಜ್ಞಾನವೇ ಉಸಿರು..");
  });

  it("keeps zero-width joiners used in Kannada spelling", () => {
    const withJoiners = "ರ\u200dಕ್ತ ಕ\u200cನ್ನಡ";
    expect(normalizeKannadaText(withJoiners)).toBe(withJoiners);
  });

  it("composes decomposed vowel signs to the standard form and trims outer spaces only", () => {
    // ಕೀ typed as ಕ + ಿ + ೕ becomes ಕ + ೀ
    expect(normalizeKannadaText("  \u0C95\u0CBF\u0CD5  ")).toBe("\u0C95\u0CC0");
    expect(normalizeKannadaText("ಒಂದು\r\nಎರಡು")).toBe("ಒಂದು\nಎರಡು");
  });

  it("does not alter Kannada in scan results", () => {
    const result: ScanResult = {
      kannada_text_found: true,
      category: "shop_sign",
      image_issue: "none",
      readability: "clear",
      blocks: [
        {
          as_written: "ಶ್ರೀ ಲಕ್ಷ್ಮೀ ಸ್ಟೋರ್ಸ್",
          language: "kn",
          suggested_kannada: null,
          corrections: [],
          transliteration: "Shri Lakshmi Stores",
          translation: "Shri Lakshmi Stores",
          legibility: "clear",
          uncertain_parts: null,
        },
      ],
      structured: { places: [], distances: [], route_numbers: [] },
      context_note: null,
    };
    expect(normalizeScanResult(result).blocks[0]?.as_written).toBe("ಶ್ರೀ ಲಕ್ಷ್ಮೀ ಸ್ಟೋರ್ಸ್");
  });
});

import { transliterateKannada } from "@/lib/lipi/transliterate";
import { pageToScanResult } from "@/lib/lipi/ocr";

describe("on-device pronunciation", () => {
  it("writes common Kannada words in simple Roman letters", () => {
    expect(transliterateKannada("ಬೆಂಗಳೂರು")).toBe("Bengalooru");
    expect(transliterateKannada("ಬಸ್ ನಿಲ್ದಾಣ")).toBe("Bas nildaana");
    expect(transliterateKannada("ಕನ್ನಡ")).toBe("Kannada");
    expect(transliterateKannada("ಹಸಿರೇ ಉಸಿರು")).toBe("Hasire usiru");
    expect(transliterateKannada("ಸಂಪರ್ಕ")).toBe("Samparka");
    expect(transliterateKannada("೧೨ ಕಿ.ಮೀ.")).toBe("12 ki.mee.");
  });
});

type FakeLine = { text: string; confidence: number; words: { text: string; confidence: number }[] };
const page = (lines: FakeLine[], confidence = 80) =>
  ({ confidence, blocks: [{ paragraphs: [{ lines }] }] }) as unknown as Parameters<typeof pageToScanResult>[0];

describe("on-device OCR result", () => {
  it("keeps Kannada lines with local pronunciation and no AI translation", () => {
    const r = pageToScanResult(page([{ text: "ಕನ್ನಡ\n", confidence: 88, words: [{ text: "ಕನ್ನಡ", confidence: 88 }] }]));
    expect(r.kannada_text_found).toBe(true);
    expect(r.blocks[0]).toMatchObject({ as_written: "ಕನ್ನಡ", language: "kn", transliteration: "Kannada", translation: "", legibility: "clear" });
  });

  it("drops low-confidence non-Kannada noise and marks English lines as already English", () => {
    const r = pageToScanResult(
      page([
        { text: "~~ |/ ", confidence: 90, words: [] },
        { text: "xQz", confidence: 20, words: [] },
        { text: "Infosys", confidence: 85, words: [{ text: "Infosys", confidence: 85 }] },
      ]),
    );
    expect(r.blocks.map((b) => b.as_written)).toEqual(["Infosys"]);
    expect(r.blocks[0]?.translation).toBe("Infosys");
    expect(r.kannada_text_found).toBe(false);
  });

  it("reports no text when nothing readable is found", () => {
    expect(pageToScanResult(page([], 0)).image_issue).toBe("no_text");
  });
});
