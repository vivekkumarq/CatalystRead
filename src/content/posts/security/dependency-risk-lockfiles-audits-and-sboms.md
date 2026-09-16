---
title: "Dependency Risk: Lockfiles, Audits, and SBOMs"
slug: "dependency-risk-lockfiles-audits-and-sboms"
description: "How lockfiles, dependency audits, and software bills of materials work together to manage the risk of running someone else's code in production."
publishedAt: "2026-04-22"
updatedAt: "2026-09-16"
category: "Security"
tags:
  - Security
  - Software Supply Chain
  - DevOps
  - Application Security
---

A modern application's dependency tree routinely runs into the hundreds or thousands of packages once transitive dependencies are counted, and almost none of those packages were written or reviewed by anyone at your company. Every one of them runs with roughly the same trust as your own code. Managing that risk isn't optional at any meaningful scale — it's a matter of which controls you have in place versus which ones you find out you needed after an incident.

## Lockfiles are the foundation

A lockfile pins the exact resolved version — and typically a content hash — of every dependency, direct and transitive, so a build today installs bit-for-bit the same code as a build six months from now, regardless of what's since been published upstream. Without one, a semver range like `^2.3.0` can silently resolve to a different, newer version between builds, which means the code you tested is not necessarily the code that ships.

This matters for security specifically because it closes off a class of supply chain attack where a compromised or malicious package version gets published and automatically picked up by anyone building without a pinned lockfile. Commit the lockfile to version control, and treat lockfile changes in a pull request as something worth actually looking at — a diff that bumps an unrelated transitive dependency by several major versions is worth a second look before merging.

## Audits catch known vulnerabilities, not unknown ones

Dependency audit tools compare your resolved dependency tree against databases of disclosed vulnerabilities and flag matches.

```bash
npm audit --audit-level=high
pip-audit
```

These tools are necessary but limited in an important way: they only catch vulnerabilities that have already been publicly disclosed and cataloged. A package with an undisclosed vulnerability, or one that's simply abandoned and quietly accumulating risk, won't show up in an audit at all. Run audits in CI so a newly disclosed vulnerability in an existing dependency fails a build rather than going unnoticed until someone happens to run the command manually, and set a real process for triaging results — a pile of audit warnings nobody reads provides exactly the same protection as no audit at all.

## SBOMs: knowing what you actually run

A software bill of materials is a structured inventory of every component in a build — direct dependencies, transitive dependencies, their versions, and often their licenses — generated in a standard format like SPDX or CycloneDX. The value of an SBOM shows up at the moment a new vulnerability is disclosed for some widely used library: instead of manually grepping through every service's dependency tree to find out if you're affected, you query your SBOM inventory and get an answer in minutes. That speed difference matters enormously during an actively exploited zero-day, when the gap between "we don't know if we're affected" and "we've confirmed and patched" is the entire incident.

Generating one is largely automatable as part of your build pipeline, and several package ecosystems now support producing an SBOM directly from the lockfile.

## Practices worth adopting beyond the tooling

Minimize the dependency surface deliberately — a small utility function copied in is sometimes a better choice than a package with its own deep dependency tree, especially for something trivial. Pin and review updates to build tooling and CI scripts with the same scrutiny as application dependencies, since a compromised build step can inject malicious code without ever touching the application's own source. And treat a dependency's maintenance signals — last publish date, open security issues, number of maintainers — as part of the decision to adopt it in the first place, not just something to react to after a problem surfaces. The cheapest fix for supply chain risk is not adding it to begin with.

## A worked failure mode

`npm audit` is ignored except to add `--force`. A lockfile is not committed; CI and laptops diverge. An SBOM is generated but never used at deploy. A malicious transitive version is pulled by a floating range. The failure is artifacts without policy. Commit lockfiles, pin, review high advisories with context, and block deploys that do not match the SBOM you signed.

## When this is the wrong tool

Audit theater is the wrong tool if you still `curl | bash` in Docker. SBOMs you never query are paperwork. Do not freeze all upgrades forever. Use lockfiles and SBOMs when you will actually refuse unknown bits.

A second, quieter failure is operational: the idea is copied from a talk into a path that has no rollback, no owner, and no metric that would show the invariant breaking. For "Dependency Risk: Lockfiles, Audits, and SBOMs", that usually means a Friday deploy with production as the first realistic test. Write down the user-visible symptom, the invariant, and the revert before you scale the pattern. If revert is a data rewrite, you do not have a revert—you have a project. Practice the failure in staging with production-sized data at least once, or you will practice it on customers.
