---
title: "Continuous Delivery Principles That Still Apply When the Pipeline Is YAML"
slug: "continuous-delivery-principles-from-the-book"
description: "Humble and Farley's core ideas — trunk-based work, stop-the-line, deploy the same artifact — translated into GitHub Actions and Kubernetes without the theater."
publishedAt: "2026-09-11"
category: "Software Engineering"
tags:
  - Software Engineering
  - Continuous Delivery
  - CI/CD
  - Quality
sources:
  - title: "Continuous Delivery"
    author: "Jez Humble and David Farley"
    publisher: "Addison-Wesley, 2010"
    url: "https://continuousdelivery.com/"
---

The 2010 book predates Kubernetes and still diagnoses most slow orgs: the path from commit to production is a pile of unique snowflakes, so people batch work until Friday and then fear the release. YAML in GitHub Actions did not automatically fix that. You can encode a three-day approval chain in YAML as easily as you can encode a fast pipeline.

## The artifact is the unit of promotion

Build once. Promote the same container or JAR through test, staging, production. Rebuilding from the same commit "to be safe" is how you ship a dependency that resolved differently at 4pm. Sign the artifact, record its digest in the deploy, and make production's `image:` that digest.

## Trunk stays releasable

Long-lived feature branches with a merge carnival on Thursday are the opposite of the book's trunk-based default. Feature flags, branch by abstraction, and dark launches exist so main is always green. If CI on main is red for an afternoon, the correct response is to stop merging and fix it — Humble and Farley's "stop the line" — not to open a new branch so you can keep coding.

## Tests that gate, not tests that decorate

A pipeline that runs 40 minutes of flaky Selenium after the app is already on production-shaped infra is a news ticker, not a gate. Fast unit tests on every commit, a smaller contract/API suite, and a smoke that hits the built artifact in an ephemeral environment. End-to-end tests that need a full customer dataset belong on a schedule plus a pre-prod promote, unless you have paid to make them fast and hermetic.

## Deploy should be boring

If production deploys require a Zoom call, the pipeline is incomplete. Manual production-only steps should be enumerated and then automated or deleted. Change-fail rate (see DORA) tells you whether boring is actually safe or just unobserved.

Read the book for the economics of batch size, not for CruiseControl screenshots. The economics did not expire: smaller changes, same artifact, automated proof, and a culture that treats a red trunk as a fire.
