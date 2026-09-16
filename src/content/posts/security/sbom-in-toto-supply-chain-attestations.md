---
title: "SBOMs and in-toto: Attesting How Software Was Built, Not Just What It Contains"
slug: "sbom-in-toto-supply-chain-attestations"
description: "SPDX/CycloneDX name ingredients; in-toto layouts name who ran which step. Together they are stronger than a lockfile screenshot."
publishedAt: "2026-08-29"
category: "Security"
tags:
  - Security
  - Supply Chain
  - SBOM
  - in-toto
sources:
  - title: "in-toto: Providing farm-to-table guarantees for bits and bytes"
    author: "Santiago Torres-Arias, Hammad Afzali, Trishank Karthik Kuppusamy, Reza Curtmola, Justin Cappos"
    publisher: "USENIX Security 2019"
    url: "https://www.usenix.org/conference/usenixsecurity19/presentation/torres-arias"
  - title: "SPDX Specification"
    publisher: "ISO/IEC 5962"
    url: "https://spdx.dev/"
---

An **SBOM** (Software Bill of Materials) lists packages, versions, and often licenses — SPDX or CycloneDX JSON that a scanner can diff against CVE feeds. That answers "what is in the artifact." It does not prove **who built it**, on which commit, after which tests, without an extra unsigned tarball appearing in the middle. **in-toto** (Torres-Arias et al., USENIX Security 2019) is a framework for that second claim: a **layout** signed by a project owner names the steps, the expected materials and products, and which keys may sign each step's **link** metadata.

SLSA provenance is a related, widely deployed attestation format; this article is about the in-toto model that SLSA's attestations sit in, and about not treating an SBOM as a complete supply-chain story.

## SBOMs are necessary and forgeable

Generate CycloneDX at build time from the resolved graph (`npm`, Maven, Go modules), not from a wiki. Sign or attest the SBOM **with** the artifact (`cosign attest`, Sigstore). A scanner that downloads a random `sbom.json` from a ticket is theater. SBOMs go stale the moment someone `docker cp`s a binary into an image after the scan.

```text
layout (signed by owner): clone → build → test → package
each step: link file (signed by worker key) with materials/products hashes
final verification: links match layout, hashes chain
```

## in-toto's layout versus "we use GitHub"

in-toto verification fails if a step is skipped, if products do not match the next step's materials, or if an unexpected key signed the build. That is stronger than "the Actions log looks green." The cost is key management for functionaries (CI workers) and writing a layout that matches reality. A layout that says "test" but CI can skip tests will verify a skip if you modeled a skip.

in-toto does not replace reproducible builds. If the build is non-deterministic, product hashes in links will not match a second verifier's rebuild. Pair with pinning, locked dependencies, and where possible reproducible flags.

## How to use both without a research team

Emit an SBOM every release and gate deploys on critical CVEs in that SBOM. Attach SLSA/in-toto provenance that names the builder identity (`github.com/org/repo/.github/workflows/release.yml@sha`). Admission control in Kubernetes (policy engines, Sigstore policy) should require the attestation, not merely the presence of a scanner badge.

Do not confuse license SBOMs with security SBOMs; they overlap. Do not expect in-toto to detect a compromised compiler that still hashes consistently; that's scoped trust in the builder.

Read the USENIX in-toto paper's farm-to-table metaphor, then look at one artifact in your registry and ask: can a machine check the SBOM **and** the builder identity? If only humans can, you have documentation, not attestation.
