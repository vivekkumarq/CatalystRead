---
title: "The FLP Impossibility Result, Without the Mythology"
slug: "flp-impossibility-consensus"
description: "Fischer, Lynch, and Paterson 1985: why deterministic consensus cannot be both safe and live in a fully asynchronous network with one crash."
publishedAt: "2026-09-17"
category: "System Design"
tags:
  - System Design
  - Consensus
  - Distributed Systems
  - Theory
sources:
  - title: "Impossibility of Distributed Consensus with One Faulty Process"
    author: "Michael J. Fischer, Nancy A. Lynch, and Michael S. Paterson"
    publisher: "JACM, 1985"
    url: "https://groups.csail.mit.edu/tds/papers/Lynch/jacm85.pdf"
  - title: "Consensus in the Presence of Partial Synchrony"
    author: "Cynthia Dwork, Nancy Lynch, and Larry Stockmeyer"
    publisher: "JACM, 1988"
    url: "https://groups.csail.mit.edu/tds/papers/Lynch/jacm88.pdf"
---

Fischer, Lynch, and Paterson proved a result that interviewers compress into "consensus is impossible." That slogan is false. FLP says something narrower and more useful: in a **fully asynchronous** model, with **deterministic** processes, even **one crash-stop failure**, you cannot have a protocol that always **terminates** while remaining **agreement-and-validity** safe.

Asynchronous means there is no bound on message delay or processing delay. You cannot tell a crashed process from a slow one. Any protocol that waits for everyone waits forever. Any protocol that decides without waiting can be steered, by an adversary who delays the right messages, into an infinite sequence of "not quite decided" states.

## What the proof is pointing at

The argument uses **bivalency**. A configuration is bivalent if the remaining executions can still lead to deciding 0 or deciding 1, depending on scheduling. FLP shows that from a bivalent initial configuration (which exists when processes start with mixed inputs), there is always a step that preserves bivalency. The adversary keeps the system in the gray zone forever. Safety is not violated. Liveness is.

This is why every real consensus system cheats the model. Raft and Paxos assume that delays are **eventually** reasonable, or they use timeouts. Timeouts are a synchrony assumption: "if I have not heard from the leader in 150ms, I am allowed to guess they are dead." Dwork, Lynch, and Stockmeyer later made that precise with **partial synchrony**: there is some unknown bound that eventually holds. Algorithms can wait until the network behaves.

```text
FLP world: no timeout is legal evidence of a crash
Production: election timeout is exactly that evidence, and it can be wrong
```

Wrong timeouts do not violate FLP; they violate your availability when the guess is false (two leaders, or no leader). Safety in Raft still depends on not committing without a majority, which is how you survive a bad guess.

## Randomized and fault-model escapes

Randomized consensus (Ben-Or and descendants) can terminate with probability 1 even asynchronously, by electing coin flips that the adversary cannot always preempt. Byzantine models change the theorem's hypotheses. None of this lets you ignore FLP when someone proposes a "leaderless, wait-free, always-available, immediately-consistent" KV store on an unbounded-delay WAN.

CAP is a cousin, not a restatement. FLP is about reaching **one** irrevocable decision. CAP is about serving reads and writes during a partition. You can remain available and eventually consistent without solving consensus on every write. You cannot build a linearizable compare-and-swap that always completes in the FLP model.

## How to use this on a design review

Ask where the synchrony assumption lives. If the answer is "Kubernetes will restart the pod," you have a timeout. If the answer is "we'll wait for all three replicas," you have a liveness bug under one hang. If the answer is "CRDTs, no consensus," check whether the product actually needed a single total order.

FLP is not a reason to avoid Raft. It is a reason to treat timeouts, majority, and leader leases as the load-bearing engineering, not as implementation details. The theorem says you must pick a weakness. Production systems pick "we might elect slowly or falsely under a bad network" so they can still decide at all.
