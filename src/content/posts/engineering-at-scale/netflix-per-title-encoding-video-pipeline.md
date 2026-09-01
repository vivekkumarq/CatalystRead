---
title: "Per-Title Encoding: Why Netflix Stopped Using One Bitrate Ladder for Everything"
slug: "netflix-per-title-encoding-video-pipeline"
description: "How Netflix rebuilt its video encoding pipeline around per-title complexity analysis and the VMAF quality metric to cut bandwidth without hurting quality."
publishedAt: "2025-11-18"
category: "Netflix"
tags:
  - Engineering at Scale
  - Netflix
  - Video Encoding
  - Streaming
---

For years, Netflix encoded every piece of video content into the same fixed set of resolution-bitrate pairs — the same "bitrate ladder" whether the source was a dialogue-heavy drama with mostly static shots or a fast-cutting action movie full of motion and detail. That approach was simple to operate, but it treated a cartoon with flat colors and simple motion exactly like a grain-heavy, high-motion film, even though the cartoon needs a fraction of the bits to look just as good. Around 2015, Netflix's encoding team set out to fix that with per-title encoding.

## Complexity varies more than the ladder assumed

The core insight is that different content has wildly different encoding complexity, and a single fixed ladder is either wasteful for simple content or insufficient for complex content — it can't be right for both. Per-title encoding runs a complexity analysis on each title individually, testing multiple resolution-bitrate combinations and measuring the resulting quality to build a custom bitrate ladder tailored to that specific piece of content. A simple animated show might top out its top-quality tier at a meaningfully lower bitrate than a live-action blockbuster, freeing bits that would otherwise be wasted encoding detail nobody could perceive.

Doing this at Netflix's catalog scale meant the analysis itself had to be automated and cheap to run repeatedly — encoding decisions that made sense for a hand-tuned boutique encode don't scale to a catalog with thousands of titles and multiple encode profiles per title for different device and network conditions.

## VMAF: measuring quality the way people perceive it

None of this works without a reliable way to measure "does this actually look good," and traditional objective metrics like PSNR don't correlate well with human perception. Netflix, working with researchers including a team at the University of Southern California, developed VMAF — Video Multi-Method Assessment Fusion — a perceptual video quality metric that combines multiple quality-assessment approaches and is calibrated against real human ratings. VMAF became the yardstick Netflix's encoding pipeline optimizes against, and Netflix open sourced it, which let it become a broadly adopted industry benchmark well beyond Netflix's own use.

Having a trustworthy, automatable quality metric is what made per-title (and later per-shot) optimization tractable in the first place — without it, "did this encode actually look better" would have stayed a subjective, manual judgment call that couldn't scale.

## From per-title to per-shot

Per-title encoding was itself a stepping stone. Netflix later pushed the same idea down to a finer grain: per-shot (or per-chunk) encoding, where even within a single title, different scenes get their own optimized encoding parameters, since a quiet dialogue scene and an explosive action sequence in the same movie can have very different complexity profiles. That granularity squeezed out further bitrate savings that a title-level average couldn't capture, at the cost of a much more complex encoding pipeline to manage and orchestrate across a catalog running at Netflix's scale.

The broader pattern here is one Netflix repeated elsewhere in its stack: replace a one-size-fits-all default with a data-driven, per-instance decision once you have both the analysis tooling and the measurement framework to justify the added complexity.

## What you can borrow

- Question fixed, one-size-fits-all configuration defaults — they're usually calibrated for an average case that doesn't exist in your real data.
- Invest in a measurement framework you trust before you invest in optimization; without it, you can't tell whether a change actually helped.
- Prefer perceptual or outcome-based metrics over easy-to-compute proxies that don't correlate with what users actually experience.
- Start optimization at a coarse grain that's operationally manageable, then push toward finer granularity once the coarse version proves its value.
