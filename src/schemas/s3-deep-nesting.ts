import type { SchemaSpec } from "../types.ts";

// 7 levels of nested objects. Each level wraps the next under a sole "child" key,
// terminating in a leaf with primitive fields. Stress test for depth limits and
// truncation when models close brackets early.
export const s3DeepNesting: SchemaSpec = {
  id: "S3",
  description: "7-level nested object chain. Probes depth limits and bracket-truncation.",
  schema: {
    type: "object",
    required: ["level1"],
    properties: {
      level1: {
        type: "object",
        required: ["name", "child"],
        properties: {
          name: { type: "string" },
          child: {
            type: "object",
            required: ["name", "child"],
            properties: {
              name: { type: "string" },
              child: {
                type: "object",
                required: ["name", "child"],
                properties: {
                  name: { type: "string" },
                  child: {
                    type: "object",
                    required: ["name", "child"],
                    properties: {
                      name: { type: "string" },
                      child: {
                        type: "object",
                        required: ["name", "child"],
                        properties: {
                          name: { type: "string" },
                          child: {
                            type: "object",
                            required: ["name", "leaf"],
                            properties: {
                              name: { type: "string" },
                              leaf: {
                                type: "object",
                                required: ["value", "kind"],
                                properties: {
                                  value: { type: "string" },
                                  kind: { type: "string" },
                                  count: { type: "integer", minimum: 0 },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};
