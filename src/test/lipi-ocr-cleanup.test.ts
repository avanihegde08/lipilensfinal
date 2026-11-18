import { describe, expect, it } from "vitest";

import { ocrScale } from "@/lib/lipi/image";
import { cleanOcrLine, dropMisreadLatin, isLikelyNoise, pageToScanResult } from "@/lib/lipi/ocr";

describe("OCR line clean-up", () => {
  it("turns the digit zero misread after a letter back into anusvara (ಸ೦ಜೆ -> ಸಂಜೆ)", () => {
    expect(cleanOcrLine("ಸ೦ಜೆ ರಿ೦ದ")).toBe("ಸಂಜೆ ರಿಂದ");
  });

  it("keeps real Kannada digits untouched", () => {
    expect(cleanOcrLine("ದೂರ ೧೦ ಕಿ.ಮೀ")).toBe("ದೂರ ೧೦ ಕಿ.ಮೀ");
  });

  it("removes the invisible ZWNJ after a word-final virama but keeps the virama", () => {
    expect(cleanOcrLine("ಟ್ರಾವೆಲ್ಸ್\u200c")).toBe("ಟ್ರಾವೆಲ್ಸ್");
  });

  it("strips stray border marks at the line edges and keeps a real dash", () => {
    expect(cleanOcrLine("` ಬೆಂಗಳೂರು - ಮೈಸೂರು |")).toBe("ಬೆಂಗಳೂರು - ಮೈಸೂರು");
    expect(cleanOcrLine("'ಶ್ರೀ ಸೈ")).toBe("ಶ್ರೀ ಸೈ");
  });
});

describe("OCR noise filter", () => {
  it("keeps a real Kannada line with a modest score of 30", () => {
    expect(isLikelyNoise("ಬೆಂಗಳೂರು - ಮೈಸೂರು", "kn", 30)).toBe(false);
  });

  it("drops a single stray Kannada letter read from a sign's frame", () => {
    expect(isLikelyNoise("ಇ", "kn", 50)).toBe(true);
  });

  it("drops very low-scoring lines", () => {
    expect(isLikelyNoise("ಕರ್ನಾಟಕ ರಾಜ್ಯ", "kn", 20)).toBe(true);
  });
});

describe("misread English words inside Kannada lines", () => {
  it("removes a low-confidence made-up English word", () => {
    const line = {
      text: "ಸಾರ್ವಜನಿಕ omens",
      words: [
        { text: "ಸಾರ್ವಜನಿಕ", confidence: 80 },
        { text: "omens", confidence: 30 },
      ],
    };
    expect(dropMisreadLatin(line)).toBe("ಸಾರ್ವಜನಿಕ");
  });

  it("keeps confident English on a bilingual line", () => {
    const line = {
      text: "ಬಸ್ ನಿಲ್ದಾಣ Bus",
      words: [
        { text: "ಬಸ್", confidence: 90 },
        { text: "ನಿಲ್ದಾಣ", confidence: 90 },
        { text: "Bus", confidence: 92 },
      ],
    };
    expect(dropMisreadLatin(line)).toBe("ಬಸ್ ನಿಲ್ದಾಣ Bus");
  });

  it("applies inside the full result", () => {
    const page = {
      confidence: 70,
      blocks: [
        {
          paragraphs: [
            {
              lines: [
                {
                  text: "ದಂಡ TOT",
                  confidence: 45,
                  words: [
                    { text: "ದಂಡ", confidence: 70 },
                    { text: "TOT", confidence: 20 },
                  ],
                },
              ],
            },
          ],
        },
      ],
    } as unknown as Parameters<typeof pageToScanResult>[0];
    expect(pageToScanResult(page).blocks.map((b) => b.as_written)).toEqual(["ದಂಡ"]);
  });
});

describe("OCR upscaling", () => {
  it("enlarges a small 600px crop 3x to 1800px", () => {
    expect(ocrScale(600, 200)).toBe(3);
  });

  it("caps enlargement at 3x and never shrinks large photos", () => {
    expect(ocrScale(300, 100)).toBe(3);
    expect(ocrScale(2400, 1600)).toBe(1);
  });
});
