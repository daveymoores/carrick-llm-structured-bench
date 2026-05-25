import type { SchemaSpec } from "../types.ts";

export const s7LongArray: SchemaSpec = {
  id: "S7",
  description: "Array with minItems: 20, each item a 5-field object. Probes token-budget interaction.",
  schema: {
    type: "object",
    required: ["batch_id", "entries"],
    properties: {
      batch_id: { type: "string" },
      entries: {
        type: "array",
        minItems: 20,
        items: {
          type: "object",
          required: ["entry_id", "name", "weight", "category", "valid"],
          properties: {
            entry_id: { type: "string" },
            name: { type: "string" },
            weight: { type: "number" },
            category: { type: "string" },
            valid: { type: "boolean" },
          },
        },
      },
    },
  },
};
