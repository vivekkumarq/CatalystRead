---
title: "Full-Text Search Inside Your Database (Before You Reach for Elasticsearch)"
slug: "full-text-search-inside-your-database"
description: "How to use your database's built-in full-text search before reaching for a separate search cluster, and where it stops being enough."
publishedAt: "2025-02-07"
updatedAt: "2026-09-16"
category: "Databases"
tags:
  - Databases
  - PostgreSQL
  - Full-Text Search
  - Performance
  - SQL
---

Spinning up an Elasticsearch cluster to support a search box that runs a few queries per second is a common early architecture decision that ages badly — it's another service to operate, another data-sync pipeline to keep consistent with the primary database, and another failure mode, all to solve a problem Postgres's built-in text search handles adequately for a large fraction of real applications.

## `LIKE` is not full-text search

The first mistake to rule out is reaching for `ILIKE '%term%'` and calling it search. That pattern can't use a standard B-tree index at all — a leading wildcard forces a sequential scan every time — and it has no concept of stemming, word boundaries, or relevance, so searching "running" won't match "run" and every query scans the whole table.

## `tsvector` and `tsquery`: the actual mechanism

Postgres's full-text search converts text into a `tsvector` — a sorted list of normalized lexemes (stemmed words) with position information — and matches it against a `tsquery` built from the search terms, also stemmed and normalized the same way.

```sql
ALTER TABLE articles ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (to_tsvector('english', title || ' ' || body)) STORED;

CREATE INDEX idx_articles_search ON articles USING GIN (search_vector);

SELECT id, title,
       ts_rank(search_vector, query) AS rank
FROM articles, to_tsquery('english', 'database & performance') AS query
WHERE search_vector @@ query
ORDER BY rank DESC
LIMIT 20;
```

The generated column keeps the vector automatically in sync with the source text on every write, and the GIN index makes the `@@` match operator fast even across millions of rows — this is a real index-backed query, not a scan with extra steps. `ts_rank` gives you relevance ordering out of the box, weighted by term frequency and, if you configure weighted vectors, by which field the match came from (title matches ranked above body matches, for instance).

## Where it genuinely stops being enough

Built-in full-text search has real limits, and knowing them is what keeps you from either over- or under-provisioning. It has no fuzzy/typo-tolerant matching out of the box — "postgre" won't match "postgres" without adding `pg_trgm` for trigram similarity on top. It has no built-in faceted search or aggregation-heavy relevance tuning the way Elasticsearch's query DSL provides. And it doesn't scale search load independently from the primary database's transactional load — every search query competes for the same CPU and I/O as your application's writes, which matters once search traffic is a meaningful fraction of total load.

```sql
-- Typo tolerance via trigram similarity, a separate but complementary tool
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_articles_title_trgm ON articles USING GIN (title gin_trgm_ops);

SELECT title, similarity(title, 'postgre performance') AS sim
FROM articles
WHERE title % 'postgre performance'
ORDER BY sim DESC;
```

## A reasonable decision rule

If search is a supporting feature — filtering a support ticket list, searching your own blog posts, letting users find their own documents — Postgres's native full-text search plus `pg_trgm` for typo tolerance covers the large majority of real requirements, avoids a sync pipeline, and keeps search results transactionally consistent with the data that was just written. Reach for a dedicated search engine when search *is* the product: when you need faceted navigation across dozens of filterable attributes, sub-50ms latency at very high query volume independent of database load, or relevance tuning sophisticated enough that a dedicated query DSL earns its operational cost. Most applications never actually cross that line, even though the architecture diagram often assumes they will from day one.

## A worked example

Postgres `tsvector` generated column + GIN index. Queries `websearch_to_tsquery`. Ranking with `ts_rank`. You start here for a product catalog of 200k rows. Synonyms via a dictionary. A fallback ILIKE for SKUs that FTS tokenizes badly.

Explain analyze shows the GIN used.

## Failure modes

No index (sequential parse). Stemming that kills SKUs. Language config mismatch. Updating tsvector in the app inconsistently. Ranking that ignores recency. Trying to search JSON blobs without extracting.

Expecting typo-tolerance like Elasticsearch by default.

## When this is the wrong tool

100M documents, faceted search, per-user scoring: a search engine. Fuzzy log search. Need of near-real-time at huge ingest. Polyglot analyzers. If the "search" is an exact id lookup, use the PK. Do not FTS as a cache of another system of record you already query by id. Elasticsearch is also the wrong first tool for 2k rows.
