---
title: "Routing Millions of Voice Calls Through Discord's SFU Infrastructure"
slug: "discord-voice-infrastructure-sfu-routing"
description: "How Discord's voice chat scales using selective forwarding units, UDP-based media transport, and globally distributed voice servers close to users."
publishedAt: "2025-08-18"
updatedAt: "2026-09-16"
category: "Discord"
tags:
  - Engineering at Scale
  - Discord
  - Voice
  - Real-Time Systems
---

Voice chat is Discord's oldest core differentiator, and it operates under constraints that are almost the opposite of the rest of the product: where message delivery can tolerate a few hundred milliseconds of delay without anyone noticing, voice audio becomes noticeably degraded with latency budgets measured in tens of milliseconds. That combination — extremely tight latency requirements, at the scale of millions of concurrent voice sessions, across users with wildly varying network quality — shaped Discord's voice infrastructure around a fundamentally different architecture than its text and presence systems.

## Why a selective forwarding unit instead of a full mesh or a mixer

For a group voice call, there are two classic architectural options, and Discord's engineers chose neither in its pure form. A full mesh, where every participant sends audio directly to every other participant, doesn't scale past a handful of people because each client's upload bandwidth requirement grows linearly with the number of other participants. A centralized mixer, where a server decodes every participant's audio, mixes it into one combined stream, and re-encodes it for each listener, scales participant count better but costs significant server-side CPU for decode-mix-encode on every channel, and it also removes each listener's ability to make their own choices about whose audio matters (like muting one noisy participant locally).

Discord instead built its voice infrastructure around the selective forwarding unit (SFU) model: each participant uploads their audio stream once to a Discord voice server, and the SFU forwards (without decoding or re-encoding) each participant's stream to every other participant who needs it. This keeps server-side CPU cost low — forwarding packets is far cheaper than transcoding audio — while keeping each client's upload bandwidth bounded to roughly one stream's worth, regardless of how many other people are in the call.

```
participant A --upload--> SFU --forward--> participants B, C, D
participant B --upload--> SFU --forward--> participants A, C, D
```

## UDP, not TCP, and why that trade-off is deliberate

Discord's voice transport runs over UDP rather than TCP, accepting the possibility of packet loss in exchange for avoiding TCP's head-of-line blocking and retransmission delays, which would otherwise stall an entire audio stream waiting for one lost packet to be resent — exactly the wrong trade-off for real-time audio, where a single dropped packet's audio gap is far less disruptive than the delay of waiting for its retransmission. This is the same fundamental trade-off that underlies most real-time media protocols (like WebRTC's media transport), and it reflects a broader principle in real-time systems: for perishable, time-sensitive data, recency beats completeness.

## Placing voice servers close to where people actually are

Because voice latency is so sensitive to physical network distance, Discord operates voice servers distributed across many regions globally and routes each user's client to a nearby server rather than a single centralized location, minimizing the round-trip time between a speaker and the SFU handling their channel. For calls with participants spread across different regions, Discord's infrastructure has to make a judgment call about which region's server should host the SFU for that call, generally optimizing to minimize the worst-case latency across all participants rather than simply defaulting to whichever region the call's creator happens to be in.

## What broke when they scaled

Stage channels and large voice rooms turn an SFU into a bandwidth amplifier: one upload becomes N forwards. Without subscription (who is actually speaking / who is in range) you waste last-mile capacity. Discord's later voice work — including speaking detection and more selective forwarding — exists because "forward everyone to everyone" dies at stage-size audiences. NAT, mobile networks, and corporate firewalls also break naive UDP; you need ICE-like connectivity checks, fallbacks, and jitter buffers that hide loss without adding lag.

Region placement is a social graph problem. A server with members on three continents has no "nearest" SFU for everyone. Minimizing the worst-case RTT, plus pinning a call so members do not flap between PoPs, matters as much as raw codec choice. A voice server crash must re-home the channel without sounding like a hang-up. That is orchestration on a UDP fleet, not a typical HTTP rolling deploy.

CPU stays low only while you do not transcode. The moment you need recording, live transcription, or a client that cannot receive Opus at a given bitrate, you have mixer-like costs again. Discord keeps that off the default path.

## A smaller-team version of the same idea

For five-person calls, a mesh or a single SFU box running something like mediasoup/LiveKit is enough. Use UDP/WebRTC, not TCP audio. Put the server in one region your users actually occupy. Add a TURN fallback. Do not build a global voice fabric until you have measured that latency, not features, is the complaint. Mute locally; do not mix on the server unless you are recording.

## What you can borrow

- Match your media/data routing architecture to the actual cost structure: forwarding is cheap, transcoding is expensive — an SFU-style pass-through beats a mixer whenever you don't strictly need server-side mixing.
- For real-time, perishable data, prefer UDP-style "best effort, keep moving" transport over TCP-style "guaranteed, possibly delayed" delivery — a stale retransmit is often worse than a dropped packet.
- Route users to infrastructure by physical proximity when latency is the binding constraint, not just by load or convenience.
- When multiple valid architectures exist (mesh, mixer, SFU), the deciding factor is usually which cost you can least afford to pay at your target scale — bandwidth, CPU, or flexibility — not which is conceptually simplest.
