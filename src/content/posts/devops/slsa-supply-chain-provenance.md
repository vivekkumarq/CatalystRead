---
title: "SLSA and Provenance: Making 'Where Did This Binary Come From?' a Build Property"
slug: "slsa-supply-chain-provenance"
description: "What SLSA levels actually require, how provenance attestations fit next to SBOMs, and a realistic path from 'we tag git' to a verifiable builder."
publishedAt: "2026-08-21"
updatedAt: "2026-09-16"
category: "DevOps"
tags:
  - DevOps
  - Security
  - Supply Chain
  - CI/CD
sources:
  - title: "SLSA: Supply-chain Levels for Software Artifacts"
    publisher: "OpenSSF / slsa.dev"
    url: "https://slsa.dev/"
---

An SBOM lists ingredients. Provenance says **how** those ingredients became the artifact you are about to run: which git commit, which builder identity, which parameters. SLSA (Supply-chain Levels for Software Artifacts) is a graduated set of requirements so you can stop treating "the SHA on the container" as a complete story. A SHA you built on a laptop and a SHA GitHub Actions built from `main` can be the same bytes or not; provenance is how a deployer tells the difference.

## Levels as an adoption ladder, not a trophy

Early SLSA versions numbered 1–4; the current docs emphasize a model of tracks (build, source) and levels. The useful engineering translation is stable:

- **Document the build.** Hermetic enough that someone can map artifact → commit.
- **Hosted, isolated builder.** No "also this guy ran a script with extra env vars."
- **Non-falsifiable provenance.** The builder signs a statement the producer cannot quietly edit after the fact (Sigstore, a cloud-attested job identity, etc.).
- **Two-party review / stronger source control** at the high end.

If you skip to "we need SLSA 3" without lockfiles and a single CI entrypoint, you will generate attestations that claim a process you do not actually run.

## Provenance in the pipeline

After `docker build`, emit an in-toto / SLSA predicate: commit SHA, builder image digest, resolved dependencies when you can. Store it next to the image in the registry (referrers API, or an attestation repo). Admission controllers in Kubernetes can refuse pods whose provenance is missing or whose builder identity is not on an allowlist.

```text
git SHA → CI job (OIDC identity) → image digest + signed provenance
cluster: verify signature, verify builder, then run
```

SBOMs and provenance complement. An SBOM without provenance is a grocery list with no receipt. Provenance without an SBOM is a receipt that does not list allergens. Generate both from the same job.

## What not to fake

Do not sign provenance from the same GPG key developers use to sign git tags if those developers can also push arbitrary images. The builder identity must be narrower than "any engineer." Do not claim hermetic builds while `go get` hitting the public internet at 3am. SLSA is honest about that: the level is a property of the pipeline, not a badge in a README.

Start by recording commit SHA and image digest in deploy logs — you may already have half of level-1. Then move signing into the hosted builder. That order prevents a year of attestations nobody verifies.

## A worked admission path

CI (GitHub Actions OIDC) builds `image@sha256:abc`, uploads a SLSA provenance attestation signed by Sigstore. The cluster admission webhook allows only builder identity `https://token.actions.githubusercontent.com` for this repo and requires the predicate’s commit SHA to match a tag you cut. A laptop `docker push` of the same Dockerfile bytes is rejected: no matching builder identity. That is the point.

Store the attestation next to the image (referrers). On deploy, log digest + commit + builder. Incident question “what ran?” should be one query, not a Slack archaeology.

## Failure modes

**Self-signed attestations** from developer laptops. Anyone who can push can mint provenance.

**Hermetic claim while `npm install` hits the public registry at 3am.** The level is a lie; pin and vendor or use a verified cache.

**SBOM from a different job** than the image build. Ingredient list for some other graph.

**Admission off in a namespace** “for debugging” that stays off.

**Unsigned `latest` tags** still pullable by humans; provenance on digest only helps if deploys use digests.

## When not to chase a high SLSA level

Internal throwaway prototypes with no production path. Firmware built in a certified lab that already has a stronger paper trail — map that trail to SLSA language rather than bolting Sigstore onto a disconnected hall. If you cannot verify at deploy time, generating attestations is paperwork. Do verification first on a single production service, then raise builder isolation.

## Review checklist

- Deploy uses image digest; provenance is verified, not only stored.
- Builder identity is narrower than “any engineer’s GPG key.”
- SBOM and provenance come from the same build job.
- A laptop-built image cannot enter the cluster.
