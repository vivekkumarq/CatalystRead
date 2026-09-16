---
title: "Indexing Blockchains at Coinbase: Pipelines That Must Not Miss a Reorg"
slug: "coinbase-onchain-indexing-pipelines"
description: "How Coinbase-style onchain indexers ingest blocks, handle reorgs, and serve balances without treating a node RPC as a database."
publishedAt: "2026-12-01"
updatedAt: "2026-12-01"
category: "Coinbase"
tags:
  - Engineering at Scale
  - Coinbase
  - Data Engineering
  - Cryptocurrency
sources:
  - title: "Coinbase Engineering"
    publisher: "Coinbase"
    url: "https://www.coinbase.com/blog/engineering"
  - title: "Bitcoin and Ethereum JSON-RPC"
    publisher: "Bitcoin / Ethereum"
    url: "https://ethereum.org/en/developers/docs/apis/json-rpc/"
---

A crypto exchange cannot ask a full node JSON-RPC for every balance check on every page view. Nodes are not horizontally friendly in that way, and chain data is a firehose of blocks, traces, internal transactions, and token transfers that do not look like your user table. Coinbase and similar firms run indexing pipelines: ingest canonical (and not-yet-canonical) blocks, decode contracts, update account and token projections, and serve those projections from stores they control. The hard part is that the chain can reorganize. A block you indexed is no longer in the canonical fork. If your pipeline cannot unwind, you will credit a deposit that the network later erased.

## Ingest is a cursor with a conscience

The indexer tracks a height, pulls block bodies, and writes a log of observed transactions. Idempotent writes keyed by chain, height, and tx hash are mandatory because you will replay. Decode layers turn bytecode logs into ERC-20 transfers and NFT mints. Each new token standard is a parser you did not want. Missing an event type is a silent under-credit.

Throughput means parallelism, but order matters for some projections. You can parallelize across addresses more easily than you can parallelize a single account's nonce sequence. Pipelines often land raw blocks in object storage or a log, then compute derived tables. That split lets you recompute a decoder without re-fetching the chain from genesis every time.

## Reorgs, finality, and credit policy

Bitcoin and Ethereum have different finality stories. In any case, exchanges typically wait N confirmations before crediting. The indexer still needs to ingest unconfirmed or low-confirmation data for speed of detection, then mark it pending. When a reorg happens, unwind the derived rows for orphaned blocks and apply the new fork. If you only ever insert, your "balance" is a fanfic.

Node diversity matters. A single RPC vendor is a vendor outage. Multiple implementations reduce the chance that a client bug hides a chain split from you — or that you follow a split they invented. Watch peer counts and head lag as SLOs.

## Failure modes of onchain pipelines

The concrete failure is crediting at 1 confirmation for UX, then being unable to reverse a reorg because the user already withdrew off-platform. Mid-size steal: confirmation policy by asset risk, holds that match unwind capability, and alerts on reorg depth.

Operational gotcha: decoder bugs that ignore a proxy contract pattern, so a popular token's transfers vanish until someone yells on Twitter. Version the ABI catalog and replay. Another is backfill that hammers public RPCs and gets you banned mid-incident. Keep dedicated nodes. Height checkpoints that move before the write is durable will skip blocks on crash; persist the checkpoint in the same transaction as the projection when you can. Address clustering and internal transactions (ETH traces) are easy to skip and expensive to add later; decide if your product needs them. Do not use the indexer database as the wallet's source of truth for hot keys. Indexers are derived data. If you must show "pending mempool," label it. A mempool transaction is not a deposit. Load tests should include a synthetic reorg, not only a happy sequential height.

## What you can borrow

- Treat chain data as an append-only log with explicit unwind for reorgs, not as inserts into a balance table.
- Separate raw block storage from decoded projections so you can replay parsers.
- Gate user credits on confirmation depth you can actually reverse.
- Run more than one node implementation and alert on head lag and reorgs.
