# Handover: how to run the pilot

This is what's needed to take the bench from "scaffolded" to "pilot results in hand". Estimated wall time once you've gathered the inputs: 10 minutes setup, 5-10 minutes for the pilot to run.

## 1. Provide three API keys

| Provider | Env var | Where to get one |
|---|---|---|
| OpenAI | `OPENAI_API_KEY` | https://platform.openai.com/api-keys |
| Anthropic | `ANTHROPIC_API_KEY` | https://console.anthropic.com/settings/keys |
| Google Gemini | `GEMINI_API_KEY` | https://aistudio.google.com/apikey |

All three need a small amount of credit (~$5 each is plenty for pilot + full).

## 2. Resolve current model IDs

The plan file is explicit that training-data model knowledge is stale. Before running anything, open each provider's models page and copy the current IDs into `.env`:

| Env var | What to put | Reference |
|---|---|---|
| `MODEL_ID_OPENAI_FLAGSHIP` | Current top-tier OpenAI model (the one that supports `response_format: json_schema` strict) | https://platform.openai.com/docs/models |
| `MODEL_ID_OPENAI_CHEAP` | Current OpenAI mini/nano-tier | same |
| `MODEL_ID_ANTHROPIC_FLAGSHIP` | Current Opus-tier Claude | https://docs.anthropic.com/en/docs/about-claude/models |
| `MODEL_ID_ANTHROPIC_CHEAP` | Current Sonnet-tier Claude | same |
| `MODEL_ID_GEMINI_FLAGSHIP` | Current Gemini Pro | https://ai.google.dev/gemini-api/docs/models |
| `MODEL_ID_GEMINI_CHEAP` | Current Gemini Flash | same |

Only the `_CHEAP` rows are used for the pilot (the flagship rows can be left empty until full-run time).

## 3. Walk through the run

```bash
cd /Users/davidjonathanmoores/Repositories/carrick-llm-structured-bench

cp .env.example .env
# Fill in keys + the three _CHEAP model IDs (minimum) using your editor of choice.

npm install                  # already done; re-run if package.json changed
npm test                     # confirms validator + bucketing (13 tests, ~200ms)

npm run smoke                # 3 calls, ~$0.01. Sanity-check each adapter wired up.
npm run pilot                # 45 calls, ~$1, ~5-10 min wall clock.
npm run report               # Generates results/pilot/<date>/SUMMARY.md
```

`SUMMARY.md` will include an auto-suggested verdict (GREEN/YELLOW/RED) based on the divergence rule from the plan. **Read it, don't trust it.** The auto-verdict is a starting point; eyeball the per-cell numbers and the raw JSONL before deciding to spend on the full run.

## 4. What to send back

If you want me to drive the next step (run analysis, draft the article, etc.), share back:

- The contents of `results/pilot/<date>/SUMMARY.md`
- Any cells where you suspect adapter bugs (e.g. Anthropic showing 100% `no_tool_call` would point at my tool-use config)
- A go / no-go on the full run

If everything looks green and you just want to push the button:

```bash
npm run full                 # ~$100-180, ~1-2 hr wall clock. Resumable.
npm run report -- --phase=full
```

## 5. Things I've left for the next session

- The article draft itself (execution step 9; uses the `technical-writing-best-practices` skill).
- Pricing in `src/models.ts` is early-2026 ballpark; update if a provider has shifted.
- The signposting auto-classifier hasn't been calibrated against a human-rated sample. The plan requires kappa ≥ 0.7 against a 200-error stratified sample before its numbers go in the article.
- Git remote / GitHub repo creation. The local repo is initialized but has no remote.

## 6. Known sharp edges

- **OpenAI strict-mode pre-rejection** (`src/providers/openai.ts:findOpenAIStrictViolations`): this is symmetric with Gemini's pre-validator per the plan's fairness rule. It will fire on S5 (oneOf), S6 (type-arrays), S7 (S7's nested array items have no `additionalProperties: false`), and possibly S1 (its `properties` aren't all required). If you'd rather see what OpenAI *actually* does when sent these schemas (i.e. submit and let the API reject), comment out the pre-rejection block. The bench currently treats both pre-rejection and API-rejection as schema-compatibility findings.
- **Anthropic doesn't honour `seed`** — the bench passes temperature 0 but doesn't pin a seed for Anthropic or Gemini. Some run-to-run variance is expected and is the reason for n=30.
- **Cache-busting nonce** is injected as the first line of every prompt (`// run-id: <uuid>`). This intentionally defeats prompt caching so latency numbers reflect cold-cache behaviour. If you want cached-prompt numbers, remove the nonce and the cache will engage after run ~2.

## 7. File map

```
src/
  types.ts           # All shared types
  models.ts          # Env-var resolution + pricing
  validator.ts       # ajv + hyperjump dual validation
  bucketing.ts       # 7-bucket classifier
  signposting.ts     # 0-3 rubric auto-scorer (uncalibrated)
  runner.ts          # Pilot/full mode driver
  report.ts          # JSONL -> markdown tables
  smoke.ts           # 3-call sanity check
  providers/
    openai.ts        # response_format json_schema strict + pre-rejection
    anthropic.ts     # tool_use forced
    gemini.ts        # responseSchema + convertSchemaToGemini + pre-rejection
  schemas/           # S1-S8
  prompts/           # P1, P2 (P2 includes mock-context), P3
test/
  validator.test.ts  # 13 unit tests (passing)
```
