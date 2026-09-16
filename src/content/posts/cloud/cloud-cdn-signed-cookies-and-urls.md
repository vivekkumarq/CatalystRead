---
title: "CDN Signed Cookies and Signed URLs: Delegating Access Without Opening the Bucket"
slug: "cloud-cdn-signed-cookies-and-urls"
description: "CloudFront, Cloud CDN, and Azure Front Door style signatures: expiry, prefix scope, and the leak that is a URL in a log file."
publishedAt: "2026-09-15"
category: "Cloud"
tags:
  - Cloud
  - CDN
  - Security
  - Authorization
sources:
  - title: "Serving private content with signed URLs and signed cookies"
    publisher: "Amazon CloudFront"
    url: "https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/PrivateContent.html"
  - title: "Signed URLs and cookies"
    publisher: "Google Cloud CDN"
    url: "https://cloud.google.com/cdn/docs/using-signed-urls"
---

A public CDN origin is a bucket with a policy of "anyone with the URL." For private video, software downloads, or tenant files, you want the **edge** to authorize without the app proxying gigabytes. **Signed URLs** put the signature in the query string. **Signed cookies** put it in `Cookie` so every `GET` on a path prefix can reuse one login-shaped grant. Both are HMAC (or similar) over expiry, path, and sometimes IP. The origin can stay locked to the CDN.

## URLs versus cookies

A signed URL is easy to share — that is a feature for a download link and a bug for a multi-file course module. A signed cookie can cover `/lessons/123/*` so the player can fetch segments without signing each. Cookies need HTTPS, correct `Domain`/`Path`, and a CDN that forwards them on the right names. Cross-site players and some mobile webviews make cookies harder than URLs.

```text
HMAC(key, "resource + expiry + optional IP") → URL or Set-Cookie
edge verifies, then fetches origin (OAC / origin allowlist)
```

**Expiry** is the main control. Five minutes for a one-shot download; hours for a lecture with pause. Clock skew between the signer and the edge drops valid users. Sign on the server; never ship the signing key to the browser. Rotate keys; CloudFront's key pairs and GCP's signed URL keys have rotation stories — use two keys during rollout.

## Prefixes, policy documents, and leaks

A policy that signs `*` is a bearer token for the whole distribution. Scope to the object or prefix. Custom policies (CloudFront) can restrict source IP; NAT users will hate you, CGNAT even more. Logs: access logs and `Referer` headers will store signed URLs. Treat logs as sensitive or strip query strings. Slack and email are where signed URLs go to become public.

Hotlinking: a signed URL in an `<img>` on a forum still works until expiry. Short TTL plus cache-control on the object is a trade: CDN cache hits versus leftover valid URLs.

## Origin must not be a bypass

If the S3 bucket is also world-readable, signatures are decoration. Use origin access control, GCS origin auth, or firewall so only the CDN can fetch. The app should mint signatures after **its** session check.

Read your CDN's private-content chapter for the exact canonical string. An extra slash in the path invalidates the HMAC and produces a support ticket that looks like a CDN outage. Signed access is cryptography plus logging hygiene. Miss either and you have a public bucket with extra steps.
