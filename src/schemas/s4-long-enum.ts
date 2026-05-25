import type { SchemaSpec } from "../types.ts";

const COLORS = [
  "alabaster", "amber", "amethyst", "aqua", "aquamarine", "azure", "beige", "bistre",
  "bronze", "burgundy", "carmine", "cerulean", "champagne", "chartreuse", "chestnut",
  "cinnabar", "cobalt", "copper", "coral", "crimson", "cyan", "ebony", "emerald",
  "fuchsia", "gold", "indigo", "ivory", "jade", "lavender", "lilac", "magenta",
  "mahogany", "maroon", "mauve", "midnight", "mint", "navy", "ochre", "olive",
  "onyx", "opal", "orchid", "pearl", "periwinkle", "platinum", "rose", "ruby",
  "saffron", "salmon", "sapphire", "scarlet", "sepia", "sienna", "silver", "tangerine",
];

export const s4LongEnum: SchemaSpec = {
  id: "S4",
  description: "One field with 50+ enum values. Probes enum-truncation and silent substitution.",
  schema: {
    type: "object",
    required: ["palette_id", "primary_color", "accent_color"],
    properties: {
      palette_id: { type: "string" },
      primary_color: { type: "string", enum: COLORS },
      accent_color: { type: "string", enum: COLORS },
      note: { type: "string" },
    },
  },
};

export const s4Colors = COLORS;
