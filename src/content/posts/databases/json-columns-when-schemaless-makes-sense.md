---
title: "JSON Columns: When Schemaless Inside SQL Makes Sense"
slug: "json-columns-when-schemaless-makes-sense"
description: "A practical look at JSON and JSONB columns: when they replace a schema migration, when they hide a design problem, and how to index them."
publishedAt: "2025-01-22"
category: "Databases"
tags:
  - Databases
  - PostgreSQL
  - JSON
  - Schema Design
  - SQL
---

A JSON column feels like a way to avoid the whole conversation about schema migrations — need a new field, just add it to the payload, no `ALTER TABLE`, no deploy coordination. That convenience is real, and it's also exactly how a JSONB column becomes a dumping ground for data that should have been modeled properly, discovered eighteen months later when someone needs to query a field that's sometimes a string, sometimes an array, and sometimes missing entirely.

## JSONB, not JSON, and why the distinction matters

Postgres has two JSON types, and the choice isn't stylistic. `json` stores the exact text you gave it, byte for byte, and reparses it on every access. `jsonb` stores a decomposed binary representation, which is slightly slower to write but dramatically faster to query, supports indexing, and de-duplicates object keys. Unless you have a specific reason to preserve exact formatting or key order, `jsonb` is the right default and `json` is close to a trap.

```sql
CREATE TABLE events (
    id bigint GENERATED ALWAYS AS IDENTITY,
    event_type text NOT NULL,
    occurred_at timestamptz NOT NULL DEFAULT now(),
    metadata jsonb
);

-- Querying into the structure directly
SELECT id, metadata->>'user_agent' AS user_agent
FROM events
WHERE event_type = 'page_view'
  AND metadata @> '{"experiment": "checkout_v2"}';
```

## When JSONB helps, and when it's hiding a problem

### The case for it: genuinely variable shape

JSONB earns its place when the data really is heterogeneous and the variance is the point, not an accident of a rushed design. Webhook payloads from third-party integrations, event tracking metadata where every event type has different fields, feature flags or user preferences with an open-ended and evolving key set — these are all cases where a rigid column-per-field schema would mean a migration for every new integration or every new flag, for data that's read as a whole far more often than it's individually filtered.

### The case against it: relational data hiding in a blob

The warning sign is a JSONB column with a *stable, known* set of keys that appear on every row — that's not schemaless data, that's a table that hasn't been given real columns yet. If you find yourself writing `metadata->>'status'` in a `WHERE` clause on most of your queries, that field wants to be a real column with a real index and a real type constraint, because right now you have no guarantee it's ever an actual status string and not `null`, an integer, or a typo.

```sql
-- A sign the schema needs to change: a "hidden" required field
SELECT count(*) FROM events
WHERE metadata->>'status' IS NULL;  -- if this is always 0, it isn't optional
```

## Indexing JSONB properly

A GIN index makes containment queries (`@>`) and key-existence checks (`?`) fast across the whole document, which is the right tool for "find rows where this JSON contains that.":

```sql
CREATE INDEX idx_events_metadata ON events USING GIN (metadata);
```

For a specific field you query constantly, a B-tree expression index on just that path is often faster and smaller than a full GIN index, and it's a strong signal that field deserves to be promoted to a real column:

```sql
CREATE INDEX idx_events_experiment
ON events ((metadata->>'experiment'));
```

## A rule that holds up

Use JSONB for the part of the data that's genuinely open-ended, and real columns for anything you'd write a `NOT NULL` constraint on if it weren't buried in a document. Mixed models — a handful of real columns for the fields every row has, plus one JSONB column for the truly variable extras — are usually the right shape, not an either-or choice between "fully relational" and "one big blob."
