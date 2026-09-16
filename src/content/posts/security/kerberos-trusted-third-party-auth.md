---
title: "Kerberos: The Trusted Third Party You Already Depend On"
slug: "kerberos-trusted-third-party-auth"
description: "AS, TGS, tickets, and clocks: how Kerberos avoids sending passwords to every service, and why skew and SPNs still page AD admins."
publishedAt: "2026-08-19"
category: "Security"
tags:
  - Security
  - Authentication
  - Kerberos
  - Identity
sources:
  - title: "RFC 4120: The Kerberos Network Authentication Service (V5)"
    publisher: "IETF"
    url: "https://www.rfc-editor.org/rfc/rfc4120"
  - title: "Kerberos: An Authentication Service for Open Network Systems"
    author: "Jennifer G. Steiner, Clifford Neuman, Jeffrey I. Schiller"
    publisher: "USENIX Winter 1988"
    url: "https://web.mit.edu/kerberos/www/papers.html"
---

Kerberos is a **trusted third party**. Clients and services share secrets with a Key Distribution Center (KDC), not with each other. You prove who you are once to the Authentication Service, receive a **Ticket-Granting Ticket** (TGT), then ask the Ticket-Granting Service for per-service tickets. Passwords (or keys) are not sent to the file server. Active Directory's domain login, many Hadoop clusters, and a surprising number of internal HTTP SPNEGO setups are this protocol in a suit.

## Tickets are encrypted capability blobs

A ticket is encrypted in the **service's** key. The client cannot read the server's copy; it can present it. An authenticator (timestamp, encrypted in the session key) proves the presenter is alive and holds the session key. Replay caches exist because authenticators would otherwise be reusable until the ticket expires.

```text
client → AS  (preauth, get TGT)
client → TGS (present TGT, get service ticket for HTTP/app.example.com)
client → app (SPNEGO / GSSAPI, present service ticket)
```

**Service principal names** (SPNs) bind a ticket to a specific service identity. A wrong SPN (`HTTP/host` vs `HTTP/cname`) is the classic "can't authenticate to this URL" ticket. Keytabs on servers must match the KDC. Rotate a computer account password without updating the keytab and you get checksum failures, not a friendly HTTP 401 reason.

## Clocks are a security control

Authenticators carry time. Default allowable skew is often five minutes. A VM that NTP-drifts becomes unable to get tickets, or worse, becomes a replay window if you loosen skew. Kerberos incidents that look like "DNS" are sometimes time. Always check clocks before you rebuild keytabs.

The KDC is high-value. Compromise of the krbtgt key forges TGTs (**golden tickets** in AD lore). Protect KDC backups and krbtgt rotation. Constrained delegation and protocol transition exist because real apps need to call a second service as the user; they also expand the blast radius when misconfigured.

## Where Kerberos is the wrong tool

Public internet users, mobile apps, and third-party SaaS are OAuth/OIDC territory. Kerberos wants a realm, joined machines or well-managed keytabs, and a network that can reach the KDC (or a RODC/read-only pattern). Over the open web, tickets and UDP/TCP 88 through NATs are misery. Negotiate/Kerberos on a load-balanced HTTP farm needs consistent SPNs and often channel binding awareness.

If you are designing a new internal RPC auth in 2026, mTLS or workload identity may be simpler than standing up a realm. If you already have AD, use Kerberos rather than inventing a bearer token that never expires and gets copied into wikis.

Read RFC 4120's message flows once. Then map them onto `kinit`, `kvno`, and your HTTP reverse proxy's SPNEGO module. The trusted third party is only as trustworthy as the KDC and time.
