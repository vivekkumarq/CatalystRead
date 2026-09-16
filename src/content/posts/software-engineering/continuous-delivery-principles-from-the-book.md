---
title: "Continuous Delivery Principles That Still Apply When the Pipeline Is YAML"
slug: "continuous-delivery-principles-from-the-book"
description: "Humble and Farley's core ideas — trunk-based work, stop-the-line, deploy the same artifact — translated into GitHub Actions and Kubernetes without the theater."
publishedAt: "2026-09-11"
updatedAt: "2026-09-16"
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

## A promotion path that matches the book

Commit on main → CI builds image `@sha256:abc` → contract tests against that digest in an ephemeral namespace → staging deploy of *the same digest* → production deploy of *the same digest*. Config (env, flags, secrets) is the release, not a second compile. If staging was rebuilt from the Dockerfile at noon, you did not test production’s bits.

Feature flags keep trunk releasable when the product is not ready. The flag’s default in production is off until a change-fail budget says otherwise. Dark launch (code on, traffic off) is still a production deploy; treat it as one in DORA frequency.

## Failure modes

**Environment-specific artifacts.** `Dockerfile.dev` vs `Dockerfile.prod` that install different packages. The bug you fixed in staging’s extra debugging layer is not in prod.

**Manual “bake” jobs.** A human clicks “build production” with extra args. That is a snowflake. Encode the args or delete them.

**Red trunk as normal.** If people merge around a failing integration job, you have no stop-the-line. Disable the merge queue until green, or the metric you will get is lead time that hides a week of broken main.

**E2E as the only gate.** Forty minutes of Selenium after the image is tagged means people skip the pipeline or merge at 5pm hoping it passes overnight. Split: fast tests on every commit, expensive tests on the candidate artifact on a schedule plus before prod if you cannot make them fast.

## When not to cargo-cult trunk-based

A regulated binary that must be built in an air-gapped hall still needs *one* artifact and a promotion record; the hall is a builder identity, not an excuse for five unsigned copies. A mobile store review cycle is a longer lead time you cannot YAML away — still build once and promote that IPA, rather than rebuilding for each store reject.

Long-lived release branches for old major versions (support 2.x while 3.x is trunk) are a product choice. Do not pretend they are CD for 2.x unless 2.x also has automated proof and a boring deploy.

## Review checklist

- Production `image:` is a digest already seen in staging.
- Main is merge-blocked on the fast suite; a red main stops other merges.
- Manual prod steps are listed and shrinking.
- Flags, not branches, hide unfinished product work on trunk.

## A worked failure mode

A pipeline is green because tests are skipped on main. Deploy is automated to a Friday batch. The book is cited while the trunk is unstable. The failure is CD as a tool, not as always-releasable. Fast tests, real prod-like staging, small batches, and stop-the-line on red.

## When this is the wrong tool

CD is the wrong tool if you cannot test. It is a poor fit for hardware you ship in trucks without dual-control. Do not automate deploys you cannot roll back. Use CD when the product can ship small, reversible increments.

A second, quieter failure is operational: the idea is copied from a talk into a path that has no rollback, no owner, and no metric that would show the invariant breaking. For "Continuous Delivery Principles That Still Apply When the Pipeline Is YAML", that usually means a Friday deploy with production as the first realistic test. Write down the user-visible symptom, the invariant, and the revert before you scale the pattern. If revert is a data rewrite, you do not have a revert—you have a project. Practice the failure in staging with production-sized data at least once, or you will practice it on customers.
