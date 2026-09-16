---
title: "GloVe: Word Vectors From a Global Co-Occurrence Matrix, Not Only From Local Windows"
slug: "glove-global-vectors-for-word-representation"
description: "Pennington, Socher, and Manning factorize a log co-occurrence matrix with a weighted least-squares objective. When count-based vectors still beat a hastily trained Word2Vec, and when contextual models replaced both."
publishedAt: "2026-11-22"
category: "Machine Learning"
tags:
  - Machine Learning
  - NLP
  - Embeddings
  - Research
sources:
  - title: "GloVe: Global Vectors for Word Representation"
    author: "Jeffrey Pennington, Richard Socher, Christopher D. Manning"
    publisher: "EMNLP 2014"
    url: "https://aclanthology.org/D14-1162/"
---

Word2Vec trains on local windows with SGD. GloVe first counts how often words co-occur in a corpus, then trains vectors so the dot product of two words' vectors approximates the logarithm of their co-occurrence, with a weighting function that downplays rare and very frequent pairs. Pennington, Socher, and Manning argued that this uses global statistics more efficiently and showed strong results on word analogy and similarity tasks.

Static embeddings are no longer the default for sentence meaning. They are still a baseline for classic NLP, a teaching tool for "vector arithmetic," and sometimes the right lightweight feature for a linear model. If your "embeddings" are GloVe-300 concatenated and fed to a huge transformer, you are mixing eras.

## The weighting function is the method

Raw log co-occurrence would let `the` and `and` dominate. Their `f(X_ij)` caps the influence of large counts. If you skip it, you will learn a syntax-heavy space. Window size and whether you distinguish left/right context change the geometry. Analogy tasks are a particular probe, not a universal quality metric. Downstream POS or NER with a frozen GloVe can disagree with analogy scores.

OOV is the operational pain. GloVe is a finite vocab. Subword models (fastText, later BPE) exist because of this. If your domain is biomedical, Wikipedia GloVe will miss the terms that matter. Retrain counts on domain text; do not expect 2014 Wikipedia vectors to know your SKUs.

## Contextual vs static

BERT-style models give a different vector per occurrence. GloVe gives one vector per type. Polysemy is smashed together. That is fine for bag-of-words classifiers, bad for "bank" the river vs the firm. Do not use cosine on GloVe as a modern semantic search stack without admitting you are in 2014.

## A worked domain retrain

You build a 20k-term co-occurrence on support tickets, train GloVe, and nearest neighbors for `refund` look like your product, not like Wikipedia. A linear SVM on averaged GloVe beats TF-IDF slightly. A fine-tuned sentence encoder beats both. You keep GloVe as a cheap baseline in CI so the encoder cannot regress below a count-based floor. That is a healthy borrow.

## Failure modes

**L2-normalizing inconsistently** between train and query.

**Using analogy puzzles as a ship gate** for a classifier.

**Adding GloVe to a model that already has a learned embedding table** and double-counting.

**Huge vocab, tiny embedding dim**, underfitting rare words.


## Vector arithmetic is a demo

`king - man + woman` is a teaching visualization, not a fairness or semantics guarantee. Gender and stereotype axes sit in the same space. If you use GloVe in a ranking product, test for those axes. Count-based methods make the corpus statistics obvious: they will reflect the crawl. That honesty is useful compared with a mysterious 768-d sentence encoder, but it is not neutrality. Combine GloVe with a stopword policy and a domain stoplist so cosine on `the` does not dominate.

## What you can borrow

- Fit vectors to global log co-occurrence with a cap on frequent pairs when you want cheap static word features.
- Retrain on domain counts; off-the-shelf Wikipedia GloVe is a generic prior.
- Keep a static-embedding baseline under neural encoders.
- Plan for OOV; static vocab is a product constraint.
- Use contextual encoders when meaning depends on the sentence.
