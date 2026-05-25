import type { SchemaSpec } from "../types.ts";

// Tagged union via oneOf. Carrick's pre-flight validator rejects this for Gemini;
// included to surface the same divergence in this benchmark.
export const s5OneOf: SchemaSpec = {
  id: "S5",
  description: "Tagged union via oneOf (kind: 'email' | 'sms' | 'webhook').",
  schema: {
    type: "object",
    required: ["channel"],
    properties: {
      channel: {
        oneOf: [
          {
            type: "object",
            required: ["kind", "address"],
            properties: {
              kind: { const: "email" },
              address: { type: "string", format: "email" },
              cc: { type: "array", items: { type: "string", format: "email" } },
            },
          },
          {
            type: "object",
            required: ["kind", "phone"],
            properties: {
              kind: { const: "sms" },
              phone: { type: "string" },
            },
          },
          {
            type: "object",
            required: ["kind", "url"],
            properties: {
              kind: { const: "webhook" },
              url: { type: "string", format: "uri" },
              method: { type: "string", enum: ["POST", "PUT"] },
            },
          },
        ],
      },
    },
  },
};
