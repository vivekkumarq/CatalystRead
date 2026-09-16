---
title: "TLS for Backend Developers"
slug: "tls-for-backend-developers"
description: "Most backend engineers treat TLS as something a load balancer handles — until a service-to-service call or a certificate expiry proves otherwise."
publishedAt: "2025-04-02"
updatedAt: "2026-09-16"
category: "Security"
tags:
  - Security
  - TLS
  - Networking
  - Backend
---

Most backend engineers interact with TLS the way they interact with electrical wiring — trusting it works, not looking closely at it, until something fails at 2 a.m. That's a reasonable division of labor for a public-facing HTTPS endpoint terminated at a load balancer with a managed certificate. It stops being reasonable the moment you're configuring service-to-service communication, debugging a handshake failure, or deciding whether an internal API really needs plaintext HTTP because "it's inside the VPC anyway."

## What the handshake is actually doing

A TLS handshake accomplishes two separate things, and conflating them is where a lot of misconfiguration comes from. First, it authenticates the server — the client verifies that the certificate presented was issued by a trusted authority and matches the hostname being connected to, which is what stops a man-in-the-middle from silently impersonating your API. Second, it negotiates a shared symmetric key that both sides then use to encrypt the actual traffic, because asymmetric encryption is too slow to use for the full data stream.

Certificate validation is the part that gets silently disabled during debugging and then forgotten in production. Every HTTP client library has an option to skip certificate verification, usually named something like `verify=False` or `rejectUnauthorized: false`, and it exists because local development against a self-signed cert is common enough to need an escape hatch.

```python
# Never ship this — it defeats the entire point of TLS
requests.get(url, verify=False)

# Point at your internal CA instead of disabling verification
requests.get(url, verify="/etc/ssl/certs/internal-ca.pem")
```

The moment that flag ships to production, TLS on that connection is providing encryption without authentication — traffic is unreadable in transit, but the client has no way to confirm it's actually talking to the server it thinks it is.

## Internal traffic isn't automatically safe

"It's inside the VPC" is a weaker security boundary than it sounds. Cloud network isolation protects against traffic originating outside the network, not against a compromised container, a misconfigured security group, or a malicious dependency running inside your own infrastructure with network access. Service-to-service traffic that's plaintext because it never leaves the private network is one compromised pod away from being fully readable, including any credentials or tokens riding along in headers.

Mutual TLS (mTLS) addresses the version of this problem where you also need to authenticate the client, not just the server — useful for internal service meshes where you want every service to prove its identity to every other service, not just encrypt the pipe between them. It's more operational overhead — certificate issuance and rotation for every service instance rather than just your public-facing endpoints — which is why it's usually adopted through a service mesh or sidecar proxy that handles certificate lifecycle automatically rather than hand-rolled per service.

## Certificate expiry as an operational problem

The most common TLS incident isn't a cryptographic failure — it's an expired certificate nobody rotated in time, taking down a service that was cryptographically sound right up until midnight. Automating renewal, through something like ACME-based issuance for public certs or your internal CA's own automation for service certs, removes the failure mode entirely rather than relying on a calendar reminder.

Monitoring expiry independently of the renewal automation is worth the redundancy — automation fails silently often enough that a separate check alerting at thirty and seven days out has saved more outages than any amount of cipher suite tuning. TLS configuration details like minimum protocol version and cipher suite selection matter, but they're rarely what takes a service down; an expired cert or a disabled verification flag is.

## A worked failure mode

TLS is terminated and HTTP goes to the app across a shared VPC; someone adds a debug sidecar that logs plaintext. `verify=false` in a client because of a corporate proxy. Old TLS 1.0 is kept for a vendor. The failure is encryption that stops at the load balancer without a policy. mTLS or a mesh if the network is not trusted; never disable verify in prod; cut old protocols.

## When this is the wrong tool

Custom TLS code is the wrong tool—use the platform. Do not "encrypt in the app" with a homemade cipher. Care about TLS configs when you own clients and ciphers; still never skip verify.

Copy-paste from an internal success is still a failure mode. The last team had different traffic, a different datastore, and six months of scars. "TLS for Backend Developers" should be adopted with the scars attached: the dashboard they wished they had, the migration they feared, the incident that made the rule. If those artifacts are missing, you are adopting a slide. Spend a day interviewing the last on-call before you spend a quarter implementing their diagram.
