import "dotenv/config";
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Bucket, CellRunLine, ProviderId } from "./types.ts";

const BUCKETS: Bucket[] = [
  "strict_adherence",
  "silent_failure",
  "validator_disagreement",
  "loud_failure_useful",
  "loud_failure_useless",
  "pre_call_schema_rejected",
  "no_tool_call",
];

function parseArgs(argv: string[]): { phase: "pilot" | "full"; date?: string } {
  const phase = (argv.find((a) => a.startsWith("--phase="))?.split("=")[1] ?? "pilot") as "pilot" | "full";
  const date = argv.find((a) => a.startsWith("--date="))?.split("=")[1];
  return { phase, date };
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

type Counts = Record<Bucket, number>;
function emptyCounts(): Counts {
  return BUCKETS.reduce((acc, b) => ({ ...acc, [b]: 0 }), {} as Counts);
}

function tally<K extends string>(lines: CellRunLine[], keyOf: (l: CellRunLine) => K): Map<K, Counts> {
  const m = new Map<K, Counts>();
  for (const l of lines) {
    const k = keyOf(l);
    if (!m.has(k)) m.set(k, emptyCounts());
    m.get(k)![l.bucket]++;
  }
  return m;
}

function pct(n: number, total: number): string {
  if (total === 0) return "-";
  return ((n / total) * 100).toFixed(1) + "%";
}

function tableByProviderModel(lines: CellRunLine[]): string {
  const tallied = tally(lines, (l) => `${l.provider}/${l.modelTier} (${l.modelId})`);
  const rows: string[] = [];
  rows.push("| Provider / Model | n | Strict | Silent fail | Loud useful | Loud useless | Pre-call rej | No tool | Validator disagree |");
  rows.push("|---|---|---|---|---|---|---|---|---|");
  for (const [k, c] of [...tallied.entries()].sort()) {
    const n = BUCKETS.reduce((s, b) => s + c[b], 0);
    rows.push(
      `| ${k} | ${n} | ${pct(c.strict_adherence, n)} | ${pct(c.silent_failure, n)} | ${pct(c.loud_failure_useful, n)} | ${pct(c.loud_failure_useless, n)} | ${pct(c.pre_call_schema_rejected, n)} | ${pct(c.no_tool_call, n)} | ${pct(c.validator_disagreement, n)} |`,
    );
  }
  return rows.join("\n");
}

function tableByProviderSchema(lines: CellRunLine[]): string {
  const tallied = tally(lines, (l) => `${l.provider} × ${l.schemaId}`);
  const rows: string[] = [];
  rows.push("| Provider × Schema | n | Strict | Silent fail | Loud useful | Loud useless | Pre-call rej |");
  rows.push("|---|---|---|---|---|---|---|");
  for (const [k, c] of [...tallied.entries()].sort()) {
    const n = BUCKETS.reduce((s, b) => s + c[b], 0);
    rows.push(
      `| ${k} | ${n} | ${pct(c.strict_adherence, n)} | ${pct(c.silent_failure, n)} | ${pct(c.loud_failure_useful, n)} | ${pct(c.loud_failure_useless, n)} | ${pct(c.pre_call_schema_rejected, n)} |`,
    );
  }
  return rows.join("\n");
}

function signpostingByProvider(lines: CellRunLine[]): string {
  const byProv = new Map<ProviderId, number[]>();
  for (const l of lines) {
    if (l.signposting === null) continue;
    if (!byProv.has(l.provider)) byProv.set(l.provider, []);
    byProv.get(l.provider)!.push(l.signposting);
  }
  const rows: string[] = [];
  rows.push("| Provider | n errors scored | Mean signposting score (0-3) |");
  rows.push("|---|---|---|");
  for (const [p, scores] of [...byProv.entries()].sort()) {
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    rows.push(`| ${p} | ${scores.length} | ${mean.toFixed(2)} |`);
  }
  return rows.join("\n");
}

function costSummary(lines: CellRunLine[]): string {
  const byProv = new Map<ProviderId, { cost: number; latencies: number[] }>();
  for (const l of lines) {
    if (!byProv.has(l.provider)) byProv.set(l.provider, { cost: 0, latencies: [] });
    const e = byProv.get(l.provider)!;
    e.cost += l.costUsd;
    e.latencies.push(l.latencyMs);
  }
  const rows: string[] = [];
  rows.push("| Provider | Calls | Total cost USD | Latency p50 ms | Latency p95 ms |");
  rows.push("|---|---|---|---|---|");
  for (const [p, e] of [...byProv.entries()].sort()) {
    const sorted = [...e.latencies].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)] ?? 0;
    const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
    rows.push(`| ${p} | ${sorted.length} | $${e.cost.toFixed(2)} | ${p50} | ${p95} |`);
  }
  return rows.join("\n");
}

