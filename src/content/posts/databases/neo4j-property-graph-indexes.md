---
title: "Neo4j Property Graph Indexes: What RANGE, TEXT, and POINT Actually Buy"
slug: "neo4j-property-graph-indexes"
description: "Labels, relationship types, and property indexes: how Cypher plans stay cheap, and why a graph is not an excuse to skip data modeling."
publishedAt: "2026-08-14"
category: "Databases"
tags:
  - Databases
  - Neo4j
  - Graph
  - Indexing
sources:
  - title: "Indexes for search performance"
    publisher: "Neo4j Operations Manual"
    url: "https://neo4j.com/docs/operations-manual/current/performance/index-configuration/"
  - title: "Cypher query tuning"
    publisher: "Neo4j Cypher Manual"
    url: "https://neo4j.com/docs/cypher-manual/current/query-tuning/"
---

A property graph is nodes, relationships, labels, and key-value properties. Neo4j will still table-scan if you treat it like a document pile. Indexes in recent Neo4j are named types — **RANGE**, **TEXT**, **POINT**, **LOOKUP** — and they exist so Cypher can start from a **node set of known size** instead of walking the store.

## Start from a label + property, not from the whole graph

The default lookup indexes let the planner find nodes by label and relationships by type. That is not enough for `MATCH (u:User {email: $e})`. You want a uniqueness or RANGE/TEXT index on `User(email)`. Without it, the planner may filter every `:User`. Relationship property indexes exist too, but most models keep queryable attributes on nodes and keep relationship types selective (`FOLLOWS` versus a generic `RELATED`).

```cypher
CREATE CONSTRAINT user_email IF NOT EXISTS
FOR (u:User) REQUIRE u.email IS UNIQUE;

EXPLAIN MATCH (u:User {email: $e})-[:FRIEND]->(f)
RETURN f.name;
```

`EXPLAIN` / `PROFILE` show whether you got `NodeIndexSeek` or `NodeByLabelScan`. The second is how "graphs are slow" stories start.

## Dense nodes and supernodes

Indexes do not save you from a celebrity node with millions of relationships. Traversing `:FOLLOWS` off a megahub is a dense-node problem: relationship chain walking dominates. Modeling tricks include sharding relationships by type/date (`FOLLOWS_2026`), intermediate nodes, or not storing the high-degree edge in the OLTP graph at all.

TEXT indexes (and full-text indexes) are for search, not for equality of emails. POINT indexes are for spatial predicates. Using RANGE for everything is simpler until tokenization matters.

## Transactions and consistency

Neo4j's clustered offering (Causal Clustering / later architecture) gives causal consistency for reads if you use bookmarks. An index is updated transactionally with the node; you should not see a committed node missing from a unique index. What you will see is planner surprises after you add an index: a new constraint can change a working query's plan. Treat indexes as schema, reviewed like migrations.

Do not index every property "just in case." Write amplification and store size are real. Index the predicates in the top queries, plus uniqueness that the domain requires.

Graphs shine when the **join is the data**: variable-length paths, pattern matching, fraud rings. If every query is `WHERE id = ?` with no path, a relational PK lookup is simpler. If every query is an unindexed property filter across a label, you built a slower Postgres.

Read the operations manual on index types, then `PROFILE` the five Cypher queries that hit production. The first operator in the plan is the whole conversation.
