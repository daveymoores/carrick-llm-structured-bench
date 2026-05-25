import type { SchemaSpec } from "../types.ts";

export const s2MidNesting: SchemaSpec = {
  id: "S2",
  description: "3 levels: array of objects, each with a sub-object.",
  schema: {
    type: "object",
    required: ["report_id", "items"],
    properties: {
      report_id: { type: "string" },
      items: {
        type: "array",
        items: {
          type: "object",
          required: ["item_id", "label", "location"],
          properties: {
            item_id: { type: "string" },
            label: { type: "string" },
            location: {
              type: "object",
              required: ["file", "line"],
              properties: {
                file: { type: "string" },
                line: { type: "integer", minimum: 1 },
                column: { type: "integer", minimum: 1 },
              },
            },
            tags: { type: "array", items: { type: "string" } },
          },
        },
      },
    },
  },
};
