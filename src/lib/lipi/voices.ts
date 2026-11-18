// Pure voice selection, kept separate from the browser hook so it can be tested.
export type SpeechLang = "kn" | "en";
export const BCP47: Record<SpeechLang, string> = { kn: "kn-IN", en: "en-US" };

export type VoiceLike = { lang: string; name: string; localService?: boolean };

const norm = (lang: string) => lang.toLowerCase().replace(/_/g, "-");

/** Picks the best installed voice for the language, or null when none is installed. */
export function pickVoice<T extends VoiceLike>(voices: readonly T[], lang: SpeechLang): T | null {
  const tiers: ((v: T) => boolean)[] =
    lang === "kn"
      ? [(v) => norm(v.lang).startsWith("kn"), (v) => /kannada/i.test(v.name)]
      : [
          (v) => norm(v.lang) === "en-in",
          (v) => norm(v.lang) === "en-us",
          (v) => norm(v.lang) === "en-gb",
          (v) => norm(v.lang).startsWith("en"),
        ];
  for (const match of tiers) {
    const found = voices.filter(match);
    if (found.length) return found.find((v) => v.localService) ?? found[0] ?? null;
  }
  return null;
}

/** iPhone/iPad, including iPadOS that reports itself as a Mac. */
export function isAppleMobile(ua: string, maxTouchPoints: number) {
  return /iP(hone|ad|od)/.test(ua) || (/Macintosh/.test(ua) && maxTouchPoints > 1);
}
