import type { ModelSpec, ProviderId, ModelTier } from "./types.ts";

// Pricing in USD per million tokens. Approximate as of early 2026. Verify and
// update against current provider docs before each full run.
const PRICING: Record<ProviderId, Record<ModelTier, { inputPerM: number; outputPerM: number }>> = {
  openai: {
    flagship: { inputPerM: 1.25, outputPerM: 10 },
    cheap: { inputPerM: 0.15, outputPerM: 0.6 },
  },
  anthropic: {
    // Opus 4.7 dropped Opus pricing from the historical $15/$75 to $5/$25.
    // Verify against https://docs.anthropic.com/en/docs/about-claude/models before each run.
    flagship: { inputPerM: 5, outputPerM: 25 },
    cheap: { inputPerM: 3, outputPerM: 15 },
  },
  gemini: {
    flagship: { inputPerM: 1.25, outputPerM: 5 },
    cheap: { inputPerM: 0.075, outputPerM: 0.3 },
  },
};

const ENV_KEYS: Record<ProviderId, Record<ModelTier, string>> = {
  openai: {
    flagship: "MODEL_ID_OPENAI_FLAGSHIP",
    cheap: "MODEL_ID_OPENAI_CHEAP",
  },
  anthropic: {
    flagship: "MODEL_ID_ANTHROPIC_FLAGSHIP",
    cheap: "MODEL_ID_ANTHROPIC_CHEAP",
  },
  gemini: {
    flagship: "MODEL_ID_GEMINI_FLAGSHIP",
    cheap: "MODEL_ID_GEMINI_CHEAP",
  },
};

export function loadModels(opts: { tiers?: ModelTier[] } = {}): ModelSpec[] {
  const tiers = opts.tiers ?? (["flagship", "cheap"] as ModelTier[]);
  const out: ModelSpec[] = [];
  for (const provider of Object.keys(ENV_KEYS) as ProviderId[]) {
    for (const tier of tiers) {
      const envKey = ENV_KEYS[provider][tier];
      const id = process.env[envKey];
      if (!id) {
        throw new Error(
          `Missing env var ${envKey}. Set it to the current ${provider} ${tier} model ID. Verify the ID against the provider's models page before running.`,
        );
      }
      out.push({ provider, tier, id, pricing: PRICING[provider][tier] });
    }
  }
  return out;
}

export function loadModel(provider: ProviderId, tier: ModelTier): ModelSpec {
  const envKey = ENV_KEYS[provider][tier];
  const id = process.env[envKey];
  if (!id) throw new Error(`Missing env var ${envKey}`);
  return { provider, tier, id, pricing: PRICING[provider][tier] };
}

export function costUsd(model: ModelSpec, input: number, output: number): number {
  return (input / 1_000_000) * model.pricing.inputPerM + (output / 1_000_000) * model.pricing.outputPerM;
}
