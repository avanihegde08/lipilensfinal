import { createServerFn } from "@tanstack/react-start";

import { GatewayFailure } from "./ai/gateway.server";
import { retranslateText } from "./ai/lipi.server";
import { normalizeKannadaText } from "./lipi/text";
import type { ApiFailure, RetranslateResult } from "./lipi/types";

function failure(error: unknown): ApiFailure {
  if (error instanceof GatewayFailure) return { ok: false, code: error.code, message: error.message };
  console.error(error);
  return { ok: false, code: "unknown", message: "Translation failed on the server. Please try again in a moment." };
}

export const retranslate = createServerFn({ method: "POST" })
  .inputValidator((input: { text: string }) => {
    const text = typeof input?.text === "string" ? normalizeKannadaText(input.text) : "";
    if (!text) throw new Error("Type some Kannada text first.");
    if (text.length > 2000) throw new Error("That text is too long.");
    return { text };
  })
  .handler(async ({ data }): Promise<{ ok: true; result: RetranslateResult } | ApiFailure> => {
    try {
      return { ok: true, result: await retranslateText(data.text) };
    } catch (error) {
      return failure(error);
    }
  });
