---
title: "Tool Calling Design Patterns for LLM Applications"
slug: "tool-calling-design-patterns"
description: "Practical patterns for designing tool schemas and interfaces that models call reliably, from naming conventions to error surface design."
publishedAt: "2026-07-26"
category: "AI"
tags:
  - AI
  - Agents
  - Tool Calling
  - LLMs
---

Tool calling reliability is mostly a schema and interface design problem, not a model capability problem. Two tools that expose the same underlying functionality with different naming, argument structure, and error handling can have very different call-accuracy rates. The model isn't reading your code — it's reasoning from the tool's name, description, and parameter schema, so those need the same design attention you'd give a public API.

## Name and describe tools like documentation for a stranger

A tool named `process` with a description of "processes the request" gives the model nothing to disambiguate it from other tools. Name tools as verbs describing exactly what they do, and write descriptions that state preconditions and side effects explicitly — not just what the tool returns, but when it should and shouldn't be called.

```json
{
  "name": "cancel_subscription",
  "description": "Cancels an active subscription immediately. Does not issue a refund — call issue_refund separately if a refund is owed. Fails if the subscription is already canceled or in a trial period without payment method.",
  "input_schema": {
    "type": "object",
    "properties": {
      "subscription_id": {"type": "string", "description": "The subscription ID, formatted like sub_XXXXXXXX"},
      "reason": {"type": "string", "enum": ["user_requested", "non_payment", "fraud"]}
    },
    "required": ["subscription_id", "reason"]
  }
}
```

The description doing real work here — "does not issue a refund" — prevents a whole class of the model assuming a side effect that doesn't exist.

## Keep the tool surface small and non-overlapping

Every additional tool increases the chance the model picks the wrong one when two tools have similar purposes. A `search_users` and a `find_users` that do nearly the same thing with slightly different arguments is a design bug, not a minor redundancy — it forces the model to guess which one is canonical. Consolidate overlapping tools, and when you genuinely need similar-but-distinct operations, make the distinction sharp in both naming and description rather than subtle.

## Design arguments the model can fill in from context it actually has

A tool that requires an internal database ID the model was never given forces it to either fail or hallucinate a plausible-looking ID. Arguments should be things the model can derive from the conversation, prior tool results, or values you've explicitly provided — not internal implementation details. If a tool genuinely needs an internal ID, have an earlier tool call (like a lookup) return it, so the model is chaining real values forward rather than inventing them.

## Error responses are part of the interface, not an afterthought

A generic error string forces the model to guess at recovery. Structure tool errors so they carry enough information for the model to decide what to do next without another round trip guessing blindly.

```python
def cancel_subscription(subscription_id: str, reason: str) -> dict:
    sub = get_subscription(subscription_id)
    if sub is None:
        return {"ok": False, "error": "not_found", "message": f"No subscription with id {subscription_id}"}
    if sub.status == "canceled":
        return {"ok": False, "error": "already_canceled", "canceled_at": sub.canceled_at}
    return {"ok": True, "canceled_at": cancel(sub)}
```

An `already_canceled` error with a timestamp lets the model report accurate status back to the user instead of retrying or apologizing vaguely.

## Parallel vs. sequential calls need explicit handling

Models that support calling multiple tools in a single turn will sometimes issue calls that are actually dependent on each other's results, if your tool descriptions don't make the dependency clear. If tool B needs tool A's output, say so in the description, or better, design the interface so B literally cannot be called without a value only A can produce — making the dependency structural rather than something the model has to infer from prose.

## Test tool selection accuracy as its own metric

Separately from whether the final answer was correct, log and periodically review whether the model chose the right tool for a given request, independent of whether it filled in the arguments correctly. These are different failure modes with different fixes — wrong tool selection usually means naming or description ambiguity; correct tool with wrong arguments usually means the schema or the model's access to the needed values is the problem.
