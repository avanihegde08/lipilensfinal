import { z } from "zod/v4";

import type { RetranslateResult } from "../lipi/types";
import { structuredCall } from "./gateway.server";

const correction = z.object({ from: z.string(), to: z.string(), reason: z.string() });

const retranslateSchema = z.object({
  suggested_kannada: z.string().nullable(),
  corrections: z.array(correction),
  transliteration: z.string(),
  translation: z.string(),
});

const RETRANSLATE_INSTRUCTIONS = `You help people understand Kannada text. The user typed or edited a Kannada phrase.
- "transliteration": the text exactly as given, in simple readable Roman letters without diacritics (e.g. ಬಸ್ ನಿಲ್ದಾಣ → "Bus nildana").
- "translation": natural, concise English meaning of the text exactly as the user gave it (it may be their correction of a misread sign). Keep proper nouns as names.
- "suggested_kannada" and "corrections": only if you are confident the text has a spelling/matra/conjunct mistake, give the corrected text and each change (from, to, short reason); otherwise null and [].
Never change the user's text itself.`;

export async function retranslateText(text: string): Promise<RetranslateResult> {
  return structuredCall({
    instructions: RETRANSLATE_INSTRUCTIONS,
    schema: retranslateSchema,
    effort: "low",
    messages: [{ role: "user", content: text }],
  });
}
