---
title: "Structured Outputs from LLMs: JSON Schemas and Validation"
slug: "structured-outputs-from-llms"
description: "How to reliably get valid, typed JSON out of an LLM in production, from schema-constrained decoding to validation and repair strategies."
publishedAt: "2026-06-29"
updatedAt: "2026-09-16"
category: "AI"
tags:
  - AI
  - LLMs
  - JSON Schema
  - Prompt Engineering
trending: true
---

Getting an LLM to produce valid JSON used to mean prompt-begging ("respond only with valid JSON, no other text") and a regex to strip markdown fences off the response. That approach still fails a meaningful percentage of the time in production â€” enough to need a fallback path. The better answer is a layered approach: constrain generation where you can, validate what comes out, and have a defined repair strategy for the rest.

## Constrained decoding beats prompting alone

Most current model providers support schema-constrained generation, where the model's output is restricted at the token level to only produce sequences matching a JSON schema â€” this isn't the model "trying harder" to follow instructions, it's the decoding process itself excluding invalid tokens. When available, use it; it eliminates the entire class of "almost valid JSON" failures that prompting-only approaches still produce.

```python
from pydantic import BaseModel

class TicketClassification(BaseModel):
    category: str
    priority: int  # 1-5
    requires_human_review: bool

response = client.messages.create(
    model="your-model-id",
    max_tokens=200,
    tools=[{
        "name": "classify_ticket",
        "input_schema": TicketClassification.model_json_schema(),
    }],
    tool_choice={"type": "tool", "name": "classify_ticket"},
    messages=[{"role": "user", "content": ticket_text}],
)
```

Routing structured extraction through a tool call rather than free-text generation is the most reliable pattern available today â€” the model is generating a function call, not prose it hopes looks like JSON.

## Schema design affects reliability, not just correctness

A schema that's technically valid can still be hard for a model to fill in reliably. Enums are more reliable than free-text fields when the set of valid values is known â€” the model picks from a closed set instead of generating a string that has to match exactly. Keep required fields minimal; every required field is a chance for the model to have nothing sensible to put there and either fail generation or hallucinate a value. Nested structures should mirror how a person would naturally describe the data â€” a schema that fights the model's natural way of organizing an answer produces worse fill rates than one that goes with the grain.

```json
{
  "type": "object",
  "properties": {
    "category": {"type": "string", "enum": ["billing", "bug", "feature_request", "other"]},
    "priority": {"type": "integer", "minimum": 1, "maximum": 5},
    "requires_human_review": {"type": "boolean"}
  },
  "required": ["category", "priority", "requires_human_review"]
}
```

## Validate even when generation is constrained

Constrained decoding guarantees schema-shaped output, not semantically correct output. A `priority` field can be a valid integer between 1 and 5 and still be the wrong priority for the ticket. Run the output through your normal application-level validation â€” range checks, cross-field consistency, business logic â€” the same as you would for any external input, because that's what it is.

## Have a repair path, not just a retry

When validation fails, three escalating strategies:

1. **Reprompt with the error**: send the invalid output and the specific validation error back to the model and ask it to fix just that field. Cheap and usually works for minor issues.
2. **Retry with lower temperature or a stronger model**: if reprompting fails repeatedly, the task might be genuinely hard for the current configuration.
3. **Fall back to a safe default and flag for review**: for cases where retries aren't worth the latency cost, degrade gracefully â€” a low-confidence default plus a human-review flag beats a hung request or a crash.

Log every validation failure with the input and the malformed output. These logs are the highest-signal source for improving your schema and prompt â€” a field that fails validation repeatedly usually means the schema is asking for something the model doesn't have enough information to reliably produce, which is a design problem, not a model problem.

## A worked failure mode

A pipeline asks for JSON in the prompt and `json.loads` the reply. One in 40 responses wraps the object in markdown fences or drops a comma after a long string. The job retries the entire 8k-token prompt, doubling cost, and a "repair" prompt sometimes invents a field that was never in the source. Schema-constrained decoding would have forbidden the fence. Validation should fail closed: missing required fields retry with the schema error only, not a free-form rewrite. The failure is treating JSON as a vibe. Constrain generation, validate with the same schema, and repair only by filling missing keys from the source text, not by letting the model invent values.

## When this is the wrong tool

Constrained decoding is the wrong tool if you need unconstrained prose. A JSON schema will not make facts true; it only makes types parse. Do not schema-wrap a task that is a single enum classification. If the provider has no constrained API, a grammar-based parser with a small retry budget beats an unbounded chat. Avoid nested schemas so deep the model collapses into empty arrays. Structured output is for boundaries between models and code, not for replacing your database types with whatever keys the model felt like today.
