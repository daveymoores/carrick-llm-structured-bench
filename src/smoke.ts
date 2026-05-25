import "dotenv/config";
import { loadModels } from "./models.ts";
import { callProvider } from "./providers/index.ts";
import { validate } from "./validator.ts";
import { classify } from "./bucketing.ts";
import { s1Baseline } from "./schemas/s1-baseline.ts";
import { PROMPTS, TASK_CUES } from "./prompts/index.ts";
import { randomUUID } from "node:crypto";

const p1 = PROMPTS.find((p) => p.id === "P1")!;

async function main() {
  const models = loadModels({ tiers: ["cheap"] });
  console.log(`Smoke-testing ${models.length} providers on ${s1Baseline.id} + ${p1.id}`);

  for (const model of models) {
    const nonce = randomUUID();
    const prompt = p1.build(TASK_CUES[s1Baseline.id]!, nonce);
    console.log(`\n--- ${model.provider} (${model.id}) ---`);
    const raw = await callProvider({
      model,
      schema: s1Baseline.schema,
      schemaName: s1Baseline.id,
      prompt,
    });
    const validation = raw.raw ? await validate(s1Baseline.schema, raw.raw) : null;
    const bucket = classify({ raw, validation });
    console.log(`bucket: ${bucket}`);
    console.log(`latency: ${raw.latencyMs}ms`);
    console.log(`tokens: in=${raw.tokenUsage?.input ?? "?"} out=${raw.tokenUsage?.output ?? "?"}`);
    if (raw.providerError) console.log(`provider error: ${raw.providerError.message}`);
    if (raw.preCallRejection) console.log(`pre-call rejection: ${raw.preCallRejection.reason}`);
    if (raw.raw) console.log(`raw: ${raw.raw.slice(0, 200)}${raw.raw.length > 200 ? "..." : ""}`);
    if (validation?.parseError) console.log(`parse error: ${validation.parseError}`);
    if (validation && !validation.agreement) {
      console.log(`validator disagreement: ajv=${validation.ajv.ok} hyperjump=${validation.hyperjump.ok}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
