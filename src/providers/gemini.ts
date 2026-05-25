import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import type { CallArgs } from "./index.ts";
import type { JsonSchema, RawResult } from "../types.ts";

let _client: GoogleGenerativeAI | null = null;
function client(): GoogleGenerativeAI {
  if (!_client) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY not set");
    _client = new GoogleGenerativeAI(key);
  }
  return _client;
}

// Re-implementation of Carrick's findSchemaViolation + convertSchemaToGemini.
// Deliberately NOT imported from Carrick (Carrick's schemas are IP); the rules
// match the documented Gemini structured-output constraints.

interface SchemaViolation {
  path: string;
  reason: string;
}

const DISALLOWED_KEYWORDS = ["$ref", "$defs", "definitions", "oneOf", "not", "if", "then", "else"] as const;

export function findGeminiViolations(schema: JsonSchema, path = "$"): SchemaViolation[] {
  const out: SchemaViolation[] = [];
  walk(schema, path, out);
  return out;
}

function walk(node: any, path: string, out: SchemaViolation[]): void {
  if (!node || typeof node !== "object") return;
  for (const k of DISALLOWED_KEYWORDS) {
    if (k in node) out.push({ path, reason: `${k} unsupported by Gemini structured output` });
  }
  if (Array.isArray(node.type)) {
    out.push({ path, reason: `type-array ${JSON.stringify(node.type)} unsupported; use a single type` });
  }
  if (node.type === "object" && node.properties) {
    for (const [k, v] of Object.entries(node.properties)) walk(v, `${path}.${k}`, out);
  }
  if (node.type === "array" && node.items) walk(node.items, `${path}[]`, out);
  if (Array.isArray(node.anyOf)) node.anyOf.forEach((sub: any, i: number) => walk(sub, `${path}.anyOf[${i}]`, out));
}

const TYPE_MAP: Record<string, SchemaType> = {
  string: SchemaType.STRING,
  number: SchemaType.NUMBER,
  integer: SchemaType.INTEGER,
  boolean: SchemaType.BOOLEAN,
  array: SchemaType.ARRAY,
  object: SchemaType.OBJECT,
};

export function convertSchemaToGemini(node: any): any {
  if (!node || typeof node !== "object") return node;
  const out: any = {};
  if (typeof node.type === "string" && TYPE_MAP[node.type]) {
    out.type = TYPE_MAP[node.type];
  }
  if (node.description) out.description = node.description;
  if (Array.isArray(node.enum)) out.enum = node.enum;
  if (node.format) out.format = node.format;
  if (typeof node.minimum === "number") out.minimum = node.minimum;
  if (typeof node.maximum === "number") out.maximum = node.maximum;
  if (typeof node.minItems === "number") out.minItems = node.minItems;
  if (typeof node.maxItems === "number") out.maxItems = node.maxItems;
  if (Array.isArray(node.required)) out.required = node.required;

  if (node.type === "object" && node.properties && typeof node.properties === "object") {
    out.properties = {};
    for (const [k, v] of Object.entries(node.properties)) {
      out.properties[k] = convertSchemaToGemini(v);
    }
  }
  if (node.type === "array" && node.items) {
    out.items = convertSchemaToGemini(node.items);
  }
  return out;
}

export async function callGemini({ model, schema, prompt }: CallArgs): Promise<RawResult> {
  const violations = findGeminiViolations(schema);
  if (violations.length > 0) {
    return {
      raw: null,
      latencyMs: 0,
      tokenUsage: null,
      providerError: null,
      preCallRejection: {
        reason: `Gemini schema violations: ${violations
          .slice(0, 3)
          .map((v) => `${v.path}: ${v.reason}`)
          .join("; ")}`,
      },
      normalizedSchema: schema,
    };
  }

  const normalizedSchema = convertSchemaToGemini(schema);

  const start = Date.now();
  try {
    const m = client().getGenerativeModel({
      model: model.id,
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
        responseSchema: normalizedSchema,
      },
    });
    const result = await m.generateContent(prompt);
    const latencyMs = Date.now() - start;
    const raw = result.response.text();

    const meta = (result.response as any).usageMetadata;
    const tokenUsage = meta
      ? {
          input: meta.promptTokenCount ?? 0,
          output: meta.candidatesTokenCount ?? 0,
        }
      : null;

    const finishReason = result.response.candidates?.[0]?.finishReason;
    if (finishReason === "MAX_TOKENS") {
      return {
        raw,
        latencyMs,
        tokenUsage,
        providerError: { message: "response truncated at max_tokens", truncated: true },
        preCallRejection: null,
        normalizedSchema,
      };
    }

    return {
      raw,
      latencyMs,
      tokenUsage,
      providerError: null,
      preCallRejection: null,
      normalizedSchema,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    return {
      raw: null,
      latencyMs,
      tokenUsage: null,
      providerError: {
        message: err?.message ?? String(err),
        code: err?.status,
        httpStatus: err?.status,
      },
      preCallRejection: null,
      normalizedSchema,
    };
  }
}
