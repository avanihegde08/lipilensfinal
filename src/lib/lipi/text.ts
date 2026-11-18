// Kannada text hygiene. Text stays as Unicode (UTF-8 on the wire, UTF-16 in the browser):
// we only apply canonical NFC composition and tidy line endings. No legacy-font encodings,
// no transliteration, and zero-width joiners (ZWJ/ZWNJ) used in Kannada are kept.
import type { ScanResult } from "./types";

export function normalizeKannadaText(text: string): string {
  return text.normalize("NFC").replace(/\r\n?/g, "\n").trim();
}

export function normalizeScanResult(result: ScanResult): ScanResult {
  const n = (s: string) => s.normalize("NFC");
  return {
    ...result,
    blocks: result.blocks.map((b) => ({
      ...b,
      as_written: n(b.as_written),
      suggested_kannada: b.suggested_kannada === null ? null : n(b.suggested_kannada),
      corrections: b.corrections.map((c) => ({ ...c, from: n(c.from), to: n(c.to) })),
    })),
  };
}
