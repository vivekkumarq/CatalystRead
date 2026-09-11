---
title: "Why Slack Bet Its Backend on Hack Instead of Leaving PHP Behind"
slug: "slack-php-hack-hhvm-migration"
description: "How Slack moved its large PHP codebase onto Hack and HHVM, gaining static typing and JIT performance without a rewrite in a different language."
publishedAt: "2025-09-18"
category: "Slack"
tags:
  - Engineering at Scale
  - Slack
  - Hack
  - HHVM
  - PHP
sources:
  - title: "Taking PHP Seriously"
    author: "Keith Adams"
    publisher: "Slack Engineering"
    url: "https://slack.engineering"
---

Slack's backend started life as a fairly ordinary PHP application, and for a long time that was an entirely reasonable choice: PHP is easy to hire for, fast to iterate in, and was never the actual bottleneck in Slack's early years. But as the codebase and engineering team both grew substantially, the properties that make PHP pleasant for a small team — no static types, dynamic everything, a forgiving runtime — started working against a large organization trying to ship safely and quickly at the same time. The industry-standard response to that pain is usually "rewrite it in a typed, compiled language," but Slack took a different, less obvious path: stay on PHP-shaped code, but move the runtime and the language itself.

## Why a full rewrite wasn't the answer

A ground-up rewrite of a large, load-bearing production codebase in a different language is an enormous undertaking, and it comes with a specific, underappreciated risk: it freezes feature work on the old system while the new one plays catch-up, often for years, and it discards an enormous amount of accumulated, battle-tested business logic that nobody wants to re-derive from scratch. Slack's engineering leadership, including engineers with direct prior experience building HHVM and Hack at Facebook, made the case that most of what actually hurt about PHP at scale wasn't inherent to PHP-like syntax — it was the lack of static typing and the performance ceiling of the standard Zend runtime. Both of those were solvable without throwing away the codebase.

## HHVM and Hack: same shape, different guarantees

HHVM (the HipHop Virtual Machine) is a runtime that executes PHP-family code with a just-in-time compiler, in contrast to the Zend engine's interpretation model, and it was built specifically to make PHP-shaped code run dramatically faster under real production load. Hack is a language that grew out of that same effort: syntactically close enough to PHP that existing code could be migrated incrementally rather than rewritten wholesale, but with an opt-in static type system layered on top, letting engineers annotate function signatures and catch a large class of bugs at typecheck time instead of discovering them in production.

```text
PHP source (Zend-style) --> gradually annotated with Hack types --> HHVM JIT execution
```

That incremental path mattered enormously for a company Slack's size: engineers could add type annotations to a file or a module at a time, running Hack's typechecker against a codebase that was still partly untyped, rather than needing the whole system typed and migrated before any of it shipped. Code that hadn't been touched yet kept running; code that had been converted got both a safety net and a performance boost.

## Making the runtime swap invisible to the product

The harder part of this kind of migration isn't the language feature work — it's operating two execution models against one production system while the migration is in flight, and making sure request behavior, error handling, and performance stayed correct throughout. Slack had to validate that HHVM's JIT-compiled execution matched the semantics engineers had relied on under the Zend interpreter for years, catching the inevitable edge cases where "PHP-compatible" runtimes diverge in subtle ways from actual PHP behavior. Doing this without visible disruption to the product meant rolling the runtime change out carefully, monitoring correctness and latency at every step, rather than flipping a global switch and hoping semantics matched.

## What you can borrow

- Before committing to a full rewrite in a new language, check whether the actual pain points (missing types, runtime speed) can be solved by changing the runtime or adding incremental typing to what you already have.
- An incremental, file-by-file or module-by-module migration path that lets typed and untyped code coexist is worth prioritizing over a flag-day cutover, especially for large codebases with years of accumulated business logic.
- Hire for runtime and language expertise deliberately when a migration like this is on the table — the people who built HHVM and Hack the first time understood the tradeoffs in ways a team reasoning from scratch couldn't.
- Treat "same syntax, different runtime" migrations with the same operational care as any other major systems change — subtle semantic differences between runtimes are exactly the kind of bug that only shows up under real production load.
