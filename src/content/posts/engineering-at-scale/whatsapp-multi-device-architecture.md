---
title: "Four Linked Devices, No Phone Required: WhatsApp's Multi-Device Redesign"
slug: "whatsapp-multi-device-architecture"
description: "How WhatsApp re-architected linked devices to connect to its servers independently, without a phone relaying every message, while keeping end-to-end encryption intact."
publishedAt: "2025-08-14"
category: "WhatsApp"
tags:
  - Engineering at Scale
  - WhatsApp
  - Multi-Device
  - Cryptography
sources:
  - title: "WhatsApp Security Whitepaper"
    publisher: "WhatsApp"
    url: "https://www.whatsapp.com/security"
  - title: "The Double Ratchet Algorithm"
    author: "Trevor Perrin and Moxie Marlinspike"
    publisher: "Signal"
    url: "https://signal.org"
---

For years, using WhatsApp on a laptop meant your phone had to stay powered on and connected to the internet, quietly relaying every message between your desktop browser and WhatsApp's servers. If the phone's battery died or its network dropped, WhatsApp Web died with it. That design wasn't an oversight — it followed directly from how the encryption worked. Each account had exactly one cryptographic identity, tied to the phone, and every other "linked device" was really just a screen mirroring that one identity through it. Removing the phone from that loop meant rethinking how encrypted identity worked for an account, not just shipping a new client.

## From phone-as-relay to independent devices

The redesigned multi-device architecture gives each linked device — phone, desktop app, web browser, tablet — its own independent identity keys and its own direct connection to WhatsApp's servers. A desktop client no longer asks the phone to forward messages; it fetches and sends them on its own, the same way the phone does. Up to four companion devices can be linked to one account simultaneously, all active at once, none of them subordinate to the others as a relay. This meant WhatsApp's servers now had to track and route messages to a *set* of devices per user instead of one, and it meant the encryption model, originally built around pairwise Signal Protocol sessions between two devices, needed an extension that could reach every device in that set without weakening the end-to-end guarantee.

## Encrypting one message for every device, not just one

Sending a message in a multi-device account means encrypting it separately for every linked device on both the sender's and recipient's side — your phone, your desktop, and every device the recipient has linked all need their own copy, each encrypted under that specific device's session keys. This is structurally similar to the fan-out problem WhatsApp had already solved for group messaging, where a message needs independent delivery to many recipients, except now it applies even to a single one-to-one conversation the moment either party has more than one device linked. The sending device maintains a session with every device in scope and re-encrypts per recipient device rather than the server ever seeing, storing, or forwarding a decrypted copy — the server's job is purely routing ciphertext to the right set of endpoints.

## Keeping the device list itself trustworthy

A multi-device system introduces a new attack surface that a single-identity system never had to worry about: what stops a malicious actor from silently adding their own device to someone else's account and receiving a copy of every message? WhatsApp addresses this by having the primary device (the phone) cryptographically sign the list of linked devices, and every other device and every contact's client can verify that signature before trusting the device list is legitimate. Linking a new device requires an explicit, visible action — typically scanning a QR code from an already-authenticated device — and any change to the device list is something contacts' clients can detect, closing the gap where a rogue device could be added invisibly.

## What you can borrow

- When one node acting as a relay for others becomes a single point of failure, question whether that node needs to be structurally special at all.
- Extending a security model to a new topology (one identity to many) is often closer to a fan-out problem you've already solved elsewhere than a brand-new design.
- Let the party who owns a set of trusted endpoints sign changes to that set, so every other participant can verify membership without asking a central server to vouch for it.
- Make security-relevant state changes (like adding a new device) visible and explicit to the account owner, not silent background events.
