import Ajv from "ajv";
import addFormats from "ajv-formats";
import { registerSchema, unregisterSchema, validate as hyperjumpValidate } from "@hyperjump/json-schema/draft-2020-12";
import type { JsonSchema, ValidationOutcome } from "./types.ts";

const ajv = new Ajv({
  strict: false,
  allErrors: true,
  validateFormats: true,
});
addFormats(ajv);

function formatAjvErrors(errs: unknown): string[] {
  if (!Array.isArray(errs)) return [];
  return errs.map((e: any) => {
    const path = e.instancePath || "(root)";
    return `${path} ${e.message ?? "(no message)"}${e.params ? " " + JSON.stringify(e.params) : ""}`;
  });
}

function safeAjvValidate(schema: JsonSchema, value: unknown): { ok: boolean; errors: string[] } {
  try {
    const validate = ajv.compile(schema);
    const ok = validate(value);
    if (ok) return { ok: true, errors: [] };
    return { ok: false, errors: formatAjvErrors(validate.errors) };
  } catch (err: any) {
    return { ok: false, errors: [`ajv-compile-error: ${err?.message ?? String(err)}`] };
  }
}

async function safeHyperjumpValidate(
  schema: JsonSchema,
  value: unknown,
): Promise<{ ok: boolean; errors: string[] }> {
  const ref = `mem://schema/${Math.random().toString(36).slice(2)}`;
  const HYPERJUMP_DIALECT = "https://json-schema.org/draft/2020-12/schema";
  try {
    registerSchema(schema as any, ref, HYPERJUMP_DIALECT);
    const out = await hyperjumpValidate(ref, value as any, "DETAILED");
    if (out.valid) return { ok: true, errors: [] };
    const errors: string[] = [];
    const walk = (node: any) => {
      if (!node) return;
      if (node.valid === false) {
        if (node.error) errors.push(`${node.instanceLocation ?? ""} ${node.error}`);
        if (Array.isArray(node.errors)) node.errors.forEach(walk);
      }
    };
    walk(out);
    if (errors.length === 0) errors.push("hyperjump rejected with no detail");
    return { ok: false, errors };
  } catch (err: any) {
    return { ok: false, errors: [`hyperjump-error: ${err?.message ?? String(err)}`] };
  } finally {
    try {
      unregisterSchema(ref);
    } catch {
      // best effort
    }
  }
}

export async function validate(schema: JsonSchema, raw: string | null): Promise<ValidationOutcome> {
  if (raw === null || raw === "") {
    return {
      parsed: null,
      parseError: "empty response",
      ajv: { ok: false, errors: ["no value to validate"] },
      hyperjump: { ok: false, errors: ["no value to validate"] },
      agreement: true,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err: any) {
    return {
      parsed: null,
      parseError: err?.message ?? String(err),
      ajv: { ok: false, errors: ["json parse failed"] },
      hyperjump: { ok: false, errors: ["json parse failed"] },
      agreement: true,
    };
  }

  const ajvResult = safeAjvValidate(schema, parsed);
  const hyperjumpResult = await safeHyperjumpValidate(schema, parsed);

  return {
    parsed,
    parseError: null,
    ajv: ajvResult,
    hyperjump: hyperjumpResult,
    agreement: ajvResult.ok === hyperjumpResult.ok,
  };
}
