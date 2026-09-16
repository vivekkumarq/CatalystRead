---
title: "Swift Concurrency: Structured Tasks Instead of Callback Pyramids"
slug: "apple-swift-concurrency-structured-tasks"
description: "Swift's async/await, Task, and actors gave Apple's platforms a structured concurrency model so cancellation and isolation could be compiler-visible instead of GCD folklore."
publishedAt: "2026-10-26"
updatedAt: "2026-10-26"
category: "Apple"
tags:
  - Engineering at Scale
  - Apple
  - Swift
  - Concurrency
sources:
  - title: "SE-0304 Structured Concurrency"
    publisher: "Swift Evolution"
    url: "https://github.com/apple/swift-evolution/blob/main/proposals/0304-structured-concurrency.md"
  - title: "The Swift Programming Language: Concurrency"
    publisher: "Swift.org"
    url: "https://docs.swift.org/swift-book/documentation/the-swift-programming-language/concurrency/"
---

Grand Central Dispatch made it easy to enqueue work and hard to see who owned it. Callbacks captured `self`, completion handlers forgot to call on cancellation, and race conditions on UIKit were "don't touch the UI off the main thread" tribal knowledge. Swift Concurrency (SE-0304 and related proposals: async/await, Task groups, actors, `Sendable`) introduced *structured* tasks: a child task is scoped to a parent, cancellation propagates down the tree, and the compiler can check that values crossing isolation domains are safe. Apple pushed this through the SDK — `URLSession`, SwiftUI `.task`, and `@MainActor` — so the model is the platform, not a library you might adopt.

## Trees of work, not fire-and-forget queues

`async let` and `TaskGroup` make fan-out visible. When the parent scope exits, children are cancelled. That is how you stop a view's network fan-out when the user navigates away, if you used `.task` correctly. Unstructured `Task { }` at the edge is still available and still the way to leak work if you ignore the returned handle. The proposal's point is that unstructured should be the exception you can grep for.

Actors serialize access to their isolated state, which is the language-level version of "one mailbox." `@MainActor` is an actor for the UI. Crossing from a background actor to the main actor is an `await`, which is a suspension point the runtime can use to keep the main thread responsive. `Sendable` is the type-system hammer: shared mutable classes do not cross isolation without a fight. Teams that `@unchecked Sendable` everything have rebuilt the GCD race with extra syntax.

## Cancellation, executors, and the gotchas

Cancellation is cooperative. A tight loop that never `await`s or checks `Task.isCancelled` will run to completion. File IO and some Apple APIs still need explicit cooperation. Priority inheritance and executors (including custom ones) affect latency; starving the cooperative thread pool with blocking `sleep` or mutexes inside async functions is how servers written in Swift stall. Apple's guidance is blunt: do not block in async context; use the bridging APIs for locks and IO.

Swift 6's stricter data-race checking turned warnings into errors for many codebases. Migration is the real engineering program at Apple-scale apps: annotate isolation, shrink shared mutable state, and stop using `DispatchQueue.main.async` as a general hop. Mixed GCD and Swift Concurrency in one feature is legal and confusing; pick a boundary.

The steal for any language is structured lifetimes for concurrent work. Erlang had processes and links; Swift put a friendlier tree in a mainstream UI language. If your mobile app still starts anonymous queues from `viewDidLoad` without cancellation, the feature is already specified.

Testing is where unstructured tasks hide. A unit test that returns before a `Task` finishes will flake or leak. Prefer `await`ing an API that uses structured concurrency, or `await fulfillment` of an explicit task in tests. Swift Testing and XCTest both need the same rule: if it can outlive the test function, you have not tested the cancellation path that production will hit.

## What you can borrow

- Scope background work to UI lifetime so cancellation is default, not a forgotten `invalidate`.
- Prefer structured fan-out (task groups) over unstructured tasks you never await.
- Isolate mutable state (actors or equivalent); do not paper over races with unchecked sendable.
- Make cancellation cooperative at blocking boundaries; check flags in CPU loops.
- Do not block the cooperative thread pool. Blocking calls need a designated executor or API.
