---
title: "Real-Time Voice and Video Calling on Top of a Messaging Backbone"
slug: "whatsapp-voice-video-calling-infrastructure"
description: "How WhatsApp built low-latency, end-to-end encrypted voice and video calling on infrastructure originally designed for asynchronous store-and-forward messaging."
publishedAt: "2026-01-08"
category: "WhatsApp"
tags:
  - Engineering at Scale
  - WhatsApp
  - Real-Time Media
  - Networking
sources:
  - title: "WhatsApp Security Whitepaper"
    publisher: "WhatsApp"
    url: "https://www.whatsapp.com/security"
  - title: "Meta Engineering Blog"
    publisher: "Meta"
    url: "https://engineering.fb.com"
---

WhatsApp's core messaging system was built to guarantee eventual delivery: hold a message safely if the recipient is offline, retry, and let it arrive whenever the device reconnects, however long that takes. Calling turns that assumption inside out. A voice or video call is only useful if the audio and video arrive within tens of milliseconds of being captured — a dropped packet that arrives late is worthless and should simply be skipped, not retried, and a call that can't establish a low-latency path in real time has effectively failed even if every underlying network link is technically working. Layering that requirement on top of a store-and-forward messaging platform meant building what amounts to a second, differently-optimized system, not just adding a new message type.

## Signaling and media are two different problems

Setting up a call — ringing the other party, negotiating whether both sides support video, agreeing on codecs, handling someone declining or missing the call — is a natural fit for WhatsApp's existing messaging infrastructure: these are small, latency-tolerant control messages that behave much like any other message needing reliable delivery. But once a call connects, the actual audio and video packets take an entirely different path, streamed directly and continuously between endpoints rather than persisted and routed through the same store-and-forward pipeline. Separating signaling from media this way lets WhatsApp reuse mature messaging infrastructure for call setup while giving the live media stream its own transport optimized purely for throughput and latency, with no expectation that any single packet must arrive.

## Encrypting a stream instead of a stored message

Voice and video calls are end-to-end encrypted using the same Signal Protocol session established between two devices for text messaging, but the mechanics differ from encrypting a discrete message: a call needs a continuous stream of frames encrypted and decrypted in real time, fast enough to never introduce perceptible lag, with keys derived from the call session rather than re-running a full key exchange per packet. Because real-time media tolerates loss but not delay, the encryption scheme has to be resilient to the fact that some packets will simply never arrive — unlike a text message, there's no retry that makes sense once a video frame's moment has passed.

## Scaling calls beyond two participants

Group calling multiplies the problem: instead of one encrypted stream between two devices, every participant potentially needs a stream to and from every other participant, an approach that gets expensive fast as headcount grows on a mobile network with limited, variable bandwidth. WhatsApp's group calling capacity grew over time from a small handful of participants to numbers far larger, which required moving away from a pure mesh of direct connections between every pair of devices toward architecture that can relay and mix streams more efficiently, adapting each participant's outgoing quality to their actual network conditions rather than forcing everyone to the lowest common denominator.

## What you can borrow

- Real-time and store-and-forward are different reliability models — don't force a system optimized for eventual delivery to also handle live streams; give each its own transport.
- Reuse existing reliable-delivery infrastructure for control and signaling messages even when the payload they set up has completely different latency needs.
- Design encryption for a stream to tolerate loss gracefully — a scheme that assumes every unit must arrive doesn't fit real-time media.
- As group size grows, mesh topologies (every peer connects to every peer) stop scaling well before the underlying encryption or codec choices become the bottleneck; plan the topology change earlier than seems necessary.
