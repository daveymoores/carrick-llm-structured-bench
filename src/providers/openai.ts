import OpenAI from "openai";
import type { CallArgs } from "./index.ts";
import type { JsonSchema, RawResult } from "../types.ts";

let _client: OpenAI | null = null;
function client(): OpenAI {
  if (!_client) _client = new OpenAI();
  return _client;
}

// Models that have removed the temperature parameter. Populated dynamically on
// first 400 and remembered for the rest of the process.
const openaiNoTemperatureModels = new Set<string>();

// OpenAI strict mode requires:
//   - additionalProperties: false on every object
//   - every property listed in `required`
//   - `type` must be a single string (no type-arrays like ["string","null"]); use {anyOf:[{type:"string"},{type:"null"}]}
//   - no `format` other than a small whitelist; we forward whatever we have
// We pre-check the schema and, if it violates strict-mode constraints, return a
// pre-call rejection without sending. This is symmetric with Gemini's
// convertSchemaToGemini rejection path.
export interface OpenAIStrictViolation {
  path: string;
  reason: string;
}

export function findOpenAIStrictViolations(schema: JsonSchema, path = "$"): OpenAIStrictViolation[] {
  const out: OpenAIStrictViolation[] = [];
  walk(schema, path, out);
  return out;
}

function walk(node: any, path: string, out: OpenAIStrictViolation[]): void {
  if (!node || typeof node !== "object") return;

  if (Array.isArray(node.type)) {
    out.push({ path, reason: `type-array ${JSON.stringify(node.type)} not allowed; use anyOf` });
  }

  if (node.type === "object") {
    if (node.additionalProperties !== false) {
      out.push({ path, reason: "object missing additionalProperties: false" });
    }
    const props = node.properties && typeof node.properties === "object" ? Object.keys(node.properties) : [];
    const required: string[] = Array.isArray(node.required) ? node.required : [];
    const missing = props.filter((p) => !required.includes(p));
    if (missing.length > 0) {
      out.push({ path, reason: `properties not all required: missing ${JSON.stringify(missing)}` });
    }
    for (const k of props) walk(node.properties[k], `${path}.${k}`, out);
  }

  if (node.type === "array" && node.items) walk(node.items, `${path}[]`, out);

  for (const key of ["oneOf", "anyOf", "allOf"] as const) {
    if (Array.isArray(node[key])) node[key].forEach((sub: any, i: number) => walk(sub, `${path}.${key}[${i}]`, out));
  }
}

export async function callOpenAI({ model, schema, schemaName, prompt }: CallArgs): Promise<RawResult> {
  const violations = findOpenAIStrictViolations(schema);
  if (violations.length > 0) {
    return {
      raw: null,
      latencyMs: 0,
      tokenUsage: null,
      providerError: null,
      preCallRejection: {
        reason: `OpenAI strict mode violations: ${violations
          .slice(0, 3)
          .map((v) => `${v.path}: ${v.reason}`)
          .join("; ")}`,
      },
      normalizedSchema: schema,
    };
  }

  const start = Date.now();
  const baseParams = {
    model: model.id,
    messages: [{ role: "user" as const, content: prompt }],
    response_format: {
      type: "json_schema" as const,
      json_schema: {
        name: schemaName,
        schema: schema as Record<string, unknown>,
        strict: true,
      },
    },
  };
  const supportsTemperature = !openaiNoTemperatureModels.has(model.id);
  try {
    let completion;
    try {
      completion = await client().chat.completions.create(
        supportsTemperature
          ? { ...baseParams, temperature: 0, seed: 42 }
          : baseParams,
      );
    } catch (err: any) {
      const msg: string = err?.message ?? "";
      if (supportsTemperature && /temperature/i.test(msg) && err?.status === 400) {
        openaiNoTemperatureModels.add(model.id);
        completion = await client().chat.completions.create(baseParams);
      } else {
        throw err;
      }
    }
    const latencyMs = Date.now() - start;
    const choice = completion.choices[0];
    const raw = choice?.message?.content ?? null;

    if (choice?.finish_reason === "length") {
      return {
        raw,
        latencyMs,
        tokenUsage: completion.usage
          ? { input: completion.usage.prompt_tokens, output: completion.usage.completion_tokens }
          : null,
        providerError: { message: "response truncated at max_tokens", truncated: true },
        preCallRejection: null,
        normalizedSchema: schema,
      };
    }

    return {
      raw,
      latencyMs,
      tokenUsage: completion.usage
        ? { input: completion.usage.prompt_tokens, output: completion.usage.completion_tokens }
        : null,
      providerError: null,
      preCallRejection: null,
      normalizedSchema: schema,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    return {
      raw: null,
      latencyMs,
      tokenUsage: null,
      providerError: {
        message: err?.message ?? String(err),
        code: err?.code,
        httpStatus: err?.status,
      },
      preCallRejection: null,
      normalizedSchema: schema,
    };
  }
}