function pilotVerdict(lines: CellRunLine[]): string {
  // Green if >=2 providers diverge >20pp on strict-adherence for S3 or S5.
  const focus = (schemaId: string) => {
    const byProv = new Map<ProviderId, { ok: number; total: number }>();
    for (const l of lines.filter((l) => l.schemaId === schemaId)) {
      if (!byProv.has(l.provider)) byProv.set(l.provider, { ok: 0, total: 0 });
      const e = byProv.get(l.provider)!;
      e.total++;
      if (l.bucket === "strict_adherence") e.ok++;
    }
    return [...byProv.entries()].map(([p, e]) => ({ p, rate: e.total === 0 ? 0 : e.ok / e.total, total: e.total }));
  };
  const s3 = focus("S3");
  const s5 = focus("S5");

  const gap = (rates: { rate: number }[]) =>
    rates.length < 2 ? 0 : Math.max(...rates.map((r) => r.rate)) - Math.min(...rates.map((r) => r.rate));
  const gapS3 = gap(s3);
  const gapS5 = gap(s5);

  let verdict = "RED";
  if (gapS3 > 0.2 || gapS5 > 0.2) verdict = "GREEN";
  else if (gapS3 > 0.05 || gapS5 > 0.05) verdict = "YELLOW";

  return [
    `**Pilot verdict (auto-suggestion only; review before deciding)**: ${verdict}`,
    "",
    `- S3 adherence gap across providers: ${(gapS3 * 100).toFixed(1)}pp`,
    `- S5 adherence gap across providers: ${(gapS5 * 100).toFixed(1)}pp`,
    "",
    "Green = proceed to full run. Yellow = pivot article to signposting-led; consider reduced full run. Red = stop and reconsider thesis.",
  ].join("\n");
}

async function main() {
  const { phase, date } = parseArgs(process.argv.slice(2));
  const baseDir = process.env.BENCH_RESULTS_DIR ?? "./results";
  const phaseDir = join(baseDir, phase);
  const resolvedDate = date ?? (await latestDateDir(phaseDir));
  if (!resolvedDate) {
    console.error(`No results found under ${phaseDir}. Run \`npm run ${phase}\` first.`);
    process.exit(1);
  }
  const dir = join(phaseDir, resolvedDate);
  console.log(`Reading from ${dir}`);
  const lines = await loadLines(dir);
  console.log(`Loaded ${lines.length} run lines.`);
  if (lines.length === 0) {
    console.error(`No JSONL lines found. Did the runner complete?`);
    process.exit(1);
  }

  const sections: string[] = [];
  sections.push(`# Bench report (${phase}, ${resolvedDate})`);
  sections.push("");
  sections.push(`Total runs: ${lines.length}`);
  sections.push("");
  if (phase === "pilot") {
    sections.push(pilotVerdict(lines));
    sections.push("");
  }
  sections.push("## Outcome rates by provider × model");
  sections.push("");
  sections.push(tableByProviderModel(lines));
  sections.push("");
  sections.push("## Outcome rates by provider × schema");
  sections.push("");
  sections.push(tableByProviderSchema(lines));
  sections.push("");
  sections.push("## Signposting quality (auto-scored; calibrate before quoting)");
  sections.push("");
  sections.push(signpostingByProvider(lines));
  sections.push("");
  sections.push("## Cost and latency");
  sections.push("");
  sections.push(costSummary(lines));
  sections.push("");

  const tablesDir = join(dir, "tables");
  await mkdir(tablesDir, { recursive: true });
  const path = phase === "pilot" ? join(dir, "SUMMARY.md") : join(tablesDir, "REPORT.md");
  await writeFile(path, sections.join("\n"), "utf8");
  console.log(`Wrote ${path}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
