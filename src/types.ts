export type JsonSchema = Record<string, unknown>;

export type ProviderId = "openai" | "anthropic" | "gemini";

export type ModelTier = "flagship" | "cheap";

export interface ModelSpec {
  provider: ProviderId;
  tier: ModelTier;
  id: string;
  pricing: {
    inputPerM: number;
    outputPerM: number;
  };
}

export interface SchemaSpec {
  id: string;
  description: string;
  schema: JsonSchema;
}

export interface PromptSpec {
  id: "P1" | "P2" | "P3";
  description: string;
  build: (taskCue: string, nonce: string) => string;
}

export type Bucket =
  | "strict_adherence"
  | "silent_failure"
  | "validator_disagreement"
  | "loud_failure_useful"
  | "loud_failure_useless"
  | "pre_call_schema_rejected"
  | "no_tool_call";

export interface TokenUsage {
  input: number;
  output: number;
  cachedInput?: number;
}

export interface RawResult {
  raw: string | null;
  latencyMs: number;
  tokenUsage: TokenUsage | null;
  providerError: {
    message: string;
    code?: string;
    httpStatus?: number;
    truncated?: boolean;
    noToolCall?: boolean;
  } | null;
  preCallRejection: {
    reason: string;
  } | null;
  normalizedSchema?: JsonSchema;
}

export interface ValidationOutcome {
  parsed: unknown;
  parseError: string | null;
  ajv: { ok: boolean; errors: string[] };
  hyperjump: { ok: boolean; errors: string[] };
  agreement: boolean;
}

export interface CellRunLine {
  cellId: string;
  runIdx: number;
  provider: ProviderId;
  modelId: string;
  modelTier: ModelTier;
  schemaId: string;
  promptId: PromptSpec["id"];
  bucket: Bucket;
  signposting: number | null;
  prompt: string;
  schemaSnapshot: JsonSchema;
  normalizedSchema: JsonSchema | null;
  raw: string | null;
  parsed: unknown;
  validation: ValidationOutcome | null;
  providerError: RawResult["providerError"];
  preCallRejection: RawResult["preCallRejection"];
  latencyMs: number;
  tokenUsage: TokenUsage | null;
  costUsd: number;
  ts: string;
}

export interface CellSpec {
  cellId: string;
  model: ModelSpec;
  schema: SchemaSpec;
  prompt: PromptSpec;
  runs: number;
}
