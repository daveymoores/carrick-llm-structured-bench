# Bench report (pilot, 2026-05-24)

Total runs: 260

**Pilot verdict (auto-suggestion only; review before deciding)**: GREEN

- S3 adherence gap across providers: 100.0pp
- S5 adherence gap across providers: 100.0pp

Green = proceed to full run. Yellow = pivot article to signposting-led; consider reduced full run. Red = stop and reconsider thesis.

## Outcome rates by provider × model

| Provider / Model | n | Strict | Silent fail | Loud useful | Loud useless | Pre-call rej | No tool | Validator disagree |
|---|---|---|---|---|---|---|---|---|
| anthropic/cheap (claude-sonnet-4-6) | 70 | 71.4% | 28.6% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% |
| anthropic/flagship (claude-opus-4-7) | 70 | 90.0% | 10.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% |
| gemini/flagship (gemini-3.1-pro-preview) | 40 | 75.0% | 0.0% | 0.0% | 0.0% | 25.0% | 0.0% | 0.0% |
| openai/cheap (gpt-5.4-mini) | 40 | 25.0% | 0.0% | 0.0% | 0.0% | 75.0% | 0.0% | 0.0% |
| openai/flagship (gpt-5.5) | 40 | 25.0% | 0.0% | 0.0% | 0.0% | 75.0% | 0.0% | 0.0% |

## Outcome rates by provider × schema

| Provider × Schema | n | Strict | Silent fail | Loud useful | Loud useless | Pre-call rej |
|---|---|---|---|---|---|---|
| anthropic × S1 | 10 | 100.0% | 0.0% | 0.0% | 0.0% | 0.0% |
| anthropic × S2 | 10 | 100.0% | 0.0% | 0.0% | 0.0% | 0.0% |
| anthropic × S3 | 40 | 32.5% | 67.5% | 0.0% | 0.0% | 0.0% |
| anthropic × S4 | 10 | 100.0% | 0.0% | 0.0% | 0.0% | 0.0% |
| anthropic × S5 | 10 | 100.0% | 0.0% | 0.0% | 0.0% | 0.0% |
| anthropic × S6 | 10 | 100.0% | 0.0% | 0.0% | 0.0% | 0.0% |
| anthropic × S7 | 40 | 100.0% | 0.0% | 0.0% | 0.0% | 0.0% |
| anthropic × S8 | 10 | 100.0% | 0.0% | 0.0% | 0.0% | 0.0% |
| gemini × S1 | 5 | 100.0% | 0.0% | 0.0% | 0.0% | 0.0% |
| gemini × S2 | 5 | 100.0% | 0.0% | 0.0% | 0.0% | 0.0% |
| gemini × S3 | 5 | 100.0% | 0.0% | 0.0% | 0.0% | 0.0% |
| gemini × S4 | 5 | 100.0% | 0.0% | 0.0% | 0.0% | 0.0% |
| gemini × S5 | 5 | 0.0% | 0.0% | 0.0% | 0.0% | 100.0% |
| gemini × S6 | 5 | 0.0% | 0.0% | 0.0% | 0.0% | 100.0% |
| gemini × S7 | 5 | 100.0% | 0.0% | 0.0% | 0.0% | 0.0% |
| gemini × S8 | 5 | 100.0% | 0.0% | 0.0% | 0.0% | 0.0% |
| openai × S1 | 10 | 100.0% | 0.0% | 0.0% | 0.0% | 0.0% |
| openai × S2 | 10 | 0.0% | 0.0% | 0.0% | 0.0% | 100.0% |
| openai × S3 | 10 | 0.0% | 0.0% | 0.0% | 0.0% | 100.0% |
| openai × S4 | 10 | 0.0% | 0.0% | 0.0% | 0.0% | 100.0% |
| openai × S5 | 10 | 0.0% | 0.0% | 0.0% | 0.0% | 100.0% |
| openai × S6 | 10 | 0.0% | 0.0% | 0.0% | 0.0% | 100.0% |
| openai × S7 | 10 | 0.0% | 0.0% | 0.0% | 0.0% | 100.0% |
| openai × S8 | 10 | 100.0% | 0.0% | 0.0% | 0.0% | 0.0% |

## Signposting quality (auto-scored; calibrate before quoting)

| Provider | n errors scored | Mean signposting score (0-3) |
|---|---|---|
| anthropic | 27 | 0.59 |
| gemini | 10 | 2.50 |
| openai | 60 | 1.83 |

## Cost and latency

| Provider | Calls | Total cost USD | Latency p50 ms | Latency p95 ms |
|---|---|---|---|---|
| anthropic | 140 | $5.92 | 8444 | 61019 |
| gemini | 40 | $0.22 | 13231 | 35060 |
| openai | 80 | $0.08 | 0 | 9180 |
