import type { CellRunLine } from "./types.ts";

// 0 - generic error, no schema/field info.
// 1 - mentions schema/validation but not which field.
// 2 - names the offending field/path.
// 3 - names field + reason + suggested fix.
//
// The auto-classifier here is a heuristic intended for *sample* labelling. The plan
// requires manual calibration on a stratified 200-error sample with a second human
// rater (Cohen's kappa >= 0.7) before this score is used in headline tables.

export function autoScoreSignposting(line: CellRunLine): number | null {
  const msg = errorText(line);
  if (msg === null) return null;
  const lower = msg.toLowerCase();

  const namesField =
    /'[^']+'\s+(field|property|key|path)/.test(lower) ||
    /\$\.[a-zA-Z_][a-zA-Z0-9_.\[\]]*\b/.test(msg) ||
    /(field|property|key|path)\s+['"]?[a-zA-Z_][a-zA-Z0-9_]*['"]?/.test(lower);

  const hasReason =
    /\b(required|missing|expected|must be|unsupported|invalid|out of range|too (long|short|deep))\b/.test(lower);

  const hasFix =
    /\b(use|try|replace|switch to|inline|flatten|consider|instead of|should be)\b/.test(lower);

  const mentionsSchema = /\b(schema|validation|json schema|format)\b/.test(lower);

  if (namesField && hasReason && hasFix) return 3;
  if (namesField) return 2;
  if (mentionsSchema) return 1;
  return 0;
}

function errorText(line: CellRunLine): string | null {
  const parts: string[] = [];
  if (line.providerError?.message) parts.push(line.providerError.message);
  if (line.preCallRejection?.reason) parts.push(line.preCallRejection.reason);
  if (line.validation?.parseError) parts.push(line.validation.parseError);
  if (line.validation?.ajv.errors?.length) parts.push(...line.validation.ajv.errors);
  if (parts.length === 0) return null;
  return parts.join(" | ");
}
