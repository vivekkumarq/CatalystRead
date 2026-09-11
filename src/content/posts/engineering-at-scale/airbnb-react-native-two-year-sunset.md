---
title: "Airbnb's Two-Year React Native Experiment, and Why It Ended"
slug: "airbnb-react-native-two-year-sunset"
description: "Airbnb adopted React Native to unify mobile development across iOS and Android, then spent two years learning why it decided to sunset the experiment."
publishedAt: "2025-07-18"
category: "Airbnb"
tags:
  - Engineering at Scale
  - Airbnb
  - Mobile
  - React Native
sources:
  - title: "Sunsetting React Native"
    author: "Gabriel Peal"
    publisher: "Airbnb Engineering & Data Science"
    url: "https://medium.com/airbnb-engineering"
---

Maintaining separate native codebases for iOS and Android is expensive: every feature gets built twice, by two teams with different skill sets, often drifting out of sync in subtle ways. React Native promised a way out — write UI logic once in JavaScript, render to genuinely native components on both platforms, and let a single team of engineers ship features to both apps at once. Airbnb adopted it seriously, committed real engineering investment to making it work at their scale, and after roughly two years made the unusual choice to publicly and candidly explain why they were moving away from it.

## The appeal, and the initial bet

Airbnb's stated motivation for adopting React Native was consolidating mobile development so that a single set of engineers, rather than three separate platform teams, could build and ship a feature to iOS, Android, and web with more shared logic and less duplicated effort. This wasn't a small experiment — Airbnb built significant infrastructure around React Native, including tooling to let JavaScript and native code interoperate cleanly within existing native apps, since a full rewrite of already-substantial native codebases wasn't realistic.

## Where the cross-platform bet stopped paying off

The friction Airbnb described publicly fell into a few recurring categories. Debugging issues that crossed the JavaScript-to-native boundary was harder than debugging a purely native or purely JavaScript stack, because a bug could originate in either layer or in the bridge between them. Keeping up with React Native's fast-moving upstream changes required dedicated platform expertise that competed for the same engineers who were supposed to be shipping product features. And engineers hired specifically for iOS or Android native development didn't always want to spend their time writing JavaScript, which created friction in staffing and morale that a purely technical assessment wouldn't have predicted. None of these were framed as React Native being fundamentally broken — they were framed as the total cost, including organizational and hiring costs, outweighing the productivity gains at Airbnb's specific scale and team structure.

## A public postmortem, not a quiet reversal

What distinguished Airbnb's exit from React Native was how openly it was documented. Rather than quietly reverting and letting outside observers guess why, Airbnb engineer Gabriel Peal wrote a detailed, multi-part account of the decision, walking through what worked, what didn't, and the reasoning behind sunsetting the framework in favor of native development on each platform. That honesty made it one of the more cited cross-platform-mobile case studies in the industry — not because Airbnb's conclusion was universally right, but because the reasoning was concrete and specific to their situation rather than a general verdict on the technology.

## What you can borrow

- A cross-platform framework's engineering cost isn't just the learning curve — it includes the ongoing cost of staying current with a fast-moving upstream project and the organizational cost of aligning teams who didn't sign up to work across the stack.
- Debuggability across a bridge between two runtimes deserves real weight in the decision, not just development speed on the happy path — that's usually where the actual time gets spent.
- A negative result, written up candidly with the specific reasoning behind it, is more useful to your organization and to the wider industry than a quiet reversal nobody can learn from.
- Re-evaluate a cross-cutting technology bet on a fixed cadence rather than assuming the original decision holds forever — Airbnb's own conclusion was explicitly tied to conditions at that point in time, not a permanent verdict.
