import type { SchemaSpec } from "../types.ts";
import { s1Baseline } from "./s1-baseline.ts";
import { s2MidNesting } from "./s2-mid-nesting.ts";
import { s3DeepNesting } from "./s3-deep-nesting.ts";
import { s4LongEnum } from "./s4-long-enum.ts";
import { s5OneOf } from "./s5-oneof.ts";
import { s6NullableFormat } from "./s6-nullable-format.ts";
import { s7LongArray } from "./s7-long-array.ts";
import { s8AdditionalProperties } from "./s8-additional-properties.ts";

export const ALL_SCHEMAS: SchemaSpec[] = [
  s1Baseline,
  s2MidNesting,
  s3DeepNesting,
  s4LongEnum,
  s5OneOf,
  s6NullableFormat,
  s7LongArray,
  s8AdditionalProperties,
];

// Originally 3 schemas as a divergence-detection gate. Expanded to all 8 once
// the initial gate landed GREEN so we have a fuller cheap-tier picture before
// deciding whether to spend on flagship.
export const PILOT_SCHEMAS: SchemaSpec[] = ALL_SCHEMAS;
