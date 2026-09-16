---
title: "Cloud Verdicts: Windows Defender's MAPS Loop Against Fresh Malware"
slug: "microsoft-windows-defender-cloud-protection"
description: "How Microsoft Defender uses local sensors plus cloud-side reputation and ML verdicts so a newly seen binary can be blocked without waiting for a monthly signature drop."
publishedAt: "2026-10-01"
updatedAt: "2026-10-01"
category: "Microsoft"
tags:
  - Engineering at Scale
  - Microsoft
  - Security
  - Windows
sources:
  - title: "Microsoft Defender Antivirus cloud protection"
    publisher: "Microsoft Learn"
    url: "https://learn.microsoft.com/en-us/defender-endpoint/cloud-protection-microsoft-defender-antivirus"
  - title: "Microsoft Active Protection Service (MAPS)"
    publisher: "Microsoft Learn"
    url: "https://learn.microsoft.com/en-us/windows/security/threat-protection/microsoft-defender-antivirus/configure-microsoft-active-protection-service-windows"
---

Signature files shipped on a cadence are always late to a brand-new binary. Attackers mutate faster than DVD-era antivirus catalogs. Windows Defender's cloud protection (historically MAPS — Microsoft Active Protection Service) changes the control loop: the endpoint still runs a local engine, but when it sees an unknown or low-reputation file, it can query Microsoft's cloud with metadata and, depending on policy, a sample, then apply a verdict before the process finishes launching. The cloud sees the first appearance of a hash across hundreds of millions of machines, which is a sensor network the local engine cannot match.

## What actually leaves the machine

Privacy and enterprise policy dominate this design. Default cloud protection sends file metadata (hashes, signer, size, first-seen behavior) rather than every byte of every executable. Automatic sample submission is configurable because a line-of-business binary that looks statistically weird is still confidential. The engineering problem is to make the metadata rich enough to classify packed malware without shipping the payload every time. Features include detonation in the cloud (run the sample in a sandbox) for ambiguous cases, which costs minutes — too slow for a blocking synchronous verdict, useful for follow-up and for updating the reputation store.

Synchronous blocking needs a tight timeout. If the cloud is unreachable, the endpoint must fail open or fail closed according to policy. Consumer defaults tend to fail open for availability; some enterprise "block at first sight" modes wait longer or default deny on unknown. That policy fork is the product. There is no globally correct answer, only an explicit one.

## Reputation, models, and poisoning

A hash reputation table is the fast path: seen-bad, seen-good, unknown. Unknowns go to models that look at static features and the graph of who signed what, which URLs delivered the file, and how many machines ran it without a later complaint. The graph is also an attack surface. Poisoning — getting a benign-looking sample into the good set, or flooding the cloud with junk — is why Microsoft does not treat first-seen prevalence as proof of safety. Signed-by-a-known-vendor is a strong feature and a weak guarantee (stolen certs exist). The cloud pipeline has to revoke.

Endpoint performance is a shipping constraint. Scanning on every file open already fights Windows IO. Adding a network round trip on every unknown executable would freeze logon. Defender therefore caches verdicts, batches, and excludes paths that enterprises mark as trusted. False positives at cloud scale are incidents: a bad classification of a popular installer bricks helpdesks worldwide. Rollout of a new model is staged; a kill switch reverts to signatures-only.

The architectural pattern is broader than antivirus: a local conservative engine, a cloud aggregator with a global view, a timeout, and a policy for disconnect. Browser Safe Browsing lists and mobile app stores use the same shape. The Microsoft-specific lesson is operational: the sensor network is the product, and every extra bit you upload must survive privacy review and still arrive in time to block execution.

## What you can borrow

- Pair a local detector with a cloud reputation store; first-seen global context beats a monthly file on disk.
- Bound the cloud call with a timeout and an explicit fail-open vs. fail-closed policy per environment.
- Send metadata first; sample upload is a separate, policy-gated path.
- Stage model and list rollouts with a revert that does not require patching every endpoint the same hour.
- Cache verdicts and exclude known-good paths so the protection loop does not become a login-time outage.
