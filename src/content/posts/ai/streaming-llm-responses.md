---
title: "Streaming LLM Responses: UX and Backend Plumbing"
slug: "streaming-llm-responses"
description: "How to implement LLM response streaming end to end, from server-sent events to handling structured output and mid-stream tool calls."
publishedAt: "2026-08-03"
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
