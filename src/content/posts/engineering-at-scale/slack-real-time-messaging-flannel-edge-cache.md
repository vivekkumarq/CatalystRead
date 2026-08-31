---
title: "Slack's Real-Time Backbone: Flannel and the Websocket Fleet"
slug: "slack-real-time-messaging-flannel-edge-cache"
description: "How Slack built the Flannel edge cache and a websocket gateway tier to hydrate huge workspaces instantly without hammering primary databases."
publishedAt: "2025-12-13"
category: "Slack"
tags:
  - Engineering at Scale
  - Slack
  - WebSockets
  - Real-Time Systems
---

Opening Slack looks instant, but underneath it requires assembling a large amount of state fast: channel lists, membership, user profiles, presence, and unread counts, potentially for a workspace with hundreds of thousands of users spread across thousands of channels. Some of Slack's largest enterprise customers run workspaces at a size where naively querying all of that from primary datastores on every client connect or reconnect would be both too slow for users and dangerously heavy load on core databases, especially during connection storms.

## Flannel: a cache shaped around the connect problem

Slack's answer, described in their engineering blog, was Flannel — an edge caching layer purpose-built for this exact problem rather than a generic cache. Flannel runs as a fleet of cache servers holding an in-memory, pre-hydrated view of the data a client needs immediately on connect: channel membership, user information, and related workspace state, organized around the natural unit of a team or workspace shard. Instead of a cold-start query against primary storage on every connection, clients get a fast initial state from a cache tier designed specifically to answer that one question quickly, which matters most for exactly the largest, highest-value workspaces where a real cold query would be slowest.

## The websocket gateway tier

Once connected, Slack's live updates — new messages, typing indicators, presence changes — flow over persistent websocket connections maintained between every client and a tier of gateway servers. Slack has written about the operational challenges of running this connection layer at scale: handling connection storms when many clients reconnect at once, for example after a network blip or a deploy, and routing updates efficiently to potentially enormous numbers of simultaneously connected clients within one large workspace without triggering a fan-out problem structurally similar to the celebrity-account fan-out challenge other feed and messaging systems face.

Slack has also published postmortems describing incidents where infrastructure hiccups triggered mass client reconnects that then compounded into a secondary, self-inflicted load spike — a thundering herd of reconnect attempts hitting the gateway tier right when it was already recovering. That experience pushed Slack toward adding jitter and backoff to client reconnect logic, so that a shared trigger event (like a deploy or a brief network issue) doesn't cause every client to retry at exactly the same moment and re-create the very problem the retries were meant to recover from.

## Scaling the pipeline underneath

Behind the gateway and cache tiers, Slack has described building out job scheduling and queueing infrastructure to absorb bursts — a large workspace sending a message that needs to notify and update a large number of simultaneously connected clients generates a burst of downstream work that has to be smoothed out rather than processed synchronously in the request path, as Slack scaled from thousands to tens of millions of daily active users.

## What you can borrow

- For any product with expensive-to-assemble initial state, a dedicated read-optimized cache tier sitting between clients and the source of truth is often a better investment than trying to optimize the primary database query itself.
- Add jitter and exponential backoff to any client reconnect logic — without it, a shared trigger event turns into a synchronized retry storm that can re-create the outage it's recovering from.
- Treat your largest tenant or workspace as its own distinct load-testing scenario, not just a bigger version of the average case; the failure modes are often qualitatively different, not just larger.
- Move bursty downstream work (notifications, fan-out updates) onto queues rather than handling it synchronously in the request path that triggered it.
