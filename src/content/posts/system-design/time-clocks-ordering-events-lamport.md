---
title: "Time, Clocks, and the Ordering of Events in a Distributed System"
slug: "time-clocks-ordering-events-lamport"
description: "Lamport's 1978 CACM paper: happens-before, logical clocks, and why wall time is the wrong primitive for causality."
publishedAt: "2026-08-31"
category: "System Design"
tags:
  - System Design
  - Distributed Systems
  - Clocks
  - Causality
sources:
  - title: "Time, Clocks, and the Ordering of Events in a Distributed System"
    author: "Leslie Lamport"
    publisher: "Communications of the ACM, 1978"
    url: "https://lamport.azurewebsites.net/pubs/time-clocks.pdf"
  - title: "Virtual Time and Global States of Distributed Systems"
    author: "Friedemann Mattern"
    publisher: "Parallel and Distributed Algorithms, 1989"
    url: "https://www.cs.cmu.edu/~aplatzer/course/pls18/papers/mattern89virtual.pdf"
---

Lamport's 1978 CACM paper is the reason distributed systems courses start with a partial order instead of NTP. Processes do not share a now. The only ordering you can defend without synchronized clocks is the **happens-before** relation: event `a` happens before `b` if they are on the same process in program order, or if `a` is a send and `b` is the matching receive, or if that relation transits.

If neither `a` nor `b` happens before the other, they are **concurrent**. Concurrent does not mean simultaneous. It means the system cannot tell which came first from causal information alone. Last-write-wins using wall clocks is a policy layered on top of physics you do not have.

## Logical clocks

Lamport assigns each process a counter. The process increments before each event. A send includes the counter. A receive sets `clock = max(local, received) + 1`. If `a` happens before `b`, then `C(a) < C(b)`. The converse is false: unequal timestamps do not imply causality. That one-way implication is why you cannot use a Lamport clock as a uniqueness key for "this write depends on that write" without extra metadata.

```text
P1:  1:local  2:send(x)           5:recv → clock=max(5,4)+1
P2:           3:recv(x)  4:send(y)
```

Total order of events can be manufactured by breaking ties with process ids. That total order is useful for state machine replication. It is not the same as real time. A user in New York can still see a "later" timestamp than a user in Tokyo whose action caused it, if you naively display Lamport numbers as clocks.

## Why wall clocks keep sneaking back in

Operators want to answer "what happened at 14:02 UTC?" Logical clocks cannot. TrueTime, Hybrid Logical Clocks, and vector clocks each patch a different hole. **Vector clocks** (Mattern, Fidge) restore the missing converse: comparing vectors tells you whether two events are causally related or concurrent. The cost is a vector the size of the process set, which is why they show up in CRDTs and versioned KV stores more than in 10,000-node request paths.

Spanner's TrueTime is the opposite bet: bound uncertainty in real time so you can wait out the unknown. Lamport's paper is still the baseline: if you have not named happens-before, your "ordering" is a hope about NTP.

## Production translations

Event sourcing, changelog topics, and audit logs need an order. If that order is "whichever broker appended first," you have a total order per partition, not a causal history across services. If two microservices write to the same logical entity without a causal token (vector, version, fencing token), concurrent updates will collide no matter how carefully you format ISO-8601.

Debugging is where people feel the paper. A log line with `ts=...` from three hosts is not a timeline. Correlate by trace id and parent span, which is happens-before encoded as RPC. When those are missing, you reconstruct causality by guessing, which is how postmortems get the villain wrong.

Read the paper's figures on total ordering of events. Then look at your conflict resolver. If it is `updated_at`, you have chosen a wall-clock total order with silent inversions. Sometimes that is a business-acceptable lie. Name it as a lie.
