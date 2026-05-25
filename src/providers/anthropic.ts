import Anthropic from "@anthropic-ai/sdk";
import type { CallArgs } from "./index.ts";
import type { RawResult } from "../types.ts";

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!_client) _client = new Anthropic();
  return _client;
}

const TOOL_NAME = "emit_structured_result";

// Models that have deprecated the temperature parameter. Populated on first 400.
const anthropicNoTemperatureModels = new Set<string>();

export async function callAnthropic({ model, schema, schemaName, prompt }: CallArgs): Promise<RawResult> {
  const start = Date.now();
  const baseParams = {
    model: model.id,
    // 8192 brings Anthropic close to the default ceilings used by OpenAI/Gemini
    // so long-array schemas (S7) are not truncated by a bench-side config choice.
    max_tokens: 8192,
    tools: [
      {
        name: TOOL_NAME,
        description: `Emit a single structured ${schemaName} value.`,
        input_schema: schema as any,
      },
    ],
    tool_choice: { type: "tool" as const, name: TOOL_NAME },
    messages: [{ role: "user" as const, content: prompt }],
  };
  const supportsTemperature = !anthropicNoTemperatureModels.has(model.id);
  try {
    let resp;
    try {
      resp = await client().messages.create(
        supportsTemperature ? { ...baseParams, temperature: 0 } : baseParams,
      );
    } catch (err: any) {
      const msg: string = err?.message ?? "";
      if (supportsTemperature && /temperature/i.test(msg) && err?.status === 400) {
        anthropicNoTemperatureModels.add(model.id);
        resp = await client().messages.create(baseParams);
      } else {
        throw err;
      }
    }
    const latencyMs = Date.now() - start;

    const toolUse = resp.content.find((b: any) => b.type === "tool_use") as any | undefined;
    const usage = {
      input: resp.usage?.input_tokens ?? 0,
      output: resp.usage?.output_tokens ?? 0,
    };

    if (!toolUse) {
      const text = resp.content
        .filter((b: any) => b.type === "text")
        .map((b: any) => b.text)
        .join("");
      return {
        raw: text || null,
        latencyMs,
        tokenUsage: usage,
        providerError: {
          message: "model text-responded despite forced tool_choice",
          noToolCall: true,
        },
        preCallRejection: null,
        normalizedSchema: schema,
      };
    }

    if (resp.stop_reason === "max_tokens") {
      return {
        raw: JSON.stringify(toolUse.input),
        latencyMs,
        tokenUsage: usage,
        providerError: { message: "response truncated at max_tokens", truncated: true },
        preCallRejection: null,
        normalizedSchema: schema,
      };
    }

    return {
      raw: JSON.stringify(toolUse.input),
      latencyMs,
      tokenUsage: usage,
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
        code: err?.error?.type,
        httpStatus: err?.status,
      },
      preCallRejection: null,
      normalizedSchema: schema,
    };
  }
}
