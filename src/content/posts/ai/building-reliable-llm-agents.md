---
title: "Building Reliable LLM Agents: Planning, Tools, and Recovery"
slug: "building-reliable-llm-agents"
description: "Why most agent failures are engineering problems, not model problems, and the planning, tool design, and recovery patterns that fix them."
publishedAt: "2026-06-11"
updatedAt: "2026-09-16"
category: "AI"
tags:
  - AI
  - Agents
  - LLMs
  - Tool Calling
trending: true
---

An agent that works in a demo and an agent that survives a week of production traffic are built differently. The demo optimizes for the happy path — the model plans correctly, tools return clean data, nothing times out. Production agents spend most of their engineering budget on the unhappy path: what happens when a tool call fails, when the plan was wrong, when the model gets stuck in a loop calling the same tool with slightly different arguments hoping for a different result.

## Plans should be explicit and inspectable

The biggest reliability win in agent design isn't a smarter model, it's making the plan a first-class artifact instead of something implicit in the model's token stream. Have the agent emit a structured plan before executing anything — a list of steps with the tool it intends to call and why — and log it separately from execution. This does two things: it lets you catch bad plans before they cause side effects, and it gives you a debugging trail when something goes wrong three tool calls later.

```json
{
  "goal": "Refund order #48213 and notify customer",
  "steps": [
    {"tool": "lookup_order", "args": {"order_id": "48213"}, "why": "confirm order exists and is refundable"},
    {"tool": "issue_refund", "args": {"order_id": "48213"}, "why": "execute refund per policy"},
    {"tool": "send_email", "args": {"template": "refund_confirmation"}, "why": "notify customer"}
  ]
}
```

## Tools should fail loudly and specifically

A tool that returns a generic error string ("something went wrong") gives the model nothing to reason about, so it either gives up or hallucinates a retry strategy. Design tool responses so failures are structured and informative: what failed, why, and whether retrying makes sense.

```python
def issue_refund(order_id: str) -> dict:
    order = get_order(order_id)
    if order is None:
        return {"ok": False, "error": "order_not_found", "retryable": False}
    if order.status == "already_refunded":
        return {"ok": False, "error": "already_refunded", "retryable": False}
    if not payment_gateway.is_available():
        return {"ok": False, "error": "gateway_unavailable", "retryable": True}
    return {"ok": True, "refund_id": process_refund(order)}
```

The `retryable` flag alone eliminates a huge class of agent loops where the model keeps hammering a permanently failed call.

## Bound the loop, don't just hope it converges

Every agent needs a hard ceiling: max tool calls, max wall-clock time, max cost per task. Without one, a model that gets into an uncertain state will happily spend an unbounded number of turns "double-checking" itself. When the ceiling is hit, don't just kill the task silently — return partial progress and a clear reason, so the caller (human or upstream system) can decide whether to retry with a narrower goal.

## Recovery is a design decision, not an afterthought

Three recovery strategies cover most failure modes:

- **Retry with backoff** for transient tool failures (network errors, rate limits) — cheap and usually sufficient.
- **Replan** when a step's result contradicts an assumption the plan was built on — feed the new information back and let the model regenerate remaining steps rather than forcing it to continue a plan built on stale facts.
- **Escalate to a human** when the agent has exhausted retries and replans, or when the action is irreversible and confidence is low (refunds, deletions, external communications). Cheap actions can be fully autonomous; irreversible ones need a checkpoint.

## Separate what the agent decides from what it's allowed to do

The model should never be the only thing standing between a bad decision and an irreversible side effect. Enforce hard policy outside the model — allowed tool arguments, spending limits, rate limits per user — in code the model can't talk its way around. Agents are reliable not because the model rarely makes mistakes, but because the system around it is built assuming it will.

## A worked failure mode

A support agent is wired to `lookup_order`, `issue_refund`, and `send_email`. On a 504 from `lookup_order` it replans, treats a prior chat snippet as proof the order is refundable, and calls `issue_refund` twice because the first call timed out after the payment provider had already succeeded. Traces look healthy: the loop is under the 40-call ceiling, tokens are cheap, and the model is "trying." Money is not. The failure is missing correlation: refunds must be keyed by `order_id` with an idempotency store, and irreversible tools must require a fresh `lookup_order` result in the same turn with `refundable: true`. A human checkpoint on refunds above a small dollar threshold would have stopped the second send. The model did not invent a new class of bug; it automated a missing distributed-systems control.

## When this is the wrong tool

If the workflow is a known DAG of payment steps, a workflow engine with retries and a state machine is cheaper, auditable, and easier to test than an agent loop. If the job is one function with a JSON schema, use tool calling without a planner. Do not put an open-ended agent on a legally deterministic path (tax filing, medical dosing, court filings). Agents are the wrong first tool for "browse until you find a cheaper vendor" without a spend cap, and the wrong tool when the organization cannot staff on-call for tool outages. Start with retrieval plus a single tool; graduate to an agent only when the plan truly branches at runtime.
