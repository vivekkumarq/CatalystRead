---
title: "BERT: Why Bidirectional Pretraining Changed How We Fine-Tune Language Models"
slug: "bert-pretraining-what-changed-after-gpt"
description: "Masked language modeling versus left-to-right GPT, next-sentence prediction, and what still matters when you fine-tune encoder models in products."
publishedAt: "2026-07-24"
category: "AI"
tags:
  - AI
  - NLP
  - Transformers
  - Research
sources:
  - title: "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding"
    author: "Jacob Devlin, Ming-Wei Chang, Kenton Lee, Kristina Toutanova"
    publisher: "NAACL 2019"
    url: "https://arxiv.org/abs/1810.04805"
---

GPT showed that a decoder-only transformer, trained to predict the next token, learns surprisingly useful representations. BERT asked a different question: if your job is classification, span extraction, or ranking — not open-ended generation — why force the model to ignore the right-hand context?

Devlin et al. trained an encoder that could see both sides of a sentence by masking tokens at random and asking the model to fill them in. That one training change, plus a second "are these two sentences adjacent?" task, produced the 2018–2019 wave of "we fine-tuned BERT and beat the leaderboard" papers. Search ranking, content moderation, and ticket routing systems still run encoder descendants (and smaller distilled copies) because the job is understanding, not chatting.

## Masked language modeling is not a parlor trick

Left-to-right models can only condition on the past. For a token in the middle of a query, the words after it are often the ones that disambiguate meaning. Masking 15% of tokens (mostly replaced with `[MASK]`, sometimes random, sometimes left unchanged) forces every layer to build a representation that works from both directions.

The `[MASK]` token does not exist at fine-tuning time for most classification tasks. The paper already flags this pretrain/fine-tune mismatch. In practice it hurt less than people feared for sentence-level tasks, and later work (RoBERTa dropping next-sentence prediction, span masking in SpanBERT) showed which pieces were load-bearing.

## Next-sentence prediction, then the walk-back

BERT's second objective tried to teach discourse: 50% of the time segment B really followed A. RoBERTa and others later found that NSP was a weak signal compared to more data and better masking. If you are reproducing BERT for a product, do not treat NSP as sacred. Do treat bidirectional context and a large unlabeled corpus as sacred.

## Fine-tuning is the product surface

The original recipe is simple on purpose: take the `[CLS]` hidden state (or mean pooling, in later variants), add a small classification head, train a few epochs at a low learning rate. That recipe is why BERT shipped into enterprise NLP so fast — you did not need to train 110M parameters from scratch on your 12,000 labeled tickets.

Where teams get hurt:

- **Domain mismatch.** A Wikipedia/BookCorpus encoder is a weak starting point for legal contracts or stack traces. Continue pretraining on in-domain unlabeled text before the labeled fine-tune.
- **Max length.** BERT's 512 token limit is an architecture artifact. Truncating a 4,000-token policy document silently drops the clause you care about. Chunking and hierarchical models exist because of this, not because product managers love complexity.
- **Using BERT as a chatbot.** Encoder-only models are the wrong tool for open generation. Use them for retrieve, classify, extract; generate with a decoder.

Read the paper's GLUE numbers as history, not as a promise that "BERT" on a model card means those numbers. The useful inheritance is the training idea: if the downstream task is understanding a span in context, train the model to need both sides of the span.
