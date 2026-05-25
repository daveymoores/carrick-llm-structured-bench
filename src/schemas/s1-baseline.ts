import type { SchemaSpec } from "../types.ts";

// Baseline must be the LCD: a schema that every provider accepts and conforms to.
// OpenAI strict mode is the most restrictive (requires additionalProperties: false
// at every level, every property in `required`, and no type-arrays), so S1 is
// shaped to satisfy strict mode. Divergence is probed by S2-S8.
export const s1Baseline: SchemaSpec = {
  id: "S1",
  description: "Flat object, 10 required primitive fields. OpenAI-strict-compliant. Baseline sanity check.",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["id", "title", "owner", "priority", "open", "created_at", "tags", "score", "assignee", "notes"],
    properties: {
      id: { type: "string" },
      title: { type: "string" },
      owner: { type: "string" },
      priority: { type: "integer", minimum: 1, maximum: 5 },
      open: { type: "boolean" },
      created_at: { type: "string" },
      tags: { type: "array", items: { type: "string" } },
      score: { type: "number" },
      assignee: { type: "string" },
      notes: { type: "string" },
    },
  },
};
