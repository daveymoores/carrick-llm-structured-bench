import "dotenv/config";
import { mkdir, appendFile, readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import pLimit from "p-limit";
import type { CellRunLine, CellSpec, ModelSpec, ModelTier, ProviderId, SchemaSpec, PromptSpec } from "./types.ts";
import { loadModels } from "./models.ts";
import { ALL_SCHEMAS, PILOT_SCHEMAS } from "./schemas/index.ts";
import { PROMPTS, PILOT_PROMPTS, TASK_CUES } from "./prompts/index.ts";
import { callProvider } from "./providers/index.ts";
import { validate } from "./validator.ts";
import { classify } from "./bucketing.ts";
import { autoScoreSignposting } from "./signposting.ts";
import { costUsd } from "./models.ts";

type Phase = "pilot" | "full";

function parseArgs(argv: string[]): {
  phase: Phase;
  tiersOverride: ModelTier[] | null;
  schemasFilter: Set<string> | null;
  providersFilter: Set<ProviderId> | null;
  runsOverride: number | null;
} {
  const get = (k: string) => argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1];
  const phase = (get("phase") ?? "pilot") as Phase;
  if (phase !== "pilot" && phase !== "full") {
    throw new Error(`Unknown phase: ${phase}. Use --phase=pilot or --phase=full.`);
  }
  let tiersOverride: ModelTier[] | null = null;
  const tiersRaw = get("tiers");
  if (tiersRaw !== undefined) {
    const parts = tiersRaw.split(",").filter(Boolean);
    for (const p of parts) if (p !== "flagship" && p !== "cheap") throw new Error(`Unknown tier: ${p}`);
    tiersOverride = parts as ModelTier[];
  }
  const schemasRaw = get("schemas");
  const schemasFilter = schemasRaw ? new Set(schemasRaw.split(",").filter(Boolean)) : null;
  const providersRaw = get("providers");
  const providersFilter = providersRaw
    ? new Set(providersRaw.split(",").filter(Boolean) as ProviderId[])
    : null;
  const runsRaw = get("runs");
  const runsOverride = runsRaw ? Number(runsRaw) : null;
  if (runsOverride !== null && (!Number.isFinite(runsOverride) || runsOverride < 1)) {
    throw new Error(`Invalid --runs: ${runsRaw}`);
  }
  return { phase, tiersOverride, schemasFilter, providersFilter, runsOverride };
}

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function cellId(model: ModelSpec, schema: SchemaSpec, prompt: PromptSpec): string {
  return `${model.provider}__${model.tier}__${schema.id}__${prompt.id}`;
}

function buildCells(
  phase: Phase,
  models: ModelSpec[],
  filters: { schemasFilter: Set<string> | null; runsOverride: number | null },
): CellSpec[] {
  const allSchemas = phase === "pilot" ? PILOT_SCHEMAS : ALL_SCHEMAS;
  const schemas = filters.schemasFilter
    ? allSchemas.filter((s) => filters.schemasFilter!.has(s.id))
    : allSchemas;
  const prompts = phase === "pilot" ? PILOT_PROMPTS : PROMPTS;
  const defaultRuns = phase === "pilot" ? 5 : 30;
  const runs = filters.runsOverride ?? defaultRuns;
  const cells: CellSpec[] = [];
  for (const model of models) {
    for (const schema of schemas) {
      for (const prompt of prompts) {
        cells.push({ cellId: cellId(model, schema, prompt), model, schema, prompt, runs });
      }
    }
  }
  return cells;
}

async function existingRunCount(path: string): Promise<number> {
  if (!existsSync(path)) return 0;
  const s = await stat(path);
  if (s.size === 0) return 0;
  const text = await readFile(path, "utf8");
  return text.split("\n").filter((l) => l.trim().length > 0).length;
}

