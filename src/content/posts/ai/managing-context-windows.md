---
title: "Managing Context Windows: Chunking, Summarization, and Memory"
slug: "managing-context-windows"
description: "Practical strategies for fitting long conversations and large documents into a context window without losing what actually matters."
publishedAt: "2026-06-23"
updatedAt: "2026-09-16"
category: "AI"
tags:
  - AI
  - LLMs
  - RAG
  - Context Windows
---

Large context windows solved the wrong problem. Even with a million tokens available, dumping everything into the prompt degrades quality — models attend unevenly across long context, relevant details get lost in the middle, and every extra token costs latency and money. Context management is still a real engineering discipline, not something a bigger window makes obsolete.

## Long context isn't free retrieval

It's tempting to skip building a retrieval system and just pass the whole document set into a large context window. This works until it doesn't: cost scales linearly with tokens sent on every single call, latency grows with input length, and empirically models are less reliable at pulling out a specific fact buried in the middle of a huge context than a targeted retrieval of the top three relevant chunks would be. Long context is best used for cases where the model genuinely needs to reason *across* the whole document — synthesis, comparison, holistic review — not as a substitute for retrieving the right five paragraphs.

## Conversation memory needs a policy, not just a buffer

The naive approach — append every turn to the context and truncate from the oldest when you hit the limit — throws away information in an arbitrary order, often losing the user's original goal from early in the conversation while keeping recent small talk. A better structure separates memory into tiers:

```python
class ConversationMemory:
    def __init__(self):
        self.pinned = []       # goal, key facts stated once, never dropped
        self.recent = []       # last N turns, verbatim
        self.summary = None    # rolling summary of everything older than `recent`

    def build_context(self):
        parts = [f"Key facts: {self.pinned}"]
        if self.summary:
            parts.append(f"Earlier in this conversation: {self.summary}")
        parts.append(f"Recent turns: {self.recent}")
        return "\n\n".join(parts)
```

When `recent` exceeds a threshold, summarize the oldest chunk of it into `summary` rather than dropping it outright, and keep pinned facts (stated preferences, the original request, IDs referenced) out of the compaction entirely.

## Summarization is lossy — decide what you're willing to lose

Rolling summarization trades completeness for length, and the failure mode is subtle: a summary written without knowing what will matter later can drop a detail the user references three turns after it was summarized away. Two mitigations help. First, summarize with an explicit instruction to preserve specifics (numbers, names, IDs, decisions made) over narrative flow — "the user asked about pricing" is worse than "the user asked about the $49/mo Pro tier specifically." Second, keep the raw turns available in storage even after they're summarized out of the active context, so a tool call can retrieve the verbatim exchange if the summary turns out to have dropped something load-bearing.

## Position matters as much as content

Models attend more reliably to information near the start and end of the context than content buried in the middle — the "lost in the middle" effect holds across most current model families to varying degrees. When you control the ordering, put the highest-priority information (the actual user question, critical constraints) at the very start or very end of the prompt, and treat the middle of a long context as the place to put supporting material the model doesn't strictly need to answer correctly.

## A rough decision guide

| Situation | Approach |
|---|---|
| Answering from a large, mostly-static corpus | RAG — retrieve, don't stuff |
| Long-running conversation with a human | Tiered memory: pinned facts + recent turns + rolling summary |
| Synthesizing or comparing across a whole document | Long context, deliberately, for that one call |
| Multi-step agent task | Structured scratchpad the agent writes to, not raw transcript replay |

The common thread is that context budget is a resource to allocate deliberately, the same way you'd think about memory or bandwidth in any other system — not a pool to fill until it overflows.

## A worked failure mode

A coding assistant stuffs the last 40 files into context "so the model has everything." The relevant test is in file 41. Summarization memory then compresses the conversation into a paragraph that drops the constraint "do not migrate the database." The next turn proposes a migration. A sliding window that kept the system contract and the last tool results would have been safer than a lossy summary. The failure is treating the window as a junk drawer. Reserve tokens for the policy, the retrieved snippets with citations, and the latest tool output; summarize only the middle of the chat, and verify summaries against a checklist of invariants.

## When this is the wrong tool

If the task fits in a few thousand tokens, skip memory machinery. Infinite-context marketing is the wrong reason to stop retrieving: attention still dilutes, and cost still scales. Do not summarize legal or numeric tables into prose. Do not use conversation memory as a substitute for a database of user preferences you can edit. Chunk-and-retrieve beats stuffing when the corpus is large; stuffing beats retrieval when the artifact is one small spec the user just pasted. Pick the cheap thing that preserves the constraints that would make a wrong answer expensive.
