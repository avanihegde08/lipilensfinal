// Free, on-device Kannada → simple Roman letters (no diacritics), e.g. ಬೆಂಗಳೂರು → "bengalooru".
// Rule-based: consonants carry an inherent "a", the virama (್) removes it, vowel signs replace it.
const VOWELS: Record<string, string> = {
  "ಅ": "a", "ಆ": "aa", "ಇ": "i", "ಈ": "ee", "ಉ": "u", "ಊ": "oo", "ಋ": "ru", "ೠ": "ruu",
  "ಎ": "e", "ಏ": "e", "ಐ": "ai", "ಒ": "o", "ಓ": "o", "ಔ": "au",
};
const SIGNS: Record<string, string> = {
  "ಾ": "aa", "ಿ": "i", "ೀ": "ee", "ು": "u", "ೂ": "oo", "ೃ": "ru", "ೄ": "ruu",
  "ೆ": "e", "ೇ": "e", "ೈ": "ai", "ೊ": "o", "ೋ": "o", "ೌ": "au",
};
const CONSONANTS: Record<string, string> = {
  "ಕ": "k", "ಖ": "kh", "ಗ": "g", "ಘ": "gh", "ಙ": "n",
  "ಚ": "ch", "ಛ": "chh", "ಜ": "j", "ಝ": "jh", "ಞ": "n",
  "ಟ": "t", "ಠ": "th", "ಡ": "d", "ಢ": "dh", "ಣ": "n",
  "ತ": "t", "ಥ": "th", "ದ": "d", "ಧ": "dh", "ನ": "n",
  "ಪ": "p", "ಫ": "ph", "ಬ": "b", "ಭ": "bh", "ಮ": "m",
  "ಯ": "y", "ರ": "r", "ಱ": "r", "ಲ": "l", "ವ": "v",
  "ಶ": "sh", "ಷ": "sh", "ಸ": "s", "ಹ": "h", "ಳ": "l", "ೞ": "zh", "ೝ": "n",
};
const VIRAMA = "್";
const ANUSVARA = "ಂ";
const VISARGA = "ಃ";
const LABIALS = new Set(["ಪ", "ಫ", "ಬ", "ಭ", "ಮ"]);
const SILENT = new Set(["಼", "\u200c", "\u200d", "ಽ"]);

export function transliterateKannada(input: string): string {
  const chars = [...input.normalize("NFC")];
  let out = "";
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i] ?? "";
    const next = chars[i + 1] ?? "";
    if (SILENT.has(c)) continue;
    if (c in CONSONANTS) {
      out += CONSONANTS[c];
      // Skip a nukta between the consonant and its sign.
      let j = i + 1;
      while (SILENT.has(chars[j] ?? "")) j++;
      const after = chars[j] ?? "";
      if (after === VIRAMA) {
        i = j;
      } else if (after in SIGNS) {
        out += SIGNS[after];
        i = j;
      } else {
        out += "a";
      }
      continue;
    }
    if (c in VOWELS) {
      out += VOWELS[c];
      continue;
    }
    if (c === ANUSVARA) {
      out += LABIALS.has(next) || !next || /\s|[.,!?]/.test(next) ? "m" : "n";
      continue;
    }
    if (c === VISARGA) {
      out += "h";
      continue;
    }
    const code = c.codePointAt(0) ?? 0;
    if (code >= 0x0ce6 && code <= 0x0cef) {
      out += String(code - 0x0ce6);
      continue;
    }
    if (c === VIRAMA || c in SIGNS) continue; // stray marks from misread text
    out += c;
  }
  // Capitalise the first letter of the line, like a sentence.
  return out.replace(/^\s*[a-z]/, (m) => m.toUpperCase());
}
