---
title: "IndexServe: How Bing Kept Search Serving on the Hot Path"
slug: "microsoft-bing-indexserve-search-serving"
description: "Bing's IndexServe stack turns a continuously updated web index into low-latency ranked results, with partitioning, replication, and a strict serving budget."
publishedAt: "2026-09-29"
updatedAt: "2026-09-29"
category: "Microsoft"
tags:
  - Engineering at Scale
  - Microsoft
  - Search
  - Distributed Systems
sources:
  - title: "Bing at 10: how search works"
    publisher: "Microsoft Bing Blog"
    url: "https://blogs.bing.com/"
  - title: "Large-scale search serving and ranking"
    publisher: "Microsoft Research"
    url: "https://www.microsoft.com/en-us/research/theme/information-retrieval-and-knowledge-management/"
---

Web search looks like a single box to the user and like a factory to the operator. Crawlers dump documents, indexers invert terms, rankers score candidates, and a serving layer must answer in tens of milliseconds with an index that is always slightly stale because the web never stops. Bing's serving path — often discussed internally and in industry talks under names like IndexServe for the inverted-index serving tier — is the piece that cannot pause for a MapReduce job to finish. It has to take a query, fan it out across partitions of the index, merge posting lists, apply early-exit and ranking stages, and return. Everything else in the Bing stack exists to feed this path without violating its latency SLO.

## Partition the index, replicate the hot slices

A global web index does not fit on one machine's RAM, and even if it did, one machine could not take the QPS. The index is sharded by term or by document (Bing and peers have used variants of both over the years), with each shard replicated for availability and for read scale. A broker or root node decomposes the query, waits for shard answers with a deadline, and merges. The deadline is the product: a shard that is late is a shard that did not vote, which can drop recall on tail terms. Operators therefore over-replicate hot shards and isolate "long tail" postings on cheaper hardware so a rare term does not stall a celebrity query.

Freshness fights latency. News and rapidly changing documents want to appear in minutes. Rebuilding the entire inverted index that often is impossible, so serving systems maintain a *dynamic* overlay — recently changed documents in a smaller structure that is merged at query time or periodically compacted into the main index. The merge policy is a reliability feature. Too aggressive and you burn CPU on every query; too lazy and a breaking-news query misses the document everyone is searching for.

## Ranking is a cascade, not one model

Keyword retrieval produces too many candidates. Bing-style serving runs a cascade: cheap Boolean or BM25-style retrieval, then one or more learning-to-rank stages, then a final model that is allowed to be heavier because it sees tens of documents, not tens of millions. Each stage has a budget in milliseconds and a budget in CPU. The engineering failure is putting the expensive model too early, or letting a single slow feature (a remote call to a knowledge graph) block the whole cascade. Feature stores and local caches exist so the serving machine is not a distributed-systems novel per query.

IndexServe-class systems also have to survive deploy. Rolling a new ranker or a new index generation means dual-running, shadow traffic, and a kill switch that reverts without rebuilding the web. A bad ranker is a company-wide incident with a public URL. Canarying by query hash or by market (en-US first) is how you avoid teaching the entire planet a ranking bug at once.

The borrowable shape is independent of Bing's proprietary code: a partitioned replica set for the retrieval structure, a freshness overlay, a strictly budgeted ranking cascade, and a serving deadline that drops slow shards rather than waiting forever. Search is the original "tail latency is the only latency" product.

## What you can borrow

- Give the serving path a hard deadline; missing shard results beat blowing the user-visible SLO.
- Isolate hot partitions and freshness overlays so updates do not rewrite the entire corpus on the query path.
- Cascade rankers from cheap to expensive; never run the heavy model on the full posting list.
- Canary index and ranker changes by market or query hash with an instant revert that does not require a rebuild.
- Treat remote features as optional. If a side call is slow, degrade the score, do not stall the page.
