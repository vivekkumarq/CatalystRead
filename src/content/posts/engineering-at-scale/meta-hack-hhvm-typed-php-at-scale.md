---
title: "Hack and HHVM: Making PHP Fast and Typed at Facebook's Scale"
slug: "meta-hack-hhvm-typed-php-at-scale"
description: "How Facebook rebuilt PHP's execution model with HHVM and added a type system with Hack, without forcing a rewrite of its enormous existing codebase."
publishedAt: "2025-07-10"
category: "Meta"
tags:
  - Engineering at Scale
  - Meta
  - Programming Languages
  - Performance
sources:
  - title: "Hack: A New Programming Language for HHVM"
    publisher: "Facebook Engineering"
    url: "https://engineering.fb.com"
---

Facebook's website was, for its first several years, a large and rapidly growing PHP codebase, and PHP as originally implemented was a problem at Facebook's scale in a very specific way: the standard Zend interpreter executed PHP by walking an abstract syntax tree at runtime, which is a reasonable design for a scripting language serving modest traffic but a genuinely expensive one when every page view across a massive user base re-interprets the same code paths. Rewriting the codebase in a different language wasn't realistic — too much institutional knowledge and working product logic lived in that PHP, and thousands of engineers already knew how to work in it. The problem had to be solved underneath the language, not around it.

## HipHop and then HHVM: compiling PHP instead of interpreting it

Facebook's first attempt, HipHop for PHP, compiled PHP source into C++ and then into a native binary ahead of time — a source-to-source transformation that sidestepped the interpreter entirely. It worked, but ahead-of-time compilation had real friction: the compile step was slow, and PHP's dynamic features didn't always translate cleanly into statically compiled C++. Facebook's next iteration, HHVM (the HipHop Virtual Machine), took a different approach borrowed from mature managed runtimes like the JVM: a just-in-time (JIT) compiler that translates PHP into machine code at runtime, compiling hot code paths as they're actually exercised rather than trying to predict everything ahead of time. This gave Facebook something closer to native execution speed while keeping PHP's dynamic, interpreted-language ergonomics intact for developers.

## Hack: opt-in static typing on top of the same runtime

Speeding up execution solved one problem; it didn't solve a second one that got worse as the codebase and engineering headcount grew: PHP's dynamic typing made it easy to introduce bugs that a type checker would have caught immediately, and those bugs got harder to track down the larger the codebase became. Facebook's answer was Hack, a programming language that added a static type system on top of the same HHVM runtime, letting engineers opt into type annotations incrementally rather than requiring a wholesale rewrite. Existing PHP code kept running unmodified on HHVM, while new or updated code could add type annotations and get compile-time checking — a gradual-typing approach that let Facebook capture much of the safety benefit of static types without stopping the org to do a big-bang migration.

## Why gradual adoption mattered more than the language design itself

The technical design of Hack's type system — generics, nullable types, collections — mattered, but the thing that made the whole effort actually land inside Facebook was that both HHVM and Hack were built to be adopted incrementally, on the existing codebase, by an organization that couldn't stop shipping product features to do a rewrite. That constraint shaped both projects as much as any language-design decision: performance and safety were treated as things to retrofit under and around a live, constantly changing codebase, not preconditions requiring a clean slate.

## What you can borrow

- A JIT compiler that optimizes hot paths at runtime can close most of the performance gap with a compiled language, without giving up a dynamic language's development ergonomics.
- Gradual, opt-in typing lets a codebase capture much of the value of static types incrementally, without requiring a disruptive full rewrite — worth considering before assuming a language migration is the only path to safety.
- Performance and safety problems in a codebase you can't pause to rewrite are usually best solved underneath or around the existing code, not by replacing it wholesale.
- Investing in your own runtime is a large undertaking that only pays off at genuine scale; most teams are better served adopting an existing fast, typed language rather than building one, but the underlying lesson — meet your codebase where it is — still applies broadly.
