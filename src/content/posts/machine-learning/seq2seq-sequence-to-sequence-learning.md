---
title: "Seq2Seq: Encode the Source, Decode the Target, Train With Teacher Forcing"
slug: "seq2seq-sequence-to-sequence-learning"
description: "Sutskever, Vinyals, and Le mapped variable-length input to variable-length output with a stacked LSTM encoder-decoder. Reversing the source, beam search, and the bottleneck that attention soon fixed."
publishedAt: "2026-11-24"
category: "Machine Learning"
tags:
  - Machine Learning
  - NLP
  - Sequence Models
  - Research
sources:
  - title: "Sequence to Sequence Learning with Neural Networks"
    author: "Ilya Sutskever, Oriol Vinyals, Quoc V. Le"
    publisher: "NeurIPS 2014"
    url: "https://arxiv.org/abs/1409.3215"
---

Classification nets want a fixed-size input. Translation wants a sentence of length N in and M out. Seq2seq encodes the source with an LSTM, takes the final hidden state as a vector "meaning," and runs a decoder LSTM that emits tokens until an end marker. Sutskever, Vinyals, and Le used deep LSTMs, a large vocab with some tricks, and — famously — reversed the source sentence so that short-term dependencies between source start and target start aligned better. They decoded with beam search.

This is the ancestor of every encoder-decoder transformer and of T5. The 2014 bottleneck (one vector to hold the whole source) is also why Bahdanau attention arrived immediately after. If you train seq2seq without attention on long documents, you are choosing the bottleneck on purpose.

## Teacher forcing versus free run

Training feeds the decoder the gold previous token. Inference feeds the model's own prediction. That mismatch (exposure bias) is a known crack. Scheduled sampling and later RL/sequence-level objectives try to close it. If your model is great at teacher-forced NLL and bad at generated BLEU, you are in this gap. Beam search helps some and hurts diversity; it is a decoder, not a training algorithm.

Deep stacks (they used four layers) needed careful init and a lot of data (WMT). A two-layer seq2seq on 10k pairs will not look like the paper. Capacity and data were always the point.

## Reverse the source?

Their reversal trick is an alignment hack for LSTM time. Attention models mostly do not need it. Copying source reversal into a transformer is cargo cult. Copying the *idea* — make the architecture's sequential bias match the language pair — is fair.

## A worked bottleneck

You encode a 80-token paragraph into one 1024-d vector, decode a summary. The decoder forgets the middle. You add attention (next paper in this lineage) or shorten the input. Diagnosing "LSTM is weak" is wrong; the interface was a single state. Plot encoder timestep norms; watch them saturate.

## Failure modes

**No EOS handling**, infinite decode.

**Beam size so large** that length bias dominates; use length normalization.

**Vocab mismatch** BPE vs words when reproducing BLEU.

**Evaluating with teacher forcing** as if it were generation.


## Length, UNK, and subwords

The 2014 models fought UNK tokens with large softmaxes. Subword tokenization later removed much of that pain. If you reproduce seq2seq on words, you will hit UNK on names; that is historical, not a reason to abandon encoder-decoders. Length normalization in the beam, coverage penalties (later), and a minimum decode length are product knobs. Log mean generated length versus mean target length; a model that always emits 12 tokens on 40-token targets is not "low BLEU," it is a length bug.


Share embeddings between encoder and decoder when vocabs match; the 2014 models did, and it still saves parameters on seq2seq. Do not share when source and target scripts differ wildly without a joint tokenizer.

## What you can borrow

- Factor transduction as an encoder state plus an autoregressive decoder when lengths differ.
- Use beam search (with length handling) as a baseline decoder.
- Expect a fixed-vector bottleneck on long inputs; add attention or chunk.
- Train with teacher forcing, eval with generated strings — never mix them in a table.
- Reverse-source is LSTM-era; do not paste it into attention models.
