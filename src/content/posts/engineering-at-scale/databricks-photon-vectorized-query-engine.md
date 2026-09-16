---
title: "Photon: Vectorized Execution for the Lakehouse CPU"
slug: "databricks-photon-vectorized-query-engine"
description: "Databricks built Photon as a native, vectorized engine so SQL and Spark workloads could leave interpreted row-at-a-time execution on the table."
publishedAt: "2026-10-07"
updatedAt: "2026-10-07"
category: "Databricks"
tags:
  - Engineering at Scale
  - Databricks
  - Query Engines
  - Performance
sources:
  - title: "Photon: A Fast Query Engine for Lakehouse Systems"
    author: "Behm et al."
    publisher: "SIGMOD 2022"
    url: "https://dl.acm.org/doi/10.1145/3514221.3526054"
  - title: "Announcing Photon"
    publisher: "Databricks Blog"
    url: "https://www.databricks.com/blog/2021/06/17/announcing-photon-next-generation-query-engine-on-the-databricks-lakehouse-platform.html"
---

Spark's original execution model was built for flexibility: JVM operators, code generation in later Tungsten releases, and a runtime that could host arbitrary UDFs. Flexibility has a tax. Row-at-a-time loops, virtual calls, and poor SIMD use leave a lot of a modern CPU on the table when the job is SQL over Parquet or Delta. Databricks' Photon engine, described in SIGMOD 2022, is a C++ vectorized execution runtime that plugs into the lakehouse planner. Batches of column values move through operators designed like a database, not like a generic RDD map. The pitch is speed on the same data files customers already stored, without a second copy in a proprietary warehouse format.

## Vectors, not rows, and native memory

Vectorized engines process thousands of values per operator invocation, which amortizes dispatch and enables SIMD. Photon takes that textbook (MonetDB/X100, Arrow-style batches) and engineers it against Spark's realities: nullable columns, nested types, and the need to fall back when a UDF or an unsupported expression appears. The SIGMOD paper is explicit about *adaptive* execution: run Photon where it can, Spark where it must, in one query. That hybrid is the product requirement. A pure rewrite that forbids Python UDFs would not migrate the installed base.

Native code also means a different failure mode. A crash in Photon is a process death, not a caught JVM exception in one task. Databricks has to treat the engine like a database kernel: fuzz expressions, bound memory, and isolate. Columnar layouts that match Parquet's encoding (dictionary, run-length) avoid decode-to-row-and-back, which is where a lot of lake query time actually goes. Predicate pushdown and late materialization — keep decoding only the columns you need after filters — are as important as "we wrote it in C++."

## Compatibility is the real benchmark

TPC-DS numbers sell engines; customer queries keep them. Photon had to match Spark SQL semantics: nulls, ANSI vs. non-ANSI modes, floating-point, timestamps, and the long tail of Spark functions. Any discrepancy is a silent correctness incident in a finance pipeline. The engineering program is therefore as much a test corpus as a kernel. Vectorization also changes CPU/GPU stories: Photon is a CPU engine. Databricks later added other accelerators; the lesson from Photon is still that the first huge win was using the chip you already paid for, correctly.

Shuffle and IO still dominate many jobs. A faster filter does not help if you scan a poorly clustered 100-TB table. Photon pairs with Delta's layout (Z-order, later clustering) because the engine and the table format share a planner. Mid-size teams cannot drop Photon in-house, but they can steal the priority order: file layout and predicate pushdown first, then a columnar runtime, then micro-optimizations. Rewriting a pipeline in a new language without fixing tiny files is how "vectorized" demos fail in production.

## What you can borrow

- Execute columnar batches with SIMD-friendly operators; row-at-a-time interpreters waste lakehouse hardware.
- Keep a fallback path for UDFs and exotic types; hybrid engines ship, purist engines stall migrations.
- Treat native query kernels as crash domains: fuzz, bound memory, and test SQL semantics against a huge corpus.
- Decode only needed columns after predicates; scan cost still beats CPU cleverness on real tables.
- Fix file layout and clustering before you bet the budget on a new runtime.
