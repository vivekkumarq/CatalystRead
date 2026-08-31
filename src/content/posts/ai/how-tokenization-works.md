---
title: "How Tokenization Works and Why Engineers Should Care"
slug: "how-tokenization-works"
description: "A practical look at subword tokenization internals and the concrete ways tokenizer behavior affects cost, latency, and model quality."
publishedAt: "2026-06-26"
category: "AI"
tags:
  - AI
  - Tokenization
  - LLMs
  - Inference
---

Tokenization is the layer most engineers treat as a black box, right up until it explains a bug: a cost estimate that's wildly off, a model that's oddly bad at arithmetic, or a prompt that behaves differently depending on a single leading space. Understanding roughly how subword tokenizers work turns these from mysteries into predictable, checkable behavior.

## Why not just split on words or characters

Character-level tokenization keeps vocabulary tiny but makes sequences extremely long — every model call would need to process far more tokens for the same text, which is slower and more expensive. Word-level tokenization keeps sequences short but explodes vocabulary size (every inflection, typo, and rare word needs its own slot) and can't handle words it's never seen. Subword tokenization, via algorithms like byte-pair encoding (BPE), splits text into a fixed vocabulary of frequently-occurring chunks — common words stay whole, rare words split into pieces, and any input, including typos and unseen words, can always be represented.

```python
# Conceptual BPE: start from characters, iteratively merge the most frequent pair
vocab = set(all_characters)
corpus = tokenize_to_chars(training_text)

for _ in range(num_merges):
    pair_counts = count_adjacent_pairs(corpus)
    most_common = max(pair_counts, key=pair_counts.get)
    corpus = merge_pair(corpus, most_common)
    vocab.add(most_common)
```

The result: common words like "the" become a single token, while a rare or made-up word like "catalystread" might split into two or three subword pieces.

## Token count is not word count

The most immediate practical consequence: cost and context limits are measured in tokens, and the token-to-word ratio varies by language, formatting, and content type. English prose averages roughly 1.3 tokens per word. Code, JSON, and non-English languages (especially non-Latin scripts) can run much higher — some languages tokenize at two to four tokens per word because the vocabulary was trained predominantly on English text. If you're estimating cost or context budget from word counts, you'll systematically underestimate for anything that isn't plain English prose.

```python
# Rough estimate only — always verify with the actual tokenizer
def estimate_tokens(text: str) -> int:
    return int(len(text.split()) * 1.3)  # breaks down badly for code/JSON/non-English
```

Use the actual tokenizer library for your model when cost accuracy matters — the estimate above is fine for a rough dashboard, not for billing.

## Whitespace and formatting are part of the token

A subtle but real gotcha: whether a token includes a leading space depends on the tokenizer, and this affects both cost and, occasionally, model behavior. `" hello"` and `"hello"` can be different tokens entirely. This matters when you're programmatically constructing prompts by concatenating strings — an extra or missing space can shift tokenization in ways that change which tokens the model actually sees, not just how many.

## Tokenization explains a real class of model weaknesses

Models historically struggled with character-level tasks — counting letters in a word, reversing a string, some arithmetic — partly because the tokenizer hands the model subword chunks, not individual characters, so the model never directly "sees" the letters it's being asked to manipulate. A model asked to count the R's in "strawberry" is working from a token like `straw` + `berry`, not `s-t-r-a-w...`. This has improved with training techniques that compensate for it, but it's still a useful mental model for why certain tasks are surprisingly hard for otherwise capable models.

## Practical takeaways

- Always measure token counts with the real tokenizer before shipping cost estimates — don't extrapolate from word counts, especially for non-English or structured content.
- Be consistent about whitespace when constructing prompts programmatically; don't assume string concatenation is tokenization-neutral.
- When a model fails at a character-level task, suspect tokenization before assuming a reasoning failure — the fix might be asking it to work with the text differently (e.g., spacing out letters) rather than a better model.
