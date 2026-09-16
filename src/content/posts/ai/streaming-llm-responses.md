---
title: "Streaming LLM Responses: UX and Backend Plumbing"
slug: "streaming-llm-responses"
description: "How to implement LLM response streaming end to end, from server-sent events to handling structured output and mid-stream tool calls."
publishedAt: "2026-08-03"
updatedAt: "2026-09-16"
category: "AI"
tags:
  - AI
  - Streaming
  - LLMs
  - Backend
---

Streaming isn't optional polish for an LLM product — it's the difference between a response that feels instant and one that feels broken, because generation genuinely takes seconds for anything beyond a short answer, and a blank loading spinner for five seconds reads as a hang. But streaming touches more of the stack than people expect: the model call, the backend transport, and the frontend rendering all need to cooperate.

## Server-sent events are the default transport, and that's fine

WebSockets get suggested for streaming more often than they're actually needed. For the common case — server pushes tokens to the client, client doesn't need to push data back mid-stream — server-sent events (SSE) are simpler to implement, work through standard HTTP infrastructure without special proxy configuration, and reconnect automatically in most client implementations. Reach for WebSockets only when you genuinely need bidirectional communication mid-stream, like a voice interface or collaborative editing alongside the LLM output.

```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse

app = FastAPI()

@app.post("/chat")
async def chat(request: ChatRequest):
    async def event_stream():
        async for chunk in llm_client.stream(request.messages):
            yield f"data: {json.dumps({'delta': chunk.text})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
```

## Buffer at the right granularity, not token by token

Forwarding every individual token to the client the instant it arrives sounds ideal but creates unnecessary network overhead and, on the frontend, choppy rendering if tokens arrive at uneven intervals. A small server-side buffer — flush every N milliseconds or every complete word/sentence boundary rather than every token — smooths the perceived rendering without adding meaningful latency, since the buffering window is well under what a human notices as delay.

## Structured output and streaming are in tension

A JSON object isn't valid to parse until it's complete, which means naive streaming of structured output either shows the user raw, half-formed JSON or forces you to wait for the full response and lose the benefit of streaming entirely. Two practical approaches: stream a natural-language explanation first and attach structured data at the end once complete, or use a streaming JSON parser on the client that can render partial, valid subsets of the structure as they arrive (e.g., showing list items as they complete rather than waiting for the whole array).

```typescript
// Partial JSON parsing pattern: render what's complete, ignore what isn't
function renderPartialResults(partialJson: string) {
  const completeItems = extractCompleteArrayItems(partialJson, "results");
  completeItems.forEach(renderResultCard);
}
```

## Tool calls mid-stream break the simple model

When a response involves a tool call partway through generation — the model streams some text, pauses to call a tool, then continues — your frontend needs distinct event types for text deltas, tool-call-started, tool-call-result, and continuation, rather than treating the whole thing as one undifferentiated text stream. Design the event schema up front to carry a `type` field, not just raw text chunks, so the frontend can render tool activity ("looking up your order...") distinctly from the model's prose.

```json
{"type": "text_delta", "text": "Let me check that for you."}
{"type": "tool_call_start", "tool": "lookup_order", "args": {"order_id": "48213"}}
{"type": "tool_call_result", "tool": "lookup_order", "result": {"status": "shipped"}}
{"type": "text_delta", "text": " Your order shipped yesterday."}
```

## Handle disconnection and cancellation explicitly

Users close tabs and click stop buttons mid-generation, and if the backend doesn't handle this, you keep paying for and generating tokens nobody will see. Wire client disconnection (SSE connection close) and an explicit stop action to actually cancel the upstream model call, not just stop forwarding data to a client that's no longer listening — otherwise your cost scales with abandoned requests, which on a chat-heavy product is a larger fraction of traffic than it sounds like.

## A worked failure mode

A UI streams tokens into a markdown renderer. Mid-stream the model emits a table; the renderer flashes broken layout, then the connection drops and the UI leaves a half-sentence that looks like a final answer. A client retries and starts a second stream; the user sees two overlapping drafts. The backend billed both. Cancellation was never wired to the provider request. The failure is treating a stream as a pretty print of a complete string. Buffer display units (sentences, code fences), mark incomplete state in the UI, propagate abort, and persist only when the stream completes or the user explicitly saves a partial.

## When this is the wrong tool

Streaming is the wrong tool for JSON that must parse, for batch jobs, and for answers shorter than a round-trip you would not notice. It complicates caching, moderation (you may need to delay flush until a sentence passes a filter), and billing transparency. Do not stream into a form field that users submit as if it were validated. If you must moderate, a short time-to-first-token wait with a complete-message check can be safer than token-by-token XSS in HTML. Use streaming where perceived latency matters and the contract is "draft in progress."