async function runOne(cell: CellSpec, runIdx: number): Promise<CellRunLine> {
  const nonce = randomUUID();
  const taskCue = TASK_CUES[cell.schema.id] ?? "Produce a JSON value matching the schema.";
  const prompt = cell.prompt.build(taskCue, nonce);

  let raw = await callProvider({
    model: cell.model,
    schema: cell.schema.schema,
    schemaName: cell.schema.id,
    prompt,
  });

  // Retry policy: 429 or 503 -> single retry after 5s. Never retry on schema violation.
  if (raw.providerError && raw.providerError.httpStatus && [429, 503].includes(raw.providerError.httpStatus)) {
    await sleep(5_000);
    raw = await callProvider({
      model: cell.model,
      schema: cell.schema.schema,
      schemaName: cell.schema.id,
      prompt,
    });
  }

  const validation = raw.raw ? await validate(cell.schema.schema, raw.raw) : null;
  const bucket = classify({ raw, validation });

  const line: CellRunLine = {
    cellId: cell.cellId,
    runIdx,
    provider: cell.model.provider,
    modelId: cell.model.id,
    modelTier: cell.model.tier,
    schemaId: cell.schema.id,
    promptId: cell.prompt.id,
    bucket,
    signposting: null,
    prompt,
    schemaSnapshot: cell.schema.schema,
    normalizedSchema: raw.normalizedSchema ?? null,
    raw: raw.raw,
    parsed: validation?.parsed ?? null,
    validation,
    providerError: raw.providerError,
    preCallRejection: raw.preCallRejection,
    latencyMs: raw.latencyMs,
    tokenUsage: raw.tokenUsage,
    costUsd: raw.tokenUsage ? costUsd(cell.model, raw.tokenUsage.input, raw.tokenUsage.output) : 0,
    ts: new Date().toISOString(),
  };
  line.signposting = autoScoreSignposting(line);
  return line;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function runCell(cell: CellSpec, outPath: string, providerLimits: Record<ProviderId, ReturnType<typeof pLimit>>): Promise<void> {
  const existing = await existingRunCount(outPath);
  if (existing >= cell.runs) {
    console.log(`[${cell.cellId}] skip (${existing}/${cell.runs} already on disk)`);
    return;
  }
  const limit = providerLimits[cell.model.provider];
  const remaining = cell.runs - existing;
  console.log(`[${cell.cellId}] running ${remaining} (already ${existing})`);

  const tasks = Array.from({ length: remaining }, (_, k) => existing + k).map((runIdx) =>
    limit(async () => {
      try {
        const line = await runOne(cell, runIdx);
        await appendFile(outPath, JSON.stringify(line) + "\n", "utf8");
      } catch (err: any) {
        console.error(`[${cell.cellId}] run ${runIdx} threw unhandled: ${err?.message ?? err}`);
      }
    }),
  );
  await Promise.all(tasks);
}

async function main() {
  const { phase, tiersOverride, schemasFilter, providersFilter, runsOverride } = parseArgs(process.argv.slice(2));
  const baseDir = process.env.BENCH_RESULTS_DIR ?? "./results";
  const outDir = join(baseDir, phase, todayStamp());
  await mkdir(outDir, { recursive: true });

  const defaultTiers: ModelTier[] = phase === "pilot" ? ["cheap"] : ["flagship", "cheap"];
  const tiers = tiersOverride ?? defaultTiers;
  let models = loadModels({ tiers });
  if (providersFilter) models = models.filter((m) => providersFilter.has(m.provider));
  const cells = buildCells(phase, models, { schemasFilter, runsOverride });

  const totalRuns = cells.reduce((sum, c) => sum + c.runs, 0);
  console.log(`Phase: ${phase}`);
  console.log(`Cells: ${cells.length} (${totalRuns} total runs)`);
  console.log(`Output: ${outDir}`);

  const concurrency = Number(process.env.BENCH_CONCURRENCY ?? 10);
  const providerLimits: Record<ProviderId, ReturnType<typeof pLimit>> = {
    openai: pLimit(concurrency),
    anthropic: pLimit(concurrency),
    gemini: pLimit(concurrency),
  };

  for (const cell of cells) {
    const outPath = join(outDir, `${cell.cellId}.jsonl`);
    await runCell(cell, outPath, providerLimits);
  }

  console.log(`\nDone. Run \`npm run report\` to generate tables.`);
  console.log(`If this was the pilot, write your green/yellow/red call to ${join(outDir, "SUMMARY.md")}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
