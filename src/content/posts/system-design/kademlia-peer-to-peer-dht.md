---
title: "Kademlia: XOR Distance and the DHT That Stuck"
slug: "kademlia-peer-to-peer-dht"
description: "Maymounkov and Mazières: k-buckets, XOR metric, and why BitTorrent and Ethereum-style discovery still look like this paper."
publishedAt: "2026-09-19"
category: "System Design"
tags:
  - System Design
  - DHT
  - Peer-to-Peer
  - Networking
sources:
  - title: "Kademlia: A Peer-to-peer Information System Based on the XOR Metric"
    author: "Petar Maymounkov and David Mazières"
    publisher: "IPTPS 2002"
    url: "https://pdos.csail.mit.edu/~petar/papers/maymounkov-kademlia-lncs.pdf"
  - title: "BitTorrent DHT protocol"
    publisher: "BitTorrent Enhancement Proposals"
    url: "https://www.bittorrent.org/beps/bep_0005.html"
---

Chord made DHTs famous with a ring. Kademlia (Maymounkov and Mazières, IPTPS 2002) made them operationally pleasant by picking a distance that matches how you want to route: **XOR**. Node ids and keys live in the same 160-bit (or similar) space. Distance `d(a,b) = a XOR b`. Closer means more shared prefix bits. Lookup iteratively queries nodes that are closer to the target, in parallel, until you cannot get closer.

## k-buckets are a routing table with a bias

Each node keeps **k-buckets**, one per bit prefix. A bucket holds up to `k` contacts (often 20) whose ids share that prefix. Buckets for nearby ids split as you learn more; buckets for distant prefixes stay coarse. The replacement policy prefers **long-lived nodes**, because in churny overlays the nodes that have been up for hours are likelier to stay up. That single bias is a large part of why Kademlia survived contact with BitTorrent's user population.

Lookups send `FIND_NODE` or `FIND_VALUE` to the `α` closest known contacts (α is a small parallelism factor, often 3). Replies refine the set. Values (immutable blocks, peer lists for a torrent infohash) are stored on the `k` nodes closest to the key. Republish periodically or the value expires — DHTs are not your disk.

```text
want key K
known: {n1, n2, n3} closest so far
query α of them → learn closer set
repeat until round trips stop improving
store/get on k closest
```

## Why XOR is not a cute trick

XOR is symmetric, and it lets a node use the **same tree** to route toward any key. Prefix routing converges in `O(log n)` hops under reasonable id uniformity. Compared with Chord's successor lists, Kademlia's parallel lookups hide RTT, which matters when peers are on home connections. Compared with centralized trackers, there is no single chokepoint — and also no single operator to issue an abuse takedown, which is a social property as much as a technical one.

Security is the paper's quiet gap. Sybil nodes can surround a key. Eclipse attacks starve honest routing. Real deployments add token challenges, restricted routing table admission, and sometimes a trusted bootstrapping set. Ethereum's discv4/discv5 and IPFS's Kademlia variants are this paper plus a decade of overlay defense.

## When a DHT is the wrong lookup

If you have a membership service and a few hundred nodes in a VPC, consistent hashing plus gossip is simpler than a XOR overlay. If you need linearizable reads, a DHT will not provide them. If keys are adversarial, uniform hashing of ids is a requirement, not a default.

Steal Kademlia when you need lookup among **untrusted, churny, numerous** peers and the values can be cached and republished. Steal the k-bucket liveness heuristic even if you never implement XOR: prefer proven-up members in any gossip table. Read the paper's lookup latency argument, then measure RTT parallelism in your own iterative finder. Sequential "ask the next hop" on a 200ms overlay is how DHTs get a reputation for being slow when the protocol already told you to pipeline.
