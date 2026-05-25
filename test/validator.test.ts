import { test } from "node:test";
import assert from "node:assert/strict";
import { validate } from "../src/validator.ts";
import { classify } from "../src/bucketing.ts";
import type { RawResult } from "../src/types.ts";

const flatSchema = {
  type: "object",
  required: ["name", "age"],
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    age: { type: "integer", minimum: 0 },
  },
};

function makeRaw(raw: string | null, providerError: RawResult["providerError"] = null): RawResult {
  return {
    raw,
    latencyMs: 1,
    tokenUsage: null,
    providerError,
    preCallRejection: null,
  };
}

test("validator: clean conforming output passes both validators", async () => {
  const v = await validate(flatSchema, JSON.stringify({ name: "ada", age: 36 }));
  assert.equal(v.parseError, null);
  assert.equal(v.ajv.ok, true);
  assert.equal(v.hyperjump.ok, true);
  assert.equal(v.agreement, true);
});

test("validator: missing required key -> both reject, agreement true", async () => {
  const v = await validate(flatSchema, JSON.stringify({ name: "ada" }));
  assert.equal(v.parseError, null);
  assert.equal(v.ajv.ok, false);
  assert.equal(v.hyperjump.ok, false);
  assert.equal(v.agreement, true);
});

test("validator: wrong type -> both reject, agreement true", async () => {
  const v = await validate(flatSchema, JSON.stringify({ name: "ada", age: "thirtysix" }));
  assert.equal(v.ajv.ok, false);
  assert.equal(v.hyperjump.ok, false);
  assert.equal(v.agreement, true);
});

test("validator: extra property under additionalProperties:false -> both reject", async () => {
  const v = await validate(flatSchema, JSON.stringify({ name: "ada", age: 36, extra: 1 }));
  assert.equal(v.ajv.ok, false);
  assert.equal(v.hyperjump.ok, false);
});

test("validator: invalid JSON -> parse error", async () => {
  const v = await validate(flatSchema, "{not json");
  assert.notEqual(v.parseError, null);
  assert.equal(v.ajv.ok, false);
});

test("validator: null raw -> empty response error", async () => {
  const v = await validate(flatSchema, null);
  assert.equal(v.parseError, "empty response");
});

test("bucketing: pre-call rejection wins over everything", () => {
  const b = classify({
    raw: { ...makeRaw(null), preCallRejection: { reason: "$ref unsupported" } },
    validation: null,
  });
  assert.equal(b, "pre_call_schema_rejected");
});

test("bucketing: provider 'no tool call' bucket", () => {
  const b = classify({
    raw: makeRaw(null, { message: "model returned text", noToolCall: true }),
    validation: null,
  });
  assert.equal(b, "no_tool_call");
});

test("bucketing: useful loud failure (mentions schema)", () => {
  const b = classify({
    raw: makeRaw(null, { message: "schema validation failed at field 'age'" }),
    validation: null,
  });
  assert.equal(b, "loud_failure_useful");
});

test("bucketing: useless loud failure (generic 500)", () => {
  const b = classify({
    raw: makeRaw(null, { message: "internal server error", httpStatus: 500 }),
    validation: null,
  });
  assert.equal(b, "loud_failure_useless");
});

test("bucketing: strict adherence when both validators pass", async () => {
  const v = await validate(flatSchema, JSON.stringify({ name: "ada", age: 36 }));
  const b = classify({ raw: makeRaw(JSON.stringify({ name: "ada", age: 36 })), validation: v });
  assert.equal(b, "strict_adherence");
});

test("bucketing: silent failure when both validators reject in agreement", async () => {
  const body = JSON.stringify({ name: "ada" });
  const v = await validate(flatSchema, body);
  const b = classify({ raw: makeRaw(body), validation: v });
  assert.equal(b, "silent_failure");
});

test("bucketing: parse failure routes to loud-failure-useless", async () => {
  const v = await validate(flatSchema, "not json");
  const b = classify({ raw: makeRaw("not json"), validation: v });
  assert.equal(b, "loud_failure_useless");
});
