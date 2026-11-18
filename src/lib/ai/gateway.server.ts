import { createOpenAI } from "@ai-sdk/openai";
import { APICallError, NoObjectGeneratedError, Output, streamText, type ModelMessage } from "ai";
import type { z } from "zod/v4";

import { createLovableAiGatewayRunIdFetch } from "./run-id";

export const GATEWAY_URL = "https://ai.gateway.lovable.dev";
export const VISION_MODEL = "openai/gpt-6-astra";

export class GatewayFailure extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

function apiKey() {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new GatewayFailure("config", "The AI service is not configured on the server.");
  return key;
}

/** Streams a strict structured-output Responses call and returns the parsed object. */
export async function structuredCall<T>(opts: {
  instructions: string;
  messages: ModelMessage[];
  schema: z.ZodType<T>;
  effort: "low" | "medium";
  signal?: AbortSignal;
}): Promise<T> {
  const key = apiKey();
  const runIdFetch = createLovableAiGatewayRunIdFetch();
  const provider = createOpenAI({
    baseURL: `${GATEWAY_URL}/v1`,
    apiKey: key,
    headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });
  try {
    const result = streamText({
      model: provider.responses(VISION_MODEL),
      instructions: opts.instructions,
      messages: opts.messages,
      output: Output.object({ schema: opts.schema }),
      ...(opts.signal ? { abortSignal: opts.signal } : {}),
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: opts.effort,
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
    });
    return (await result.output) as T;
  } catch (error) {
    throw toFailure(error);
  }
}

function toFailure(error: unknown): GatewayFailure {
  if (error instanceof GatewayFailure) return error;
  if (error instanceof NoObjectGeneratedError) {
    return new GatewayFailure("bad_output", "The AI returned an unexpected answer. Please try again.");
  }
  const status = APICallError.isInstance(error)
    ? error.statusCode
    : (error as { cause?: unknown })?.cause && APICallError.isInstance((error as { cause: unknown }).cause)
      ? ((error as { cause: APICallError }).cause.statusCode)
      : undefined;
  console.error("AI gateway call failed", status, error);
  switch (status) {
    case 402:
      return new GatewayFailure("credits", "AI credits have run out for this app. Add credits in workspace settings to keep scanning.");
    case 403:
      return new GatewayFailure("forbidden", "The AI service declined this request.");
    case 429:
      return new GatewayFailure("rate_limited", "Too many scans right now. Please wait a moment and try again.");
    case 400:
      return new GatewayFailure("bad_request", "The image could not be processed. Try a different photo.");
    default:
      if (status && status >= 500) {
        return new GatewayFailure("unavailable", "The AI service is temporarily unavailable. Please try again.");
      }
      return new GatewayFailure("unknown", "Something went wrong while reading the image. Please try again.");
  }
}
