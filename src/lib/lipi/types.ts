// Browser-safe shared types for scan results. The server validates the AI output against
// the matching zod schema in ../ai/lipi.server.ts.

export const CATEGORIES = [
  "shop_sign",
  "billboard",
  "bus_board",
  "milestone",
  "poster",
  "other",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  shop_sign: "Shop sign",
  billboard: "Billboard",
  bus_board: "Bus board",
  milestone: "Milestone",
  poster: "Poster",
  other: "Other",
};

export type Legibility = "clear" | "partly_unclear" | "unclear";
export type ImageIssue = "none" | "no_text" | "blurry" | "low_light" | "too_small" | "unreadable";
export type BlockLanguage = "kn" | "en" | "hi" | "ta" | "te" | "ml" | "other";

export const LANGUAGE_LABELS: Record<BlockLanguage, string> = {
  kn: "Kannada",
  en: "English",
  hi: "Hindi",
  ta: "Tamil",
  te: "Telugu",
  ml: "Malayalam",
  other: "Other script",
};

export type Correction = { from: string; to: string; reason: string };

export type TextBlock = {
  /** Exactly what the AI read on the image, spelling preserved. Never overwritten by corrections. */
  as_written: string;
  language: BlockLanguage;
  /** A suggested corrected spelling, or null when the AI saw nothing to fix. */
  suggested_kannada: string | null;
  corrections: Correction[];
  transliteration: string;
  translation: string;
  legibility: Legibility;
  uncertain_parts: string | null;
  /** Set when the user edited the Kannada text by hand. */
  user_edited?: boolean;
  /** The first OCR reading, kept when the user corrects the text so both can be compared. */
  original_text?: string;
};

export type ScanResult = {
  kannada_text_found: boolean;
  category: Category;
  image_issue: ImageIssue;
  readability: Legibility;
  blocks: TextBlock[];
  structured: { places: string[]; distances: string[]; route_numbers: string[] };
  context_note: string | null;
  /** Which reader produced the text: the free street-sign server or the on-device reader. */
  engine?: "scene" | "device";
  /** Set when the street-sign reader failed and the on-device reader was used instead. */
  fallback_reason?: string | null;
};

export type Scan = {
  id: string;
  createdAt: number;
  /** Compressed JPEG data URL; omitted when the user turned off image saving. */
  image: string | null;
  /** Small preview for lists; null when image saving is off. */
  thumb: string | null;
  result: ScanResult;
  favorite: boolean;
  note: string;
};

export type RetranslateResult = {
  suggested_kannada: string | null;
  corrections: Correction[];
  transliteration: string;
  translation: string;
};

export type ApiFailure = { ok: false; code: string; message: string };
