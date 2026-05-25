import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { CellRunLine } from "./types.ts";

interface Filters {
  phase: "pilot" | "full";
  date?: string;
  bucket?: string;
  provider?: string;
  schema?: string;
  limit: number;
  full: boolean;
}

function parseArgs(argv: string[]): Filters {
  const get = (k: string) => argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1];
  return {
    phase: (get("phase") ?? "pilot") as "pilot" | "full",
    date: get("date"),
    bucket: get("bucket"),
    provider: get("provider"),
    schema: get("schema"),
    limit: Number(get("limit") ?? "1"),
    full: argv.includes("--full"),
  };
}

async function latestDateDir(dir: string): Promise<string | null> {
  if (!existsSync(dir)) return null;
  const subs = await readdir(dir);
  const sorted = subs.filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s)).sort();
  return sorted.length > 0 ? sorted[sorted.length - 1]! : null;
}

async function loadLines(dir: string): Promise<CellRunLine[]> {
  const out: CellRunLine[] = [];
  const files = (await readdir(dir)).filter((f) => f.endsWith(".jsonl"));
  for (const f of files) {
    const text = await readFile(join(dir, f), "utf8");
    for (const line of text.split("\n")) {
      if (!line.trim()) continue;
      try {
        out.push(JSON.parse(line));
      } catch {
        // skip malformed
      }
    }
  }
  return out;
}

function applyFilters(lines: CellRunLine[], f: Filters): CellRunLine[] {
  return lines.filter((l) => {
    if (f.bucket && l.bucket !== f.bucket) return false;
    if (f.provider && l.provider !== f.provider) return false;
    if (f.schema && l.schemaId !== f.schema) return false;
    return true;
  });
}

function truncate(s: string | null | undefined, n: number, full: boolean): string {
  if (s == null) return "(none)";
  if (full || s.length <= n) return s;
  return s.slice(0, n) + `\n... [truncated ${s.length - n} chars; use --full to see all]`;
}

function fence(lang: string, body: string): string {
  return "```" + lang + "\n" + body + "\n```";
}

function formatLine(line: CellRunLine, full: boolean): string {
  const parts: string[] = [];
  parts.push(`## ${line.cellId} (run ${line.runIdx}) — ${line.bucket}`);
  parts.push("");
  parts.push(`- **Provider/model**: \`${line.provider}\` / \`${line.modelId}\` (${line.modelTier})`);
  parts.push(`- **Schema**: \`${line.schemaId}\` | **Prompt**: \`${line.promptId}\``);
  parts.push(`- **Latency**: ${line.latencyMs}ms | **Tokens**: in=${line.tokenUsage?.input ?? "?"} out=${line.tokenUsage?.output ?? "?"} | **Cost**: $${line.costUsd.toFixed(6)}`);
  parts.push(`- **Timestamp**: ${line.ts}`);
  parts.push("");

  parts.push("### Schema");
  parts.push(fence("json", JSON.stringify(line.schemaSnapshot, null, 2)));
  parts.push("");

  if (line.normalizedSchema && JSON.stringify(line.normalizedSchema) !== JSON.stringify(line.schemaSnapshot)) {
    parts.push("### Normalized schema (sent to provider after adapter normalization)");
    parts.push(fence("json", JSON.stringify(line.normalizedSchema, null, 2)));
    parts.push("");
  }

  parts.push("### Prompt");
  parts.push(fence("text", truncate(line.prompt, 2000, full)));
  parts.push("");

  if (line.preCallRejection) {
    parts.push("### Pre-call rejection");
    parts.push(fence("text", line.preCallRejection.reason));
    parts.push("");
  }

  if (line.providerError) {
    parts.push("### Provider error");
    parts.push(fence("json", JSON.stringify(line.providerError, null, 2)));
    parts.push("");
  }

  if (line.raw != null) {
    parts.push("### Raw response");
    parts.push(fence("json", truncate(line.raw, 4000, full)));
    parts.push("");
  }

  if (line.validation && (line.validation.ajv.errors.length || line.validation.hyperjump.errors.length || line.validation.parseError)) {
    parts.push("### Validation");
    if (line.validation.parseError) parts.push(`- **parse error**: ${line.validation.parseError}`);
    parts.push(`- **ajv**: ${line.validation.ajv.ok ? "✅ ok" : "❌ failed"}`);
    if (line.validation.ajv.errors.length) {
      for (const e of line.validation.ajv.errors.slice(0, 5)) parts.push(`    - ${e}`);
      if (line.validation.ajv.errors.length > 5) parts.push(`    - ... and ${line.validation.ajv.errors.length - 5} more`);
    }
    parts.push(`- **hyperjump**: ${line.validation.hyperjump.ok ? "✅ ok" : "❌ failed"}`);
    if (line.validation.hyperjump.errors.length) {
      for (const e of line.validation.hyperjump.errors.slice(0, 5)) parts.push(`    - ${e}`);
      if (line.validation.hyperjump.errors.length > 5) parts.push(`    - ... and ${line.validation.hyperjump.errors.length - 5} more`);
    }
    parts.push(`- **agreement**: ${line.validation.agreement ? "yes" : "NO (validator disagreement)"}`);
    parts.push("");
  }

  return parts.join("\n");
}

async function main() {
  const f = parseArgs(process.argv.slice(2));
  const baseDir = process.env.BENCH_RESULTS_DIR ?? "./results";
  const phaseDir = join(baseDir, f.phase);
  const date = f.date ?? (await latestDateDir(phaseDir));
  if (!date) {
    console.error(`No results found under ${phaseDir}.`);
    process.exit(1);
  }
  const dir = join(phaseDir, date);
  const all = await loadLines(dir);
  const matches = applyFilters(all, f);
  console.error(`Found ${matches.length} match(es) out of ${all.length} total lines.`);

  const picked = matches.slice(0, f.limit);
  for (const line of picked) {
    console.log(formatLine(line, f.full));
    console.log("\n---\n");
  }

  if (matches.length > f.limit) {
    console.error(`Showing first ${f.limit} of ${matches.length}. Use --limit=N to see more.`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
