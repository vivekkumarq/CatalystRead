---
title: "Bitcoin: A Peer-to-Peer Electronic Cash System, Read as a Distributed Log"
slug: "bitcoin-peer-to-peer-electronic-cash"
description: "Nakamoto 2008: proof-of-work as Sybil-resistant leader election, UTXOs, and the longest-chain rule without the hype cycle."
publishedAt: "2026-08-09"
category: "System Design"
tags:
  - System Design
  - Bitcoin
  - Consensus
  - Cryptography
sources:
  - title: "Bitcoin: A Peer-to-Peer Electronic Cash System"
    author: "Satoshi Nakamoto"
    publisher: "2008"
    url: "https://bitcoin.org/bitcoin.pdf"
  - title: "Majority is not Enough: Bitcoin Mining is Vulnerable"
    author: "Ittay Eyal and Emin Gün Sirer"
    publisher: "FC 2014"
    url: "https://arxiv.org/abs/1311.0243"
---

Satoshi Nakamoto's 2008 paper is a distributed systems paper that happens to describe money. The problem statement is not "make a database." It is: how do strangers agree on a **single history of spends** when anyone can join, anyone can lie, and there is no trusted timestamp service. The proposed answer is a chain of hashed blocks, a proof-of-work lottery to append, and a rule that honest hashpower follows the **longest valid chain**.

## Double-spend is a consensus problem

Digital cash without a bank needs to prevent the same coin from being paid twice. Bitcoin models coins as **unspent transaction outputs** (UTXOs). A transaction consumes UTXOs and creates new ones, authorized by signatures. Nodes accept a spend only if the inputs are unspent in the chain they currently believe. Two conflicting spends can both be valid in isolation; consensus is picking one history.

Proof-of-work makes proposing a block expensive. Miners search for a nonce such that `SHA-256(header) < target`. Expected time per block is kept near ten minutes by retargeting difficulty. That cost is Sybil resistance: identities are cheap, joules are not. It is not energy-neutral, and later systems tried other Sybil defenses. Nakamoto's design is explicit about the assumption: **honest majority of hashpower**.

```text
genesis → block1 → block2 → block3
                    ↘ block2' → block3'   (fork)
nodes extend the valid chain with most work
```

## What the paper under-specifies, and operators learned

The paper sketches SPV (simple payment verification) via Merkle paths. It does not settle selfish mining (Eyal and Sirer), eclipse attacks on peer connections, or the politics of block size. "Longest chain" in practice is **most accumulated work**, not most blocks. Reorgs happen; exchanges wait for confirmations because probability of a deeper reorg falls as honest work piles on, not because confirmations are a legal settlement.

There is no PBFT quorum. Finality is probabilistic. That is a product choice: you can wait, or you can accept residual reversal risk. Comparing Bitcoin to Raft is a category error. Raft assumes a known membership and crash faults. Bitcoin assumes open membership and economic cost.

## Engineering takeaways if you are not launching a coin

The reusable ideas are narrower than conference-keynote versions suggest. **Append-only hashed logs** with application-level validation show up in transparency logs and some audit stores. **Work or stake as admission control** is how you stop cheap identities from dominating an overlay. **UTXO-shaped state** (consume and create) is a concurrency-friendly alternative to a single mutable account row — with the cost of UTXO set management.

If you need a ledger inside a company, a BFT or crash-fault log with named members will be cheaper and more final than proof-of-work. If you need an open system where the operator of node 7 is unknown, Nakamoto's threat model is the one to argue with, not Paxos.

Read the paper's section on incentive and timestamp server. Then ask whether your "blockchain" is solving Sybil-open consensus or decorating a database. Those are different tickets.
