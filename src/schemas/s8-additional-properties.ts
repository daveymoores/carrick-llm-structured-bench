import type { SchemaSpec } from "../types.ts";

// Strict closed objects via additionalProperties:false at every level. OpenAI strict
// mode REQUIRES this; Gemini ignores it; Anthropic respects it. The divergence
// surface is whether each provider hallucinates extra keys despite the closed schema.
export const s8AdditionalProperties: SchemaSpec = {
  id: "S8",
  description: "additionalProperties: false at every level. Probes whether providers hallucinate extra keys.",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["session_id", "user", "metrics"],
    properties: {
      session_id: { type: "string" },
      user: {
        type: "object",
        additionalProperties: false,
        required: ["id", "name"],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
        },
      },
      metrics: {
        type: "object",
        additionalProperties: false,
        required: ["page_views", "clicks"],
        properties: {
          page_views: { type: "integer", minimum: 0 },
          clicks: { type: "integer", minimum: 0 },
        },
      },
    },
  },
};
