---
title: "CI Pipeline Caching Strategies That Actually Save Time"
slug: "ci-pipeline-caching-strategies"
description: "Practical caching techniques for CI pipelines, from dependency caches to Docker layer caches, and how to avoid the stale-cache bugs that undo the savings."
publishedAt: "2025-10-13"
updatedAt: "2026-09-16"
category: "DevOps"
tags:
  - CI/CD
  - DevOps
  - Docker
  - Infrastructure
---

A pipeline that reinstalls every dependency and rebuilds every layer on every commit isn't just slow — it's expensive, and it trains engineers to avoid pushing small commits because the feedback loop is too painful. Caching fixes both problems, but only if the cache key strategy matches how your project's dependencies actually change. A cache that's too broad serves stale artifacts; one that's too narrow never hits.

## Keying caches on the right lockfile

The single most impactful cache in most pipelines is the dependency cache, and its correctness hinges entirely on the cache key. Keying on a lockfile hash, not a branch name or a static string, means the cache invalidates exactly when dependencies actually change:

```yaml
# GitHub Actions example
- uses: actions/cache@v4
  with:
    path: ~/.npm
    key: npm-${{ runner.os }}-${{ hashFiles('package-lock.json') }}
    restore-keys: |
      npm-${{ runner.os }}-
```

The `restore-keys` fallback matters as much as the primary key: if no exact match exists, it restores the most recent partial match instead of starting from nothing, which still saves most of the download time even when the lockfile changed slightly.

## Caching build outputs, not just dependencies

Dependency caching gets most of the attention, but incremental build caches (compiler output, bundler artifacts) are often the bigger win for larger codebases. Tools like Turborepo, Nx, and Bazel support remote caching where a build step run once, anywhere, is reused by every subsequent CI run that has the same inputs:

```yaml
- name: Build
  run: npx turbo run build --cache-dir=.turbo
  env:
    TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
    TURBO_TEAM: ${{ vars.TURBO_TEAM }}
```

With content-addressed remote caching, a developer's local build and CI's build can share the same cache entries, so a PR that only touches one package skips rebuilding the other forty entirely.

## Docker layer caching in ephemeral runners

Standard CI runners are ephemeral, so Docker's local layer cache doesn't persist between jobs by default — every build starts cold unless you explicitly export and import it. BuildKit's registry cache backend solves this by pushing cache layers to a registry alongside the image itself:

```bash
docker buildx build \
  --cache-from type=registry,ref=registry.example.com/app:buildcache \
  --cache-to type=registry,ref=registry.example.com/app:buildcache,mode=max \
  --tag registry.example.com/app:${GIT_SHA} \
  --push .
```

`mode=max` caches every intermediate layer, not just the final ones, which costs more registry storage but produces much higher hit rates on multi-stage builds where earlier stages are reused across many downstream targets.

## Avoiding stale-cache bugs

The failure mode that erodes trust in caching is a cache that silently serves outdated artifacts after a dependency or config change that the cache key didn't capture. Two practices avoid most of this: include every file that affects the build output in the cache key hash (not just the primary lockfile — also `.nvmrc`, Dockerfiles, build config), and set a reasonable cache expiry or version prefix you can bump manually:

```yaml
key: npm-v2-${{ runner.os }}-${{ hashFiles('package-lock.json', '.nvmrc') }}
```

Bumping `v2` to `v3` invalidates every existing cache entry instantly, which is the escape hatch you want available when a cache corruption or format change requires a clean slate without waiting for keys to naturally roll over.

Caching is not a "set it once" optimization — cache hit rates should be a metric you actually watch. A dependency cache with a 40% hit rate is a sign the key strategy needs revisiting, not that caching doesn't work for your project.

## A worked example

GitHub Actions cache keyed on `hashFiles('lockfile')` for `node_modules` or better, a package manager cache (`~/.npm`). Docker layer cache with BuildKit. Compiler cache (ccache, Gradle). Caches are restore-keys fallback to a prefix. You measure wall time before/after on a cold and warm runner.

A poisoned cache: bump the key prefix `v2-`.

## Failure modes

Caching `dist` that includes secrets. Keys that never change. Keys that always change (timestamp). Sharing caches across OS/arch. npm cache without lockfile. Huge caches that take longer to download than to build. Stale test caches hiding failures.

Write-only caches that never restore.

## When this is the wrong tool

A 20s build. Caching is the wrong fix for a 40-minute e2e suite — split tests. Do not cache the entire `$HOME`. Hermetic Bazel remote cache is a different product. If runners are ephemeral and cache backend is slow, local disks on sticky runners may win. Skip caching randomized test data.
