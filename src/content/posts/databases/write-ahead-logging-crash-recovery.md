---
title: "Write-Ahead Logging: The Contract Between Crash Recovery and Your Commits"
slug: "write-ahead-logging-crash-recovery"
description: "Why databases write the log before the page, how REDO and UNDO recover, and the fsync choices that turn a power loss into silent corruption or lost commits."
publishedAt: "2026-08-30"
updatedAt: "2026-09-16"
category: "Databases"
tags:
  - Databases
  - Postgres
  - Reliability
  - Storage
sources:
  - title: "ARIES: A Transaction Recovery Method Supporting Fine-Granularity Locking and Partial Rollbacks Using Write-Ahead Logging"
    author: "C. Mohan, Don Haderle, Bruce Lindsay, Hamid Pirahesh, Peter Schwarz"
    publisher: "ACM TODS, 1992"
    url: "https://dl.acm.org/doi/10.1145/128765.128770"
---

A database cannot rewrite every dirty page to disk at commit time and still be fast. It writes a sequential **log record** describing the change, flushes that log, then tells the client COMMIT. Pages wander to disk later. After a crash, recovery **redoes** logged work that might not have reached the data files, and **undoes** transactions that never committed. ARIES (Mohan et al.) is the canonical description of this dance; Postgres, InnoDB, and a long list of engines are cousins of that design.

## WAL before data, always

The rule is mechanical: a page may not hit stable storage until the log records that protect it are stable. Violate that and a crash can leave a page that reflects a change whose log never made it — or worse, a torn page with no way to reconstruct. Checkpoints exist to bound how far recovery must replay, not to skip the rule.

```text
commit():
  append log records
  fsync(log)          # this is the durability line
  return success to client
  # data pages flush whenever the buffer manager feels like it
```

`fsync` (or `fdatasync`, or a group commit that batches many transactions into one flush) is the latency you feel on COMMIT. Turning it off because a benchmark got prettier is how you advertise durability you do not have. `synchronous_commit = off` in Postgres is an explicit, documented lie to the client — use it only when the product owner agrees lost-last-transactions are acceptable.

## REDO, UNDO, and why compensation records exist

Restart: read the last checkpoint, replay the log forward (REDO) so the heap matches what committed and in-flight transactions had done to pages, then roll back losers (UNDO). ARIES uses compensation log records so undo itself is logged; a crash during crash recovery does not require inventing a third algorithm.

Partial rollbacks (savepoints) and fine-grained locks are why ARIES was a big deal compared to "undo the whole transaction or nothing with coarse locks." Application developers meet this as "I rolled back a savepoint and the row is visible correctly." Storage engineers meet it as a log that must never be truncated past the oldest dirty page plus in-flight undo.

## Replication is WAL by another name

Physical replication ships the same bytes. Logical replication decodes those bytes into row events. If you do not understand WAL, "replica lag" is a cloud dashboard; if you do, it is "the subscriber has not replayed up to this LSN." Tuning `max_wal_size`, slot retention, and archive_command is capacity planning for the log, not a side quest.

When a postmortem says "we lost 3 seconds of writes," ask whether the log was on the same disk as a full table scan, whether fsync was disabled, and whether the cloud volume's flush actually reached media. WAL is only as honest as the storage underneath it.

## A worked example

Postgres: `COMMIT` returns after WAL is flushed (depending on `synchronous_commit`). Crash: replay WAL from the last checkpoint. A test: insert, commit, `kill -9`, restart, row still there. Uncommitted data gone. You see why a disk full on WAL stops writes.

Replicas stream WAL; a lagging replica is a WAL consumer.

## Failure modes

`synchronous_commit=off` then a crash losing "committed" from the app's view. WAL on the same failing disk without a story. Checkpoints too rare (long recovery) or too often (IO). Truncating WAL too soon. App assuming fsync of a file it wrote without the DB WAL.

Copying data files without WAL backup.

## When this is the wrong tool

WAL is not a product audit log (use a table or event store). Do not implement your own WAL for an app that should use a database. In-memory caches do not have WAL unless you built Redis AOF — that is a different durability knob. If you cannot afford fsync latency, you are choosing a durability tier; say so. Object storage versioning is not a WAL.

## A worked failure mode

An app sets `fsync=off` in Postgres to win a benchmark, then a power loss loses "committed" orders. Another team builds a custom WAL in Redis lists and never checkpoints; recovery replays hours and exceeds the SLA. A third treats the WAL as an audit log and greps it for business events that were never guaranteed stable. The failure is durability as a flag. Know what a commit waits for, test crash recovery, and keep business audit in a table. If you cannot pay fsync, you are choosing a different product promise—write that down.

A WAL is the wrong tool for analytics event history you can rebuild. Do not implement one in the application if a database already offers it. Object-storage versioning is not crash recovery for a running OLTP system. Use the database WAL as intended; use higher-level logs for product-visible history.

A worked anti-pattern: the team ships the architecture, then staffs it like a toy. "Write-Ahead Logging: The Contract Between Crash Recovery and Your Commits" needs boring operations—backups, timeouts, ownership, and a budget for the tax the idea always charges (compaction, replay, dual writes, extra latency, extra types). Unstaffed taxes come due at 2am. Put the tax in the design doc's cost section. If leadership wants the benefit without the tax, the honest answer is a smaller idea, not a heroic on-call rotation.
