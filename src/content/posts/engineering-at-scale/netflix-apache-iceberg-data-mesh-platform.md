---
title: "Netflix's Data Platform Bets on Apache Iceberg and a Data Mesh"
slug: "netflix-apache-iceberg-data-mesh-platform"
description: "Why Netflix helped create Apache Iceberg to fix Hive table limitations, then rethought its data platform around a data-mesh ownership model."
publishedAt: "2026-03-19"
updatedAt: "2026-09-16"
category: "Netflix"
tags:
  - Engineering at Scale
  - Netflix
  - Data Engineering
  - Data Platform
sources:
  - title: "Netflix Technology Blog"
    publisher: "Netflix"
    url: "https://netflixtechblog.com"
  - title: "Apache Iceberg"
    publisher: "Apache Software Foundation"
    url: "https://iceberg.apache.org"
---

Netflix's data warehouse grew for years on Hive tables backed by files in S3, a combination that worked well until the scale of the catalog — tens of thousands of tables, petabytes of data, constant concurrent reads and writes from thousands of jobs — started exposing real limitations in the Hive table format itself: directory-listing-based partition handling that got slow at scale, no safe way to change a table's partitioning scheme without a disruptive rewrite, and weak guarantees around what readers see while writers are actively committing changes. These weren't Netflix-specific bugs, they were structural limits of a table format designed for an earlier era of data scale.

## Iceberg: rethinking what a table format tracks

Netflix's data engineering team, working with the broader open-source community, created Apache Iceberg to solve this by tracking a table's state explicitly — which files currently make up which version of a table — through a metadata layer of manifest files and snapshots, rather than inferring table content by listing directories on read. That metadata-driven design is what unlocked features Hive tables couldn't offer cleanly: atomic snapshot isolation so readers never see a half-committed write, safe schema and partition evolution without rewriting existing data, and time travel to query a table as it existed at a previous snapshot.

```sql
SELECT * FROM plays FOR VERSION AS OF 482913;
SELECT * FROM plays FOR TIMESTAMP AS OF TIMESTAMP '2026-02-01 00:00:00';
```

Partition evolution mattered more in practice than it sounds in the abstract: a table's natural partitioning scheme often needs to change as query patterns and data volume evolve, and under Hive's model that typically meant rewriting the entire table, an expensive and risky operation at Netflix's table sizes. Iceberg let partitioning change going forward without touching historical data, which converted what used to be a rare, high-risk migration project into routine schema management.

Iceberg's design as an engine-agnostic table format — usable from Spark, Trino, Flink, and other query engines against the same underlying tables — also mattered for a company running multiple processing engines against the same data rather than standardizing on one.

## Rethinking ownership with a data-mesh model

Fixing the table format solved a technical problem but not an organizational one: as Netflix's data volume and the number of teams producing and consuming data grew, a centralized data-platform team owning pipeline health, data quality, and access for the entire company's data became a bottleneck of its own kind, similar to what happened with Falcor's centralized API ownership. Netflix's response drew on data-mesh thinking — treating data as a product owned by the domain team that produces it, with the platform team providing the shared infrastructure (storage, table formats, quality tooling, discovery) rather than owning every dataset's content and quality directly.

Under that model, a domain team producing viewing-event data or content-metadata is responsible for that data's quality and schema evolution as a product they own and are accountable for, while the central data platform focuses on making the shared substrate — Iceberg tables, orchestration, governance tooling — good enough that domain teams can operate their data products without needing deep platform expertise themselves.

## What a mid-size team can steal from Iceberg

Iceberg made table metadata — snapshots, partitions, schema evolution — a first-class, file-based contract so engines can read a consistent version of a lake table. Mid-size steal: stop treating a directory of Parquet as a table. Use Iceberg, Delta, or Hudi so a job can time-travel, retry, and add columns without rewriting the world. That matters at a few dozen datasets, not only at Netflix mesh scale.

The concrete failure mode is a data mesh slide deck with no table owner. Every domain publishes a "product" nobody documents, and consumers join on keys that drifted. Iceberg will faithfully snapshot a mess. Steal ownership, SLAs on freshness, and a registry. Operational gotcha: small-file explosions from streaming writes; compaction must be a scheduled job with teeth, or query planners die. Concurrent writers without the right commit protocol corrupt the expectation of serializable table updates. Another trap is mixing engines with partial Iceberg support so Spark writes what Trino cannot prune. Pin versions. Deletes and GDPR-style row removal need a plan: copy-on-write vs merge-on-read behave differently under query load. Mid-size teams should compact, expire old snapshots on a budget, and keep a documented recover-to-snapshot drill. The format is the easy part; the operations around snapshots are the product.

## What you can borrow

- When a storage format's limitations start blocking routine operations (like changing partitioning), treat that as a real platform problem worth solving structurally, not a one-off migration to work around.
- Prefer metadata-driven table formats with snapshot isolation over directory-listing-based approaches once your table scale makes listing slow or write consistency risky.
- Reconsider centralized ownership models as your organization grows — a model that worked with ten teams can become a bottleneck with a hundred.
- Separate "who owns the data" (domain teams, accountable for quality) from "who owns the platform" (infrastructure enabling that ownership) explicitly rather than leaving it implicit.
