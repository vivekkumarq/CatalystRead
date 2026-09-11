---
title: "Zanzibar: How Google Built One Authorization System for Everything"
slug: "google-zanzibar-global-authorization"
description: "Inside Zanzibar, the globally consistent authorization system that decides who can access what across Google Drive, Calendar, Photos, and Maps."
publishedAt: "2026-08-03"
category: "Google"
tags:
  - Engineering at Scale
  - Google
  - Security
  - Distributed Systems
sources:
  - title: "Zanzibar: Google's Consistent, Global Authorization System"
    author: "Ruoming Pang et al."
    publisher: "USENIX ATC 2019"
    url: "https://research.google"
---

Access control sounds simple until you have to run it across dozens of products, billions of users, and permission relationships that get genuinely complicated: a Google Drive folder shared with a specific group, which itself contains a subgroup, where one member also has an individual share on a single file inside that folder, and where all of that has to resolve correctly and consistently within milliseconds on every single access check, globally, without ever incorrectly granting access even briefly during a permission change. Left to grow organically, every product team at Google would have built its own bespoke authorization logic, with its own bugs, its own consistency guarantees (or lack of them), and its own way of representing something as basic as "is this user a member of this group." Zanzibar, described in the 2019 USENIX ATC paper "Zanzibar: Google's Consistent, Global Authorization System" by Ruoming Pang and coauthors, was built to be the one authorization system instead, serving check requests across Google Drive, Calendar, Photos, Maps, and YouTube, among many other products.

## Relationship tuples: one data model for every kind of permission

Zanzibar's core abstraction is deceptively simple: every permission relationship, no matter how complex the product's actual sharing model is, is represented as a relationship tuple of the form object#relation@user — "this document has this relation to this user (or group)." A folder being shared with a group becomes a tuple; that group having members becomes more tuples; a subfolder inheriting a parent folder's permissions becomes a rule referencing the parent's tuples rather than needing its own separate copy. Access checks then become graph traversal over these tuples: does a path exist connecting the requesting user to the requested permission on the requested object, potentially through several layers of group membership and inheritance.

This uniform representation is what let Zanzibar serve wildly different products' authorization models through the same underlying system — a namespace configuration per product defines the specific relations and inheritance rules that product needs, while the tuple storage, indexing, and check evaluation machinery underneath is completely shared.

## "New enough" consistency instead of always-latest

The hardest technical problem Zanzibar had to solve is a subtle consistency issue: when someone revokes another user's access, every subsequent access check anywhere in the world needs to reflect that revocation, immediately, with no window where a stale check could still say "access granted." But requiring every single check to hit the absolute latest global state, everywhere, would be prohibitively slow at Zanzibar's request volume. Zanzibar's answer is a mechanism it calls "zookies," tokens that let a check request specify it needs to see at least as recent a state as some reference point, giving callers a way to get strong, "new enough" consistency exactly when the safety guarantee actually matters (right after a permission change) without paying that cost on every single check globally.

## What you can borrow

- Centralizing authorization logic into one shared system, rather than letting every product or service implement its own, eliminates an entire class of inconsistent-permission-bugs and security gaps.
- A uniform relationship-graph data model (object, relation, subject) can represent surprisingly varied permission schemes — direct sharing, group membership, inheritance — through the same underlying mechanism.
- Distinguish between checks that need strict, just-happened consistency (right after a permission revocation) and checks that can tolerate slightly stale reads — treating every check as needing the strictest guarantee is usually unnecessary and expensive.
- Design your authorization system's data model to be extensible per-product (Zanzibar's namespace configs) rather than hardcoding one product's sharing semantics into the core system.
- Authorization is worth treating as shared infrastructure early, even at moderate scale — retrofitting consistent access control after every team has already built its own is far more painful than starting centralized.
