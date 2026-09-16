---
title: "The Signal Protocol's Double Ratchet: Forward Secrecy as a State Machine"
slug: "signal-protocol-double-ratchet"
description: "DH ratchet plus symmetric ratchet: why stealing today's session key should not decrypt last month's messages, and what you must persist carefully."
publishedAt: "2026-08-23"
category: "Security"
tags:
  - Security
  - Cryptography
  - Messaging
  - Signal
sources:
  - title: "The Double Ratchet Algorithm"
    author: "Trevor Perrin and Moxie Marlinspike"
    publisher: "Signal"
    url: "https://signal.org/docs/specifications/doubleratchet/"
  - title: "The X3DH Key Agreement Protocol"
    author: "Moxie Marlinspike and Trevor Perrin"
    publisher: "Signal"
    url: "https://signal.org/docs/specifications/x3dh/"
---

Signal's messaging security is not "we use AES." It is a **session** that evolves after every message. The **Double Ratchet** (Perrin and Marlinspike) combines a Diffie-Hellman ratchet (new DH secrets as parties send) with a symmetric-key ratchet (HKDF chain keys that step forward per message). Compromise of a current chain key should not decrypt **past** messages (forward secrecy). Delayed messages and out-of-order delivery are handled with stored skipped-message keys, which is also where memory and deletion policy get real.

## Two ratchets, one session

After X3DH (or a similar handshake) both sides share a root key. When Alice sends, she may attach a new DH public value. Bob mixes that into the root, derives a new receiving chain, and Alice's sending chain steps. Each message also steps the **symmetric** chain: `chain_key → (message_key, next_chain_key)`. Message keys are used once. You cannot go backwards without the previous chain key, which you delete.

```text
root_key --DH--> new root, sending chain
message 1: mk1, chain advances
message 2: mk2, chain advances
```

The DH ratchet heals **future** secrecy after a compromise if the attacker does not stay on path (post-compromise security, in the optimistic sense of the spec). It is not magic against an attacker who still owns the device.

## Skipped keys and the state file

If Bob receives message 5 before 3 and 4, he must derive and **store** message keys 3 and 4 or drop them. Those skipped keys are plaintext-equivalent for those messages. A client that dumps session state unsafely (backup, logs, world-readable Android files) undoes the ratchet. A client that never deletes skipped keys grows an attack surface. The spec discusses limits.

Implementing this yourself for a product chat is how you ship "Signal-like" that is not Signal-like. Use a maintained library (libsignal, native platform APIs) and still own: identity key management, safety numbers / verification, multi-device (Sesame / linked devices are extra protocol), and server metadata. The ratchet does not hide who talks to whom on your always-on relay.

## What not to bolt on

Do not mix the ratchet with a server that can inject keys without user-visible identity checks. Do not reuse message keys. Do not log decrypted bodies "for support." Group messaging (Sender Keys, newer group protocols) is another design; pairwise Double Ratchet does not automatically scale to 500-member rooms without a group layer.

If you need encryption at rest for a database, this is the wrong paper. If you need asynchronous chat where parties are rarely online, X3DH plus Double Ratchet is the right lineage.

Read the Double Ratchet spec's KDF diagrams and the skipped-message section. Then audit what your client persists. Forward secrecy lives or dies in the delete() calls, not in the marketing name of the cipher.
