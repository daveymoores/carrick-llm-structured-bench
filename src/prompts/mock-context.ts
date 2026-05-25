// Synthetic application log used by P2/P3 to add realistic cognitive load. Roughly
// 3-4k tokens of mixed structured + free-text log entries. Inert: no real data.

export const MOCK_CONTEXT = `
2026-04-02T08:14:21.013Z [INFO ] [api.gateway] request_id=req_5f3b method=POST path=/v2/sessions status=201 duration_ms=42
2026-04-02T08:14:21.018Z [INFO ] [auth.middleware] tenant=acme-corp user=u_8821 token_age_s=512 scopes=["sessions:write","analytics:read"]
2026-04-02T08:14:21.024Z [DEBUG] [db.pool] acquire wait_ms=0 active=12 idle=4 pool=primary
2026-04-02T08:14:21.061Z [INFO ] [sessions.create] session_id=sess_9aac plan=enterprise region=eu-west-2 idle_timeout_s=3600
2026-04-02T08:14:21.062Z [INFO ] [audit] actor=u_8821 action=session.create resource=sess_9aac result=ok ip=10.4.18.221

2026-04-02T08:14:22.310Z [INFO ] [api.gateway] request_id=req_5f3c method=GET path=/v2/dashboards/clicks status=200 duration_ms=88
2026-04-02T08:14:22.315Z [DEBUG] [cache.redis] op=GET key=dash:clicks:acme-corp:7d hit=true ttl_remaining_s=243
2026-04-02T08:14:22.392Z [INFO ] [billing.meter] tenant=acme-corp event=dashboard.view count=1 metered_at=2026-04-02T08:14:22Z

2026-04-02T08:14:25.001Z [WARN ] [worker.queue] queue=ingest depth=18421 threshold=15000 lag_p95_s=12.4
2026-04-02T08:14:25.044Z [INFO ] [worker.queue] autoscale.signal scale_factor=1.5 desired_replicas=9 current_replicas=6
2026-04-02T08:14:26.117Z [INFO ] [ingest.batch] batch_id=batch_24a17 size=540 source=segment shard=shard-3
2026-04-02T08:14:26.612Z [INFO ] [ingest.batch] batch_id=batch_24a17 stage=parse ok=540 fail=0 duration_ms=495

2026-04-02T08:14:31.802Z [ERROR] [parser.json] batch_id=batch_24a17 row=87 reason="unexpected token at position 412"
2026-04-02T08:14:31.803Z [ERROR] [parser.json] batch_id=batch_24a17 row=88 reason="unterminated string at position 0"
2026-04-02T08:14:31.811Z [WARN ] [ingest.batch] batch_id=batch_24a17 stage=parse degraded=2 promoted_to_dlq=true dlq=dlq.ingest.parse-errors

2026-04-02T08:14:33.402Z [INFO ] [api.gateway] request_id=req_5f3d method=POST path=/v2/webhooks/deliveries status=202 duration_ms=12
2026-04-02T08:14:33.405Z [DEBUG] [webhooks.delivery] hook_id=hk_aa19 url=https://hooks.example.test/notify event=ingest.completed attempt=1
2026-04-02T08:14:33.519Z [WARN ] [webhooks.delivery] hook_id=hk_aa19 status=502 latency_ms=114 retry_in_s=8

2026-04-02T08:14:39.300Z [INFO ] [agents.scheduler] tenant=acme-corp agent_id=agent-llm-summariser run_id=run_30aa eta_s=11
2026-04-02T08:14:39.811Z [INFO ] [agents.llm] run_id=run_30aa provider=openai model=gpt-flagship prompt_tokens=2138 completion_tokens=412 cost_usd=0.013
2026-04-02T08:14:40.122Z [WARN ] [agents.llm] run_id=run_30aa structured_output.parse_failed attempt=1 reason="JSON terminated early at depth 4"
2026-04-02T08:14:40.802Z [INFO ] [agents.llm] run_id=run_30aa structured_output.parse_recovered attempt=2 strategy=extract_from_code_block ok=true
2026-04-02T08:14:40.803Z [INFO ] [agents.llm] run_id=run_30aa result=summary outputs=1 stored_at=s3://carrick-prod-eu/summaries/run_30aa.json

2026-04-02T08:14:46.119Z [INFO ] [api.gateway] request_id=req_5f3e method=GET path=/v2/sessions/sess_9aac/metrics status=200 duration_ms=22
2026-04-02T08:14:46.121Z [DEBUG] [metrics.aggregator] window=5m page_views=88 clicks=33 errors=1
2026-04-02T08:14:46.198Z [INFO ] [notifications.email] to=ops@acme.test subject="Daily digest" template=digest-v3 attachments=0
2026-04-02T08:14:46.812Z [INFO ] [notifications.sms] to=+15551230099 message_len=82 provider=twilio cost_usd=0.0075

2026-04-02T08:14:52.011Z [INFO ] [observability.trace] trace_id=trc_77b1 root_span=POST_/v2/sessions latency_ms=98 spans=14
2026-04-02T08:14:52.013Z [DEBUG] [observability.trace] trace_id=trc_77b1 span=auth.middleware latency_ms=6 child_of=root
2026-04-02T08:14:52.014Z [DEBUG] [observability.trace] trace_id=trc_77b1 span=db.pool.acquire latency_ms=2 child_of=root
2026-04-02T08:14:52.015Z [DEBUG] [observability.trace] trace_id=trc_77b1 span=sessions.create latency_ms=44 child_of=root

2026-04-02T08:14:58.601Z [ERROR] [agents.scheduler] tenant=globex-inc agent_id=agent-llm-extractor run_id=run_31ba reason="provider returned validator_disagreement" provider=gemini model=gemini-flagship
2026-04-02T08:14:58.604Z [INFO ] [agents.scheduler] tenant=globex-inc agent_id=agent-llm-extractor run_id=run_31ba retry_in_s=30 retries_remaining=2
2026-04-02T08:14:58.611Z [WARN ] [agents.alerts] tenant=globex-inc severity=warn channel=webhook url=https://hooks.globex.test/alerts kind=structured_output.disagreement

2026-04-02T08:15:01.000Z [INFO ] [api.gateway] request_id=req_5f3f method=POST path=/v2/projects/p_771/datasets status=201 duration_ms=51
2026-04-02T08:15:01.005Z [INFO ] [storage.s3] op=PutObject bucket=carrick-prod-eu key=datasets/p_771/d_aabb size_bytes=58219 sse=aws:kms
2026-04-02T08:15:01.092Z [DEBUG] [iam.evaluate] principal=u_8821 action=s3:PutObject resource=arn:aws:s3:::carrick-prod-eu/* decision=Allow

2026-04-02T08:15:09.221Z [WARN ] [rate.limit] tenant=globex-inc bucket=api.gateway tokens_remaining=12 burst=100 refill_per_s=10
2026-04-02T08:15:09.881Z [INFO ] [api.gateway] request_id=req_5f40 method=GET path=/v2/events status=429 duration_ms=2 retry_after_s=3

2026-04-02T08:15:14.001Z [INFO ] [scheduler.cron] job=daily.digest tenant=acme-corp window=2026-04-01T00:00:00Z..2026-04-01T23:59:59Z entries_collected=421
2026-04-02T08:15:14.612Z [DEBUG] [scheduler.cron] job=daily.digest stage=render template_id=digest-v3 partials=12 bytes=8128
2026-04-02T08:15:15.001Z [INFO ] [scheduler.cron] job=daily.digest dispatch.queued=2 channels=["email","slack-webhook"]

2026-04-02T08:15:21.119Z [ERROR] [payments.stripe] event=invoice.payment_failed customer=cus_acme reason="card_declined" code=card_declined amount_usd=512.40
2026-04-02T08:15:21.121Z [INFO ] [billing.dunning] tenant=acme-corp stage=notify cycle_no=1 next_attempt_in_h=24
2026-04-02T08:15:21.402Z [INFO ] [notifications.email] to=billing@acme.test subject="Payment failed" template=dunning-v1 attachments=1

2026-04-02T08:15:31.221Z [INFO ] [api.gateway] request_id=req_5f41 method=PUT path=/v2/users/u_8821/preferences status=200 duration_ms=14
2026-04-02T08:15:31.224Z [DEBUG] [users.prefs] user=u_8821 changed=["theme","timezone","digest_hour"]

2026-04-02T08:15:38.001Z [INFO ] [search.indexer] index=projects docs_added=14 docs_updated=2 docs_removed=0 duration_ms=412
2026-04-02T08:15:38.422Z [INFO ] [search.indexer] index=events docs_added=540 docs_updated=0 docs_removed=0 duration_ms=2118
2026-04-02T08:15:38.501Z [WARN ] [search.indexer] backpressure index=traces queue_depth=44012 oldest_age_s=181

2026-04-02T08:15:51.301Z [INFO ] [agents.llm] run_id=run_30ab provider=anthropic model=claude-flagship prompt_tokens=4218 completion_tokens=812 cost_usd=0.092
2026-04-02T08:15:51.402Z [WARN ] [agents.llm] run_id=run_30ab structured_output.tool_choice_skipped attempt=1 raw_response_chars=2018
2026-04-02T08:15:52.001Z [INFO ] [agents.llm] run_id=run_30ab structured_output.recovered attempt=2 strategy=force_tool ok=true

2026-04-02T08:16:01.022Z [INFO ] [api.gateway] request_id=req_5f42 method=DELETE path=/v2/projects/p_771/datasets/d_aabb status=204 duration_ms=18
2026-04-02T08:16:01.024Z [INFO ] [audit] actor=u_8821 action=dataset.delete resource=d_aabb result=ok ip=10.4.18.221
2026-04-02T08:16:01.061Z [INFO ] [storage.s3] op=DeleteObject bucket=carrick-prod-eu key=datasets/p_771/d_aabb deleted_marker=true

2026-04-02T08:16:09.401Z [INFO ] [feature.flags] tenant=acme-corp flag=new_dashboard variant=on rollout=18%
2026-04-02T08:16:09.402Z [DEBUG] [feature.flags] tenant=globex-inc flag=new_dashboard variant=off rollout=82%

2026-04-02T08:16:18.001Z [INFO ] [api.gateway] request_id=req_5f43 method=POST path=/v2/agents/runs status=202 duration_ms=8
2026-04-02T08:16:18.005Z [INFO ] [agents.scheduler] tenant=acme-corp agent_id=agent-llm-classifier run_id=run_30ac queued=true position=4
2026-04-02T08:16:18.512Z [INFO ] [agents.llm] run_id=run_30ac provider=gemini model=gemini-cheap prompt_tokens=981 completion_tokens=121 cost_usd=0.0009
2026-04-02T08:16:18.612Z [INFO ] [agents.llm] run_id=run_30ac result=classification confidence=0.81 categories=["billing","support"]

2026-04-02T08:16:31.022Z [WARN ] [observability.collector] tenant=acme-corp drop_rate=0.4% sampling=adaptive
2026-04-02T08:16:31.401Z [INFO ] [observability.collector] tenant=acme-corp emitted_spans=44012 emitted_bytes=14.8MB

2026-04-02T08:16:42.001Z [INFO ] [api.gateway] request_id=req_5f44 method=POST path=/v2/notifications/test status=200 duration_ms=22
2026-04-02T08:16:42.004Z [INFO ] [notifications.webhook] hook_id=hk_aa20 url=https://hooks.example.test/notify event=test attempt=1 result=ok

2026-04-02T08:16:51.001Z [INFO ] [scheduler.cron] job=weekly.cleanup status=started window=last_7d targets=["dlq.ingest.parse-errors","dlq.webhooks.failed"]
2026-04-02T08:16:51.121Z [INFO ] [scheduler.cron] job=weekly.cleanup queue=dlq.ingest.parse-errors items_inspected=412 items_removed=312 items_returned=100
2026-04-02T08:16:51.881Z [INFO ] [scheduler.cron] job=weekly.cleanup queue=dlq.webhooks.failed items_inspected=88 items_removed=44 items_returned=44
`.trim();
