---
title: "Bloom Filters in Storage Engines: Cheap Negative Lookups"
slug: "bloom-filters-in-storage-systems"
description: "How Bloom filters avoid disk reads in LSM trees and caches, how false positives behave, and when a cuckoo or ribbon filter is the better structure."
publishedAt: "2026-07-14"
updatedAt: "2026-09-16"
category: "System Design"
tags:
  - System Design
  - Databases
  - Storage
  - Algorithms
sources:
  - title: "Space/Time Trade-offs in Hash Coding with Allowable Errors"
    author: "Burton H. Bloom"
    publisher: "Communications of the ACM, 1970"
    url: "https://dl.acm.org/doi/10.1145/362686.362692"
  - title: "Cuckoo Filter: Practically Better Than Bloom"
    author: "Bin Fan, David G. Andersen, Michael Kaminsky, Michael D. Mitzenmacher"
    publisher: "CoNEXT 2014"
    url: "https://www.cs.cmu.edu/~dga/papers/cuckoo-conext2014.pdf"
---

A Bloom filter answers one question quickly: "Is this key *definitely not* in the set?" If it says no, you can skip a disk seek, an SST file, or a cache fill. If it says yes, you still have to look — the structure allows false positives and forbids false negatives (unless you delete unsafely).

That asymmetry is why LSM-tree databases (RocksDB, LevelDB, Cassandra) put a filter on each sorted file. Most point lookups miss. Paying a few bits per key in RAM to avoid touching flash on those misses is one of the highest-leverage tricks in storage.

## The structure, without the folklore

You allocate `m` bits, all zero. For each inserted key you compute `k` hash functions and set those bit positions. A lookup hashes the same way: if any bit is zero, the key was never inserted. If all are one, the key *might* be there.

```python
class Bloom:
    def __init__(self, m, k):
        self.bits = bytearray((m + 7) // 8)
        self.m = m
        self.k = k

    def add(self, key: bytes):
        for i in range(self.k):
            h = hash((key, i)) % self.m
            self.bits[h // 8] |= 1 << (h % 8)

    def maybe_contains(self, key: bytes) -> bool:
        for i in range(self.k):
            h = hash((key, i)) % self.m
            if not (self.bits[h // 8] & (1 << (h % 8))):
                return False
        return True
```

False-positive rate is roughly `(1 - e^{-kn/m})^k` for `n` inserted keys. The usual sizing rule is about 10 bits per key for ~1% false positives, with `k` around `0.7 * m/n`. Undersize the filter and you "save memory" by turning it into a random yes-machine, which is worse than no filter: you pay the RAM *and* the disk.

## Deletion, counting, and why SSTs rebuild instead of editing

Standard Bloom filters cannot delete. Clearing bits would break other keys that shared those positions. Counting Bloom filters store small counters instead of bits, at a memory premium. Production LSM engines mostly avoid the problem: a filter is built when an SST is flushed or compacted, then thrown away with the file. That matches how the data actually lives.

## When to pick something else

Cuckoo filters (Fan et al., 2014) store fingerprints in buckets and support delete. Ribbon filters and xor filters squeeze more keys into the same DRAM for static sets. If your set is immutable and huge, look at those papers before inventing a custom bitset. If your set mutates wildly and must be exact, you wanted a hash table.

The design-review question is not "did we use a Bloom filter." It is "what is the cost of a false positive on this path, and did we size `m` from that cost?" A false positive on a user-facing cache lookup is an extra millisecond. A false positive that skips a security check is not a Bloom filter problem you should have.

## A worked example

LSM reads check a bloom filter per SSTable before disk. You size `m` bits and `k` hashes for a 1% false positive rate on expected `n` keys. A test inserts 1e6 keys, queries 1e6 missing keys, and measures false positives near the formula. RocksDB / LevelDB expose this as a table option. You never use a bloom to *prove* a key exists — only to skip IO on definite misses.

A cache: "not in this shard" filter before a cross-region get.

## Failure modes

Too small a filter → many extra IOs. Too large → RAM tax. Not rebuilding after a compaction. Hash quality poor. Using blooms for security (they leak membership approximately). Concurrent mutation without a version. Counting blooms for deletes done wrong.

Treating a positive as "key exists" and skipping the real lookup.

## When this is the wrong tool

Tiny datasets that fit in RAM do not need blooms. Exact membership wants a hash table or a set. Cryptographic sets and authz lists must not be blooms. If false positives are costly (launching a huge job), pay for a precise index. Counting distinct with blooms is the wrong cousin — use HLL. Do not put a bloom on the hot path of a 10-row config table.
