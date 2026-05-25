import type { PromptSpec } from "../types.ts";
import { MOCK_CONTEXT } from "./mock-context.ts";

const P1: PromptSpec = {
  id: "P1",
  description: "Minimal: one-line task plus schema reference.",
  build: (taskCue, nonce) =>
    `// run-id: ${nonce}
${taskCue}

Return a single JSON value that conforms to the response schema provided by the API call. Output only the JSON.`,
};

const P2: PromptSpec = {
  id: "P2",
  description: "Realistic: ~4k tokens of mock log context plus extraction task.",
  build: (taskCue, nonce) =>
    `// run-id: ${nonce}
${taskCue}

You are processing the application log excerpt below. Extract or synthesise a single JSON value that conforms to the response schema provided by the API call. The log is realistic but not exhaustive; fill plausible values where the log does not specify them.

--- LOG CONTEXT BEGIN ---
${MOCK_CONTEXT}
--- LOG CONTEXT END ---

Output only the JSON.`,
};

const P3: PromptSpec = {
  id: "P3",
  description: "Realistic plus reasoning constraint that stresses adherence under cognitive load.",
  build: (taskCue, nonce) =>
    `// run-id: ${nonce}
${taskCue}

You are processing the application log excerpt below. Extract or synthesise a single JSON value that conforms to the response schema provided by the API call.

Additional reasoning constraints:
- Prefer values that reflect entries from the SECOND HALF of the log over the first half.
- If a numeric quantity is requested and the log shows multiple, use the largest.
- If a field has no clear analogue in the log, supply a plausible value but keep it short.
- Do not omit any required field even when the constraint above would suggest dropping it.

--- LOG CONTEXT BEGIN ---
${MOCK_CONTEXT}
--- LOG CONTEXT END ---

Output only the JSON.`,
};

export const PROMPTS: PromptSpec[] = [P1, P2, P3];
export const PILOT_PROMPTS: PromptSpec[] = [P2];

// Per-schema task cues. Kept terse so the prompt scaffolding is the only thing
// driving prompt-length differences.
export const TASK_CUES: Record<string, string> = {
  S1: "Produce one issue-tracker record summarising the most relevant event in the log.",
  S2: "Produce one report containing 2-4 items, each pinned to a location in the log.",
  S3: "Produce one deeply-nested 7-level chain summarising the log; the leaf describes the final outcome.",
  S4: "Produce one palette record matching the strongest visual themes present in the log.",
  S5: "Produce one notification channel record (email, sms, or webhook) that fits the log.",
  S6: "Produce one event record with timestamps and source URL. Use null where unknown.",
  S7: "Produce one batch with at least 20 entries derived from or synthesised around the log.",
  S8: "Produce one session-metrics record. Do not invent fields outside the schema.",
};
