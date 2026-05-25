import type { SchemaSpec } from "../types.ts";

export const s6NullableFormat: SchemaSpec = {
  id: "S6",
  description: "Nullable fields plus format: date-time / uri. Probes type-array and format adherence.",
  schema: {
    type: "object",
    required: ["event_id", "occurred_at", "actor", "source"],
    properties: {
      event_id: { type: "string" },
      occurred_at: { type: "string", format: "date-time" },
      actor: { type: ["string", "null"] },
      source: { type: "string", format: "uri" },
      duration_ms: { type: ["integer", "null"], minimum: 0 },
      notes: { type: ["string", "null"] },
    },
  },
};
