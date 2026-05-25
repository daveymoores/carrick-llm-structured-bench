import type { ModelSpec, RawResult, JsonSchema, ProviderId } from "../types.ts";
import { callOpenAI } from "./openai.ts";
import { callAnthropic } from "./anthropic.ts";
import { callGemini } from "./gemini.ts";

export interface CallArgs {
  model: ModelSpec;
  schema: JsonSchema;
  schemaName: string;
  prompt: string;
}

export async function callProvider(args: CallArgs): Promise<RawResult> {
  const fn: Record<ProviderId, (a: CallArgs) => Promise<RawResult>> = {
    openai: callOpenAI,
    anthropic: callAnthropic,
    gemini: callGemini,
  };
  return fn[args.model.provider](args);
}
