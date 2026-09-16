---
title: "ReAct: Interleave Thought, Tool Calls, and Observations in One Loop"
slug: "react-reasoning-and-acting"
description: "Yao et al. prompted language models to emit reasoning traces and actions together so agents could query APIs and update their plan. The loop, the eval traps, and why unbounded ReAct is not a control plane."
publishedAt: "2026-10-12"
category: "AI"
tags:
  - AI
  - Agents
  - Tool Use
  - Research
sources:
  - title: "ReAct: Synergizing Reasoning and Acting in Language Models"
    author: "Shunyu Yao, Jeffrey Zhao, Dian Yu, Nan Du, Izhak Shafran, Karthik Narasimhan, Yuan Cao"
    publisher: "ICLR 2023"
    url: "https://arxiv.org/abs/2210.03629"
---

Chain-of-thought stays inside the model's head. Tool-using agents need to *do* things: search, look up, run code. ReAct's format interleaves three kinds of lines: a thought, an action with arguments, and an observation returned by the environment. Yao and colleagues showed that this interleaved prompt beat reason-only and act-only baselines on question answering that needed retrieval and on interactive decision tasks.

The contribution you should steal is the loop shape, not the particular few-shot scripts in the appendix. Thought is allowed to be short. Action is typed. Observation is not sampled by the model. If your "agent" generates the observation itself, you have a roleplay, not ReAct.

## Grounding is the point of the observation

The paper's HotpotQA-style setting works because Wikipedia returns text the model did not invent in that step. That is the same reason production tool calling works: the next thought is conditioned on a real payload. When the tool fails, the observation should say so in a form the model can parse. Silent timeouts are how agents spin.

Few-shot ReAct prompts are long and brittle. Later systems move the same loop into JSON tool calling and a host-side state machine. That is still ReAct's control flow with a stricter parser. Do not keep free-form "Action: Search[...]" in production if you can use a schema. Do keep the thought/action/observation discipline.

## Eval is easy to fool

If the environment is a simulator with a small action space, a model can memorize the few-shot trajectory. If the search API is live, your eval moves every week. The paper is a method paper; your product needs frozen tools or recorded HTTP for regression. Also count steps and dollars. ReAct can wander. A step cap and a retry policy are part of the design, even if the original figures emphasize accuracy.

## A worked internal-docs agent

Thought: "Need the refund window from policy." Action: `search_docs("refund window")`. Observation: chunk text. Thought: "Chunk is about shipping, not refunds." Action: `search_docs("refund days customer")`. Observation: better chunk. Final answer with citations from the observations only. Host-side rule: if the model answers without a retrieval observation, reject. That rule is how you stop ReAct from collapsing into CoT with fake citations.

## Failure modes

**Unconstrained thoughts that leak chain-of-thought to the user** when you meant to show only the answer.

**Action strings the parser cannot read.** One format, one parser, tests.

**Observation truncation** that drops the sentence the next step needed.

**Infinite loops** between two tools. Cap, detect repeats, abort.

**Thoughts that plan six tools then never call them.** Require an action or a finish token each turn.


## Observability for the loop

Log thought (redacted), action name, arguments, observation hash, and latency per step. Without that, "the agent is flaky" is not debuggable. Sample traces weekly the way you sample production LLM chats. ReAct failures cluster: parser, tool, or planner. If you only log the final answer, you will fine-tune the model when you should have fixed the search index. The paper's interleaved format is also a tracing format. Keep it.

## What you can borrow

- Structure agent turns as thought, typed action, environment observation — never model-written observations.
- Put a step budget and a parser in the host, not in the prompt.
- Freeze or record tools for eval; live search is not a unit test.
- Prefer schema tool calls in production; keep ReAct as the mental model.
- Do not ReAct a task that is one retrieval and a template; a RAG pipeline is simpler.
