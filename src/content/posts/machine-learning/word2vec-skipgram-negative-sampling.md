---
title: "word2vec: Skip-gram, Negative Sampling, and Why Embeddings Went Mainstream"
slug: "word2vec-skipgram-negative-sampling"
description: "Mikolov et al. turned distributional semantics into a scalable training trick. How skip-gram works, why negative sampling exists, and what still applies to modern embeddings."
publishedAt: "2026-08-05"
updatedAt: "2026-09-16"
category: "Machine Learning"
tags:
  - Machine Learning
  - NLP
  - Embeddings
  - Research
sources:
  - title: "Efficient Estimation of Word Representations in Vector Space"
    author: "Tomas Mikolov, Kai Chen, Greg Corrado, Jeffrey Dean"
    publisher: "ICLR Workshop 2013"
    url: "https://arxiv.org/abs/1301.3781"
  - title: "Distributed Representations of Words and Phrases and their Compositionality"
    author: "Tomas Mikolov et al."
    publisher: "NeurIPS 2013"
    url: "https://arxiv.org/abs/1310.4546"
---

Count-based co-occurrence matrices were already a thing. word2vec made the same linguistic bet — words in similar contexts have similar meaning — cheap enough to train on a news crawl overnight, and then showed that vector arithmetic sometimes captured analogies. That combination, not the existence of vectors, is why every later embedding model inherited the "map tokens to a space where nearby means related" product intuition.

## Skip-gram versus CBOW

CBOW predicts a word from its neighbors. Skip-gram predicts neighbors from a word. Skip-gram is slower per token and usually better on rare words, because rare words get to be the input more often as a center word with many context predictions. For a product vocabulary with a long tail of SKUs or error codes, that distinction still shows up.

The softmax over the full vocabulary is the naive bottleneck. A 1M-word vocab makes every training step a 1M-way classification. Hierarchical softmax and **negative sampling** are the two escapes in the follow-up paper. Negative sampling turns the problem into "distinguish the true context word from k draws of noise," which is logistic regression against a tiny set of negatives.

```python
# conceptual skip-gram with negative sampling
loss = -log(sigmoid(v_context · v_center))
for v_neg in negative_samples:
    loss += -log(sigmoid(-v_neg · v_center))
```

Subsampling frequent words ("the", "of") is not a preprocessing footnote. Those tokens dominate context windows and teach the model very little. The 2013 papers treat frequency-based sampling as part of the algorithm.

## What aged, and what did not

Static word vectors cannot handle polysemy: "bank" is one point. Contextual models (ELMo, BERT) replaced that for most NLP. Subword tokenizers replaced "one vector per word type" for open vocabularies.

The parts that aged well:

- **Noise-contrastive training** as a way to scale softmax-like objectives. Contrastive sentence embeddings and many retrieval trainers are cousins.
- **The evaluation reflex.** Analogies were a demo, not a complete metric. Mikolov already reported multiple task types. If your embedding launch only shows a t-SNE plot, you are behind 2013.
- **Data and negatives matter more than architecture theater.** A poorly sampled negative set still wrecks metric learning in 2026.

If you ship a two-tower retrieval model, you are closer to skip-gram than to a 12-layer transformer: one vector for the query-like object, one for the document-like object, trained with in-batch or sampled negatives. Reading the 2013 papers with that mapping in mind is more useful than treating them as NLP history.

## A worked negative-sampling step

Vocabulary 100k, embedding dim 100, window 5, `k = 5` negatives. For center word “red” and true context “wine,” you push `v_wine · v_red` up and five noise words down. Noise drawn uniformly is too easy: frequent words never get hard negatives. The papers sample from a unigram raised to 3/4, which oversamples rare words relative to raw frequency and makes the logistic problem harder in a useful way. If your two-tower trainer uses in-batch negatives only, popular items dominate the batch and you recreate a biased softmax. Mix in explicit negatives or subsample popular documents.

Subsampling “the” with probability based on frequency is the other half: without it, most windows teach almost nothing.

## Failure modes

**Polysemy collapse.** One vector for “bank” is a known limit; do not sell it as a sense-aware model.

**Unigram negatives in retrieval.** You train a popularity model, then wonder why tail SKUs never retrieve.

**Analogy as the only eval.** `king - man + woman` is a demo. Track a real task (retrieval nDCG, NER F1, duplicate-ticket match).

**Huge windows on noisy logs.** Context that is not linguistic (session IDs, timestamps) pulls embeddings toward junk.

## When not to use static word2vec

Token-level contextual models own modern NLP. Character-level SKUs and code identifiers want subword tokenization, not a closed word list. If you only have 10k sentences, a PPMI matrix plus SVD may be more honest than undersampled skip-gram. Do not train word2vec on user PII dumps; the vectors memorize.

## Review checklist

- Negative distribution is documented (3/4 unigram, in-batch, hard negatives).
- Frequent-word subsampling is on for language-like data.
- Eval is a product task, not only a t-SNE screenshot.
- Rare-tail behavior was inspected (skip-gram vs CBOW choice).

## A worked failure mode

Skip-gram with negative sampling is trained on a tiny corpus with a huge embedding size. Frequent words get decent vectors; rare SKUs collapse to noise. Cosine is then used as a recommender without checking that antonyms often sit near each other because they share contexts. A product team ships "similar items" that are opposites. The failure is an unsupervised geometry treated as a catalog of meaning. Use domain tokenization, subsample frequent tokens, and evaluate with labeled similar/dissimilar pairs, not a t-SNE screenshot.

## When this is the wrong tool

Word2Vec is the wrong tool for contextual meaning ("bank" river vs finance) and for sentence similarity. It is outdated as a general NLP backbone versus pretrained transformers. Do not Word2Vec a 200-document corpus. Use it for cheap co-occurrence vectors on large unlabeled text when you will measure a downstream task.

When this pattern is stretched past its assumptions, the first outage looks like a mysterious performance cliff instead of a design limit. "word2vec: Skip-gram, Negative Sampling, and Why Embeddings Went Mainstream" fails that way when traffic mix, data shape, or team skill does not match the blog that sold the approach. Keep a kill switch: feature flag, smaller blast radius, or an older path that still works. Measure the thing the idea claims to improve, not a vanity graph. If you cannot name a workload where you would refuse to use it, you have not finished the design.
