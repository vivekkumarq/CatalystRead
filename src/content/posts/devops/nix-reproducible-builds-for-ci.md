---
title: "Nix for CI: Reproducible Toolchains Without a Snowflaked Runner Image"
slug: "nix-reproducible-builds-for-ci"
description: "Flakes, nix-shell in GitHub Actions, binary caches, and the difference between bit-reproducible artifacts and 'it built on Tuesday'."
publishedAt: "2026-08-11"
category: "DevOps"
tags:
  - DevOps
  - Nix
  - CI
  - Reproducible Builds
sources:
  - title: "Nix flakes"
    publisher: "Nix manual"
    url: "https://nix.dev/concepts/flakes.html"
  - title: "Reproducible Builds"
    publisher: "reproducible-builds.org"
    url: "https://reproducible-builds.org/"
---

CI images rot. Someone `apt-get install`s a compiler on a self-hosted runner and six months later only that runner can build the project. **Nix** describes packages as functions of hashed inputs. A `flake.lock` pins nixpkgs. The same `nix build` on two machines should produce the same store paths if you stayed in the sandbox. That is a stronger claim than Docker's "FROM ubuntu:22.04" which floats digest until you pin.

## What CI actually needs

A `devShell` with JDK, Node, and clang versions the repo declares. GitHub Actions: install Nix, `nix develop --command ./gradlew test`, cache the Nix store (`cachix` or GitHub cache of `/nix/store` with care). **Binary caches** (cache.nixos.org, Cachix) keep you from compiling the world on every PR. Without a cache, Nix is a latency incident.

```nix
# flake.nix sketch
devShells.default = pkgs.mkShell {
  packages = [ pkgs.jdk21 pkgs.nodejs_22 ];
};
```

Hermeticity: set `pure` shells so a developer's `~/.npmrc` does not leak into CI. Nix cannot fix a build that `curl | bash`es an unpinned installer inside a Makefile. The Makefile is the hole.

## Reproducible versus repeatable

Nix gets you **repeatable inputs**. Bit-identical output also needs deterministic compilers, no timestamps, and sorted file trees (the reproducible-builds.org playbook). Java jars with timestamps, Go binaries with module proxy drift, and Docker layers with `apt` unpinned still move. Use Nix to pin the toolchain; still pin application lockfiles (`package-lock`, Gradle lock).

Flakes were experimental; they are now the common CI pattern. Non-flake `shell.nix` still works. Don't mix both without documenting the entry point.

## Costs

Learning curve, Darwin vs Linux differences, and friends who cannot `nix develop` behind a corporate proxy. Hydra-style infinite builds are optional. Start with a shell for CI, not with rewriting Debian.

If the goal is "same Node version," `asdf` might suffice. If the goal is "the compiler is a hash in git," Nix is the tool.

Read nix.dev on flakes and reproducible-builds.org on what pinning does not guarantee. Then make CI fail if it uses a runner-global JDK. The lockfile is the product.
