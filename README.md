# carrick-llm-structured-bench

A reproducible benchmark of how OpenAI, Anthropic, and Google Gemini behave when asked for structured JSON output.

Writeup: [Benchmarking LLM Structured Outputs](https://carrick.tools/blog/benchmarking-llm-structured-outputs).

Built to back the writeup after hitting the failure modes head-on while building [Carrick](https://carrick.tools). The bench is gated by a cheap (~$1) pilot before any full run, so you can verify divergence exists before spending real tokens.

## What it measures

For each (provider, model, schema, prompt) cell, every call lands in exactly one outcome bucket:

1. **Strict adherence** — parses + both validators agree.
2. **Silent failure** — parses, both validators agree it does not conform. The dangerous metric.
3. **Validator disagreement** — ajv and hyperjump disagree; logged, not a model finding.
4. **Loud failure, useful** — error names the offending field.
5. **Loud failure, useless** — generic error.
6. **Pre-call schema rejected** — adapter rejected the schema before sending. Applied symmetrically across all three providers.
7. **No tool call** (Anthropic only) — model text-responded despite forced tool_choice.

Plus per-cell latency p50/p95, tokens, USD cost.

## Quickstart

```bash
git clone <repo-url> carrick-llm-structured-bench
cd carrick-llm-structured-bench
npm install
cp .env.example .env
# fill in API keys + verify current model IDs from each provider's docs
npm run smoke       # one call per provider on S1+P1
npm run pilot       # 45 calls, ~$1, writes results/pilot/<date>/SUMMARY.md
# review SUMMARY.md; only if green/yellow:
npm run full        # 4,320 calls, ~$105-180
npm run report      # builds markdown tables from JSONL
```

## Methodology

See `METHODOLOGY.md` for the schema corpus, prompt design, bucketing rules, and statistical caveats (30 runs/cell supports claims at the provider × model and provider × schema aggregate level only).

## License

MIT. Copyright (c) 2026 Far Harbour B.V. See `LICENSE`.
