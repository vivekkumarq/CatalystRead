---
title: "Encrypting and Distributing Billions of Photos and Videos on WhatsApp"
slug: "whatsapp-encrypted-media-delivery-attachments"
description: "How WhatsApp delivers encrypted media efficiently by separating attachment transfer from message delivery and verifying content by hash."
publishedAt: "2025-10-20"
category: "WhatsApp"
tags:
  - Engineering at Scale
  - WhatsApp
  - Cryptography
  - Media
---

Sending a photo is a completely different engineering problem from sending a text message. A text fits comfortably in a single small packet pushed through the same real-time pipe as everything else; a photo or video can be megabytes, needs to survive spotty mobile uploads without corrupting, and — once WhatsApp rolled out end-to-end encryption everywhere — needed to stay unreadable to WhatsApp's own servers while still being efficiently deliverable to a recipient who might not be online for hours. Treating media exactly like a chat message would have meant either bloating the messaging pipeline with huge payloads or weakening the encryption guarantee to make server-side handling easier. WhatsApp did neither.

## Separating the message from the payload

Instead of pushing large media blobs through the same delivery path as chat messages, WhatsApp splits the two: the actual photo or video is uploaded to media storage as an encrypted blob, and what travels through the normal message pipeline is a small pointer — effectively a message that says "here is where to fetch this attachment and here is the key to decrypt it" — along with a thumbnail-sized preview for immediate display. This keeps the latency-sensitive real-time messaging path lightweight regardless of attachment size, while media transfer happens over a separate, more suitable path optimized for large, resumable file transfer rather than instant delivery.

## Encrypting media without breaking end-to-end guarantees

Each media file is encrypted client-side with its own randomly generated key before upload, so the blob sitting on WhatsApp's servers is unreadable without that key — servers store ciphertext, not content. The encryption key itself travels to the recipient the same way any other end-to-end encrypted message content does, inside the encrypted message envelope, meaning WhatsApp's infrastructure can host and serve the encrypted bytes at scale without ever holding the key needed to decrypt them.

```text
Upload:   client encrypts media -> uploads ciphertext blob -> gets storage URL
Message:  client sends {url, decryption key, content hash} inside E2E envelope
Download: recipient fetches ciphertext -> decrypts locally using key from message
```

A cryptographic hash of the encrypted content is included alongside the key, so the recipient's client can verify that what it downloaded matches exactly what was uploaded, protecting against tampering or corruption anywhere along the storage and delivery path without needing the server itself to be trusted.

## Efficient distribution at global scale

Because media blobs are content-addressed and immutable once uploaded, WhatsApp can lean on standard caching and content-delivery techniques to distribute popular or frequently re-shared media — the same forwarded video landing in many chats doesn't need to be re-uploaded or independently stored for every recipient — while each recipient still needs a valid decryption key delivered through their own encrypted message envelope to actually access the content. This split between "how the bytes move efficiently" and "who is cryptographically allowed to read them" is what lets WhatsApp handle enormous media volume without either compromising the encryption model or paying the storage and bandwidth cost of full duplication for every share.

## What you can borrow

- Don't force large payloads through a pipeline built for small, latency-sensitive messages; separate the control-plane message from the bulk-data transfer.
- Encrypt large content client-side with a per-object key, and deliver that key through your already-trusted channel rather than building new trust infrastructure for media specifically.
- Content-address immutable blobs so you can safely cache and deduplicate storage without needing every consumer to trust the same access path.
- Always give the receiving side a way to verify integrity (a hash) independent of whether it trusts the storage layer.
