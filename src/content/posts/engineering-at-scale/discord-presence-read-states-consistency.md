---
title: "Presence and Read States: Keeping Millions of Discord Clients in Sync"
slug: "discord-presence-read-states-consistency"
description: "How Discord keeps online status and per-channel read state consistent across millions of simultaneously connected clients without collapsing under fan-out."
publishedAt: "2025-07-15"
category: "Discord"
tags:
  - Engineering at Scale
  - Discord
  - Real-Time Systems
  - Distributed Systems
---

Two of the least glamorous features in Discord — the green dot showing a user is online, and the unread-message indicator on a channel — turn out to be among the hardest problems in the whole system to keep consistent at scale. Presence has an extreme fan-out problem: a single user going online or offline is a fact that potentially needs to be pushed to everyone in every mutual server, which for a popular server can mean broadcasting one state change to hundreds of thousands of connected clients simultaneously. Read state has a different but equally thorny problem: it's per-user, per-channel state that has to update instantly on the device you're reading from while staying eventually correct across every other device you're logged into, without generating a write for every single message you scroll past.

## Presence as an aggressively rate-limited broadcast problem

Naively, a presence update would fan out to every member of every mutual guild the instant a user's status changed, but at Discord's largest server sizes that naive approach doesn't scale — a large public server can have far more members than could plausibly be shown online-status updates for in real time, and most of those members aren't even looking at a member list at any given moment. Discord's presence system leans on the fact that clients only need presence data for guilds and channels they're actively viewing, so presence updates are scoped and rate-limited rather than broadcast unconditionally to every connection with any relationship to the affected user. The gateway architecture (built on Elixir and the BEAM's lightweight-process model) is what makes this kind of per-connection, per-subscription filtering tractable at Discord's connection count, since each connection's subscriptions can be tracked and evaluated independently.

Discord also had to deal with the "reconnect storm" problem directly: if a large fraction of a popular server's members reconnect around the same time — after a regional network blip, for instance — presence recalculation across the whole guild can spike load dramatically for a brief window, which pushed Discord toward deliberately smoothing and batching presence recomputation rather than recalculating naively on every individual reconnect event.

## Read state as sparse, session-tolerant bookkeeping

Read state — which messages you've seen in which channels — needs to feel instantaneous locally (the unread badge disappears the moment you open a channel) while staying reasonably in sync across every device you use Discord from, without generating a database write for every message a user's client renders. Discord's approach treats read state as comparatively sparse: rather than persisting an acknowledgment for every message, it tracks the last-read position per channel per user, updated as you actually read, and reconciles that against the channel's message stream to compute unread counts and mention badges on demand.

```
client A reads channel  --> ack(last_read_message_id) --> stored per user, per channel
client B (same user)    <-- unread count recomputed from last_read_message_id vs. latest message
```

This design accepts a bit of eventual consistency across a single user's multiple devices — a brief window where one device hasn't yet learned that another device marked a channel read — in exchange for avoiding a much heavier bookkeeping cost per message per reader, which would not scale to Discord's message volume across millions of simultaneously connected users.

## Designing for "close enough, instantly" over "exact, eventually"

The common thread across both systems is a deliberate choice to prioritize responsiveness and scalability over perfect real-time accuracy for every observer. A presence indicator that's occasionally a few seconds stale, or an unread badge that takes a brief moment to sync across your other devices, is a completely acceptable trade for a system that has to serve these updates to millions of concurrently connected clients without buckling under fan-out cost.

## What you can borrow

- Scope broadcast-style state (like presence) to what a client is actually subscribed to or viewing, rather than pushing every change to every conceivably interested connection.
- Watch for correlated reconnect or resubscribe events (regional outages, deploys) that can turn a normally cheap recalculation into a load spike, and smooth or batch around them deliberately.
- Track sparse "last acknowledged position" state instead of a record per item, when you can derive everything you need (like unread counts) from comparing a position against a stream.
- Accept eventual consistency across a single user's devices for low-stakes state — the UX cost of a few seconds of staleness is usually much lower than the infrastructure cost of avoiding it entirely.
