---
title: "Let's Encrypt and ACME: Automated Certificates as a Protocol, Not a Cron Hack"
slug: "lets-encrypt-acme-automated-certs"
description: "RFC 8555: account keys, HTTP-01 and DNS-01 challenges, short-lived certs, and the operational habits that keep renewals from becoming outages."
publishedAt: "2026-08-24"
category: "Security"
tags:
  - Security
  - TLS
  - ACME
  - Let's Encrypt
sources:
  - title: "RFC 8555: Automatic Certificate Management Environment (ACME)"
    publisher: "IETF"
    url: "https://www.rfc-editor.org/rfc/rfc8555"
  - title: "Let's Encrypt documentation"
    publisher: "ISRG"
    url: "https://letsencrypt.org/docs/"
---

Let's Encrypt did not win because it is a cheaper CA. It won because **ACME** (RFC 8555) made issuance a machine protocol: prove control of a name, get a certificate, repeat before expiry. Ninety-day lifetimes (and the ecosystem moving shorter) are intentional. Humans forget to renew. Bots should not.

## The account key is your identity to the CA

You register an ACME account with a key pair. Issuance requests are signed with that key. Losing it without registered recovery contacts is annoying; leaking it lets someone request certs for names you can still validate. Store account keys like credentials. Rate limits are per account and per name; a retry loop on failure is how you earn a lockout during an incident.

**HTTP-01** puts a token on `/.well-known/acme-challenge/` over port 80. The CA fetches it. Load balancers that do not forward `/.well-known`, or that force HTTPS without serving the challenge, break issuance. **DNS-01** puts a TXT record on `_acme-challenge.example.com`. It works for wildcard certs; it requires an API to your DNS that is itself a high-value credential. **TLS-ALPN-01** exists for hosts that can speak a special ALPN on 443.

```text
newOrder → challenges pending → client satisfies HTTP-01 or DNS-01
CA validates → finalize CSR → download cert
```

## Automation is the security control

certbot, lego, Caddy's built-in ACME, cert-manager on Kubernetes: pick one and **alert on days-to-expiry**. A cert that renews in place must be loaded by the process that terminates TLS. nginx needs a reload; some stacks need a full bounce. Kubernetes `Certificate` resources that do not mount into the ingress are a museum of valid secrets next to expired listeners.

Do not copy Let's Encrypt certs into git. Do not pin a single leaf cert in mobile apps (pin the CA or use your own PKI). Staging ACME exists; use it in CI so you do not burn prod rate limits.

CAA records restrict which CAs may issue. If you set CAA and forget Let's Encrypt, issuance fails closed — good, if you meant it.

## Multi-name and multi-environment

A cert with 50 SANs is a blast radius. Split by environment. Prefer names you can prove automatically. Internal names without public DNS need DNS-01 on a private zone the CA cannot see — which means Let's Encrypt is the wrong CA unless you use DNS in public or a different private CA with ACME (Smallstep, etc.).

Read RFC 8555's challenge types, then trace one renewal in logs from order to reload. If renewal is "the person who knows the DNS portal," you do not have ACME. You have a calendar reminder with extra steps.
