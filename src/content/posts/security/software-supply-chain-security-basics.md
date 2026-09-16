---
title: "Software Supply Chain Security Basics"
slug: "software-supply-chain-security-basics"
description: "Your application's attack surface includes every package your dependencies depend on — here's what to actually check before trusting a build."
publishedAt: "2025-01-23"
updatedAt: "2026-09-16"
category: "Security"
tags:
  - Security
  - Supply Chain
  - DevOps
  - Dependency Management
---

A typical modern application pulls in hundreds, sometimes thousands, of transitive dependencies for what feels like a handful of direct `import` statements. Every one of those packages runs with the same privileges as your own code at build time or runtime — there's no sandbox separating "code I wrote" from "code a stranger published to a registry." Supply chain security is the practice of not treating that trust as automatic.

## What you're actually trusting

When you add a dependency, you're not just trusting its author's intent — you're trusting their account security, their build pipeline, and every maintainer who has publish access, including ones who might be added years after the package earned your trust. A well-known incident pattern is a small, widely-used utility package getting a new maintainer after the original author abandons it, followed by a malicious update slipping into a minor version bump that most projects auto-accept.

This is why pinning matters more than it seems like it should. A `package.json` dependency range like `^1.2.0` allows any 1.x release to install without review, including one published an hour ago by an account that just got compromised. A committed lockfile turns "whatever the registry currently serves" into "the exact set of versions I evaluated," which is the difference between a supply chain attack silently entering your build and it requiring a deliberate version bump that shows up in a diff.

```bash
# Installs exactly what's in the lockfile — no surprise upgrades
npm ci

# Regenerates the lockfile and can silently widen version ranges
npm install
```

## Practical checks worth running

Automated vulnerability scanning — `npm audit`, `pip-audit`, Dependabot, or an equivalent — catches known CVEs in dependencies you already have, which is useful but reactive by nature; it tells you about a problem after it's been disclosed. Combine it with a check that runs before a new dependency is added rather than after: does the package have a maintenance history longer than a few months, a reasonable number of other projects depending on it, and no recent maintainer turnover you can't explain?

Build provenance is worth checking for anything security-sensitive. Packages that publish with signed releases or attestations — increasingly common via tools that support Sigstore or npm's provenance statements — let you verify that the artifact you're installing was actually built from the source you can inspect on GitHub, rather than from a separate build step an attacker controls.

Postinstall scripts deserve specific scrutiny because they run arbitrary code the moment a package is installed, before your application logic ever executes. A dependency that doesn't need to compile native bindings but ships a postinstall script anyway is worth a second look — it's a common vector for credential-stealing malware distributed through typosquatted or hijacked packages.

## Where to draw the line

Nobody has time to audit a thousand transitive dependencies by hand, so the goal isn't exhaustive review — it's concentrating scrutiny where it matters. Direct dependencies you chose deserve more attention than transitive ones you inherited. Packages that run in your build pipeline or CI environment deserve more attention than ones that only run in a sandboxed test context, because CI credentials are frequently the most valuable target in the whole system. And any dependency with access to secrets, payment flows, or user data is worth pinning, scanning, and revisiting on a schedule — not just installing once and forgetting it exists.

## A worked example

Lockfiles committed. `npm audit` / `osv-scanner` in CI with a triage process. Builds in CI with OIDC, signed artifacts, SBOM attached. Dependabot with human review. You pin GitHub Actions by SHA. A policy: no `curl | sudo bash` in Dockerfiles.

Incident: a compromised maintainer — you have a SBOM to find the package.

## Failure modes

Ignoring 400 low CVEs forever or blocking the company on all of them. Pinning nothing. Trusting a tag that moved. Build scripts downloading unsigned binaries. Developers with prod publish keys. SBOMs generated but never used.

"We use a language with a compiler" as a supply-chain story.

## When this is the wrong tool

A weekend toy without distribution. Supply-chain tooling will not fix SQL injection in your code. Do not buy a platform instead of pinning Actions. If you vendor all deps and never update, you traded CVEs for rot — still a choice, be honest. Internal-only scripts still need a lockfile if they run in prod.
