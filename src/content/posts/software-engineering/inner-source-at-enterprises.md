---
title: "InnerSource at Enterprises: Open Source Process Inside the Firewall"
slug: "inner-source-at-enterprises"
description: "Internal contributions, trusted committers, and the product ownership that keeps InnerSource from becoming a drive-by dump of unmaintained libraries."
publishedAt: "2026-09-05"
category: "Software Engineering"
tags:
  - Software Engineering
  - InnerSource
  - Organizations
  - Open Source
sources:
  - title: "InnerSource Commons"
    publisher: "InnerSource Commons Foundation"
    url: "https://innersourcecommons.org/"
  - title: "Adopting InnerSource"
    publisher: "InnerSource Commons patterns"
    url: "https://patterns.innersourcecommons.org/"
---

**InnerSource** applies open source **working** — visible repos, pull requests, CONTRIBUTING, issue trackers — to code that will never leave the company. The bet: a payments library in Team A can take a fix from Team B without a six-week alignment meeting, if A remains **product owner** and B follows the contribution path. Without ownership, InnerSource is a junk drawer of Git repos with no pager.

## Roles the Commons names

**Trusted committers** (maintainers) own quality and roadmap. **Contributors** send PRs. A **guiding team** spreads the practice. Legal: internal license (or "internal use only") still needs a NOTICE for third-party OSS inside the repo. Security: secret scanning on internal Git is as necessary as on GitHub.com.

```text
README, CONTRIBUTING, CODEOWNERS
issues as the backlog
CI required on PRs from other units
```

Discoverability: an inner source portal beats tribal Slack. Tags for "we accept PRs" versus "read-only snapshot."

## What fails

A mandate that "all code is InnerSource" with no time for review. Contributors who throw a 5,000-line PR on Friday. Maintainers who never merge. Shared libraries without a versioning policy (every consumer on `main`). InnerSource is not a substitute for a **platform team** with a roadmap; it is how adjacent teams help a platform or a common library.

Incentives: if only feature work in your own stream counts toward review, nobody will review outbound PRs. Managers must count InnerSource like they count product.

## Start small

Pick one painful duplicate (auth SDK, logging). Staff maintainers. Publish a charter. Measure time-to-first-merge for external (internal-external) PRs. If that time is months, you have theater.

Read InnerSource Commons patterns (trusted committer, 30-day warranty, etc.). Then add CONTRIBUTING.md to a real repo and accept one foreign PR this month. The cultural leap is letting another cost center touch the code. The technical leap is CI that makes that safe. You need both; a portal without tests is a wiki with git.
