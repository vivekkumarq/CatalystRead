---
title: "Lineage, Not Checkpoints: How Spark RDDs Recovered from Lost Nodes"
slug: "databricks-spark-rdd-lineage-and-fault-tolerance"
description: "Zaharia et al.'s NSDI 2012 RDD paper showed that coarse-grained lineage can rebuild lost partitions without replicating every intermediate byte."
publishedAt: "2026-10-05"
updatedAt: "2026-10-05"
category: "Databricks"
tags:
  - Engineering at Scale
  - Databricks
  - Apache Spark
  - Distributed Systems
sources:
  - title: "Resilient Distributed Datasets: A Fault-Tolerant Abstraction for In-Memory Cluster Computing"
    author: "Zaharia et al."
    publisher: "NSDI 2012"
    url: "https://www.usenix.org/conference/nsdi12/technical-sessions/presentation/zaharia"
  - title: "Spark: Cluster Computing with Working Sets"
    author: "Zaharia et al."
    publisher: "HotCloud 2010"
    url: "https://www.usenix.org/conference/hotcloud-2010/spark-cluster-computing-working-sets"
---

Hadoop MapReduce made cluster compute reliable by writing every shuffle to disk. That was a fine way to survive node death and a poor way to iterate on a machine-learning working set that needed to stay in RAM. Matei Zaharia and colleagues at AMPLab, later the Databricks founding team, proposed Resilient Distributed Datasets: immutable, partitioned collections with *coarse-grained lineage*. You describe transformations (map, filter, join) as a graph. If a partition is lost, Spark replays the graph for that partition instead of loading a replica of every intermediate buffer. NSDI 2012 is the paper; Spark is the system that made the idea the default for a decade of lakehouse compute.

## Why coarse-grained lineage beats fine-grained replication

Fine-grained systems (some in-memory grids, some actor stores) log or replicate each cell update. That is the right model for mutable shared state. Data-parallel analytics is mostly bulk transforms: the same function over every record. Recording "this partition is `map(f)` of that partition" is tiny compared to the data. Rebuild cost is CPU and a reread of the parent (often from HDFS or, later, object storage). The paper's bet is that failures are rare enough and compute is cheap enough that occasional replay wins against always writing replicas of cached RDDs.

Immutability is load-bearing. If partitions could mutate in place, lineage would lie. Spark's programming model therefore pushes you toward transformations that produce new RDDs. Persistence (`cache`, `persist` with storage levels) is a performance hint: keep this dataset in memory or on local disk, but the source of truth for recovery is still lineage plus original input files — unless you *checkpoint*, which cuts the graph and writes a snapshot when lineage would be too long (deep iterative algorithms, unstable shuffle files).

## Narrow vs. wide dependencies, and the shuffle tax

The RDD paper's other lasting vocabulary is dependency shape. Narrow dependencies (map, filter) let a failed child rebuild from one parent partition. Wide dependencies (groupByKey, some joins) require a shuffle: many parents contribute to one child. Losing a shuffled partition is expensive because you may need to rerun a large stage. Spark's DAG scheduler retries tasks, then stages, and in nasty cases recomputes upstream. This is why a "small" data skew — one key hashing to one reducer — is both a performance bug and a reliability bug: that task is the one that will be retried forever.

Lineage is not free in the scheduler either. Extremely long chains without checkpointing create large DAG metadata and painful recovery after a failure near the end of a pipeline. Spark later added more checkpoint and write-ahead mechanisms for streaming; the batch lesson remains: if you cannot afford to recompute from source, materialize.

Databricks' company history starts here even though the product is now Delta, Photon, and Unity Catalog. The RDD abstraction taught a generation that fault tolerance can be a property of the *plan*, not of a replicated heap. When you debug a Spark job today, you are still staring at stages that exist because of that paper.

## What you can borrow

- For bulk transforms, record how data was derived instead of replicating every intermediate dataset.
- Prefer immutable partitions; mutation makes lineage a lie.
- Treat shuffles as failure domains: skew and lost reduce partitions dominate both tail latency and retries.
- Checkpoint when lineage depth or iterative loops make full replay longer than a snapshot.
- Cache is a hint. Recovery still needs the original inputs or an explicit checkpoint.
