---
title: "word2vec: Skip-gram, Negative Sampling, and Why Embeddings Went Mainstream"
slug: "word2vec-skipgram-negative-sampling"
description: "Mikolov et al. turned distributional semantics into a scalable training trick. How skip-gram works, why negative sampling exists, and what still applies to modern embeddings."
publishedAt: "2026-08-05"
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
