---
title: "Real-Time Voice and Video Calling on Top of a Messaging Backbone"
slug: "whatsapp-voice-video-calling-infrastructure"
description: "How WhatsApp built low-latency, end-to-end encrypted voice and video calling on infrastructure originally designed for asynchronous store-and-forward messaging."
publishedAt: "2026-01-08"
updatedAt: "2026-09-16"
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

## A concrete failure mode for calling on a chat stack

WhatsApp calling is a different reliability world from store-and-forward chat: NAT traversal, relays, codecs, and packet loss. The failure mode is routing calls through the same chat servers that hold millions of idle TCP sessions, so a call setup storm hurts messaging. Mid-size steal: a separate signaling path and a TURN fleet with a budget, plus a fallback to audio when video cannot hold.

The concrete failure mode is a relay that is in the wrong geography, adding 400ms, which users describe as "WhatsApp is broken" even though chat is fine. Measure RTT and hairpin rate. Operational gotcha: permissions and background behavior on iOS/Android that kill the call when the chat app is optimized away. That is a client incident. Group calls multiply SFU cost; cap and degrade. E2E calling adds key agreement on the setup path; a slow crypto step looks like ring-forever. Time out loudly. If you cannot staff WebRTC, buy a CPaaS and keep chat. Steal ICE/TURN understanding before you customize. Packet loss concealment and jitter buffers are the product on cellular. Test in lossy networks, not on office LAN. Emergency calling and legal intercept rules differ from chat; do not assume. The steal is isolating real-time media as its own SLO. The anti-steal is a weekend WebRTC demo glued onto the message socket.

Calling also fails in ways chat dashboards never show. ICE can succeed to a relay while the selected candidate pair is hairpinning through a far-away POP because the first nominated pair "worked" on a poor RTT sample. Force periodic quality probes after connect, not only at setup, and be willing to restart ICE when loss stays high. Symmetric NAT and carrier-grade NAT still send a large fraction of mobile calls to TURN; treat relay minutes as a cost center with per-user abuse caps, or a botnet will use you as free bandwidth. Codec negotiation that prefers a high-bitrate profile on a 2G-class radio will look like a hang: the ring completes, then the first I-frame never arrives. Start conservative, upshift when the network proves it. One-way audio is usually a permission, Bluetooth routing, or a mute-state desync, not "the SFU is down" — give on-call a client breadcrumb (selected candidate, codec, RTT, fraction lost) in the call id. Recording and voicemail, if you add them, are a second media path with consent and retention rules; bolting them onto the live mixer without a separate store is how you leak a call into logs. Staff a soak test on real cellular traces. Office Wi-Fi will certify a stack that dies on trains.

## What you can borrow

- Real-time and store-and-forward are different reliability models — don't force a system optimized for eventual delivery to also handle live streams; give each its own transport.
- Reuse existing reliable-delivery infrastructure for control and signaling messages even when the payload they set up has completely different latency needs.
- Design encryption for a stream to tolerate loss gracefully — a scheme that assumes every unit must arrive doesn't fit real-time media.
- As group size grows, mesh topologies (every peer connects to every peer) stop scaling well before the underlying encryption or codec choices become the bottleneck; plan the topology change earlier than seems necessary.
