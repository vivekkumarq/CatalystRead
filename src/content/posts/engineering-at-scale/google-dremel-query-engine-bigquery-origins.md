---
title: "Dremel: How Google Made Trillion-Row Queries Feel Interactive"
slug: "google-dremel-query-engine-bigquery-origins"
description: "The columnar storage and execution-tree design behind Google's Dremel engine, and how it became the foundation for BigQuery."
publishedAt: "2026-05-26"
updatedAt: "2026-09-16"
category: "Google"
tags:
  - Engineering at Scale
  - Google
  - Data Engineering
  - Query Engines
sources:
  - title: "Dremel: Interactive Analysis of Web-Scale Datasets"
    author: "Sergey Melnik et al."
    publisher: "VLDB 2010"
    url: "https://research.google"
---

By the late 2000s, Google engineers had a recurring complaint: MapReduce was excellent for large batch transformations, but running an exploratory query over a huge dataset and waiting minutes-to-hours for a MapReduce job to finish made interactive analysis painful. You couldn't ask a follow-up question in a reasonable amount of time, which meant analysts and engineers avoided asking follow-up questions at all. The 2010 VLDB paper "Dremel: Interactive Analysis of Web-Scale Datasets" described the system Google built to close that gap: SQL-like queries over datasets with trillions of rows, returning in seconds rather than requiring a separate batch job.

## Columnar storage for nested data

Dremel's foundational trick is storing data in a columnar format, reading only the columns a query actually references instead of scanning full rows, which cuts I/O dramatically for queries that touch a handful of fields out of a wide schema. That alone wasn't novel — column stores existed before Dremel — but Google's data was frequently nested and repeated (think protocol buffers with optional and repeated fields nested several levels deep), and traditional columnar storage techniques were built with flat, relational schemas in mind. Dremel's real technical contribution was a way to losslessly represent arbitrarily nested, repeated data in columnar form, using repetition and definition levels to record enough structural information to reconstruct the original nested records from the flat columns alone, without needing to store the schema redundantly in every row.

## A multi-level execution tree instead of a single coordinator

Where MapReduce runs jobs as a two-phase map-then-reduce pipeline, Dremel executes queries across a multi-level serving tree: a root server receives the query and pushes it down through intermediate servers, which push it further down to leaf servers that actually read the columnar data and compute partial aggregates, with each level combining and forwarding results back up. That tree structure is what lets a single query fan out across thousands of machines and aggregate results with only a handful of network hops rather than a full MapReduce shuffle, which is the structural reason Dremel queries return in seconds instead of minutes.

Because the execution tree is designed for aggregation-style queries rather than general-purpose distributed transformation, Dremel deliberately isn't a MapReduce replacement — it's a complementary tool aimed specifically at interactive, ad hoc analytical queries, while long-running heavy transformations stayed a job for MapReduce and its successors.

## From an internal tool to a public product

Google made Dremel's capability available externally as BigQuery, launched as a public service not long after the underlying paper was published, giving customers outside Google SQL-like access to the same interactive-query-over-massive-datasets capability that Dremel provided internally, without needing to run any of the underlying infrastructure themselves. Beyond BigQuery, Dremel's ideas about columnar storage of nested data directly influenced the open source ecosystem — Apache Parquet, a columnar storage format widely used across Spark, Hive, and other big-data tools, credits Dremel's paper as a direct inspiration for its handling of nested schemas, and Apache Drill was built explicitly as an open source system inspired by Dremel's architecture.

## What broke when they scaled

MapReduce is a poor interactive SQL engine: you wait for a job, not a query. Dremel (Melnik et al., VLDB 2010) stored nested data column-wise (the "column-striped" representation of protocol-buffer-like records) and executed aggregations as a serving tree of intermediate servers, not a single coordinator. That is why BigQuery can scan trillions of rows with a SQL box. What breaks columnar analytics is wide `SELECT *`, nested explosion, and a serving tree that becomes a hot root if you do not fan out.

In-memory vs on-disk, and the cost of shuffling joins, still apply. Dremel-style systems bill by bytes scanned — a product that trains users to be sloppy with `SELECT *` becomes a finance incident (DoorDash's cost post is the cousin). Google's nested columnar format is a specific invention; Parquet/ORC are the industry descendants.

Interactive latency also needs caching of hot aggregations and admission control so one whale query cannot starve the tree.

## A smaller-team version of the same idea

Put analytics in a columnar warehouse (BigQuery, Snowflake, DuckDB on Parquet). Do not run interactive SQL on OLTP Postgres for trillion-row scans. Project only the columns you need. If DuckDB on a laptop answers the question, you do not need Dremel.

## What you can borrow

- Columnar storage isn't just for flat relational data — with the right encoding, it works for nested and repeated structures too, and the I/O savings can be dramatic.
- Match your execution architecture to your query shape: a tree built for fast aggregation is a different (and sometimes better) tool than a general batch pipeline.
- Interactive and batch workloads have genuinely different performance requirements — don't force both through the same execution engine if you don't have to.
- A well-designed internal tool, packaged as a managed external product, can become a company's product line rather than staying a purely internal capability.
