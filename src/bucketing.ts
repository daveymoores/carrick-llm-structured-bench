import type { Bucket, RawResult, ValidationOutcome } from "./types.ts";

export interface ClassifyInput {
  raw: RawResult;
  validation: ValidationOutcome | null;
}

export function classify({ raw, validation }: ClassifyInput): Bucket {
  if (raw.preCallRejection) return "pre_call_schema_rejected";

  if (raw.providerError) {
    if (raw.providerError.noToolCall) return "no_tool_call";
    // Truncation counts as a loud failure (and gets a useful/useless score based on message).
    if (isUsefulError(raw.providerError.message)) return "loud_failure_useful";
    return "loud_failure_useless";
  }

  if (!validation) return "loud_failure_useless";

  if (validation.parseError) {
    // The response came back but didn't parse: loud-ish failure. Score useful if the
    // raw text mentions a structural cue we could act on, else useless.
    return "loud_failure_useless";
  }

  if (!validation.agreement) return "validator_disagreement";

  if (validation.ajv.ok && validation.hyperjump.ok) return "strict_adherence";

  // Both validators reject and they agree.
  return "silent_failure";
}

const USEFUL_ERROR_HINTS = [
  /field/i,
  /property/i,
  /path/i,
  /required/i,
  /schema/i,
  /must be/i,
  /invalid_value/i,
  /unsupported/i,
  /\$ref/i,
  /oneOf/i,
  /anyOf/i,
];

function isUsefulError(msg: string): boolean {
  return USEFUL_ERROR_HINTS.some((re) => re.test(msg));
}
