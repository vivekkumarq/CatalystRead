---
title: "TypeScript Project References in Monorepos: Composite Builds That Mean It"
slug: "typescript-project-references-monorepos"
description: "composite, references, and solution-style tsconfig: incremental tsc, no more root skipLibCheck lie, and how path aliases fight references."
publishedAt: "2026-09-09"
category: "TypeScript"
tags:
  - TypeScript
  - Monorepo
  - Tooling
  - Build
sources:
  - title: "Project References"
    publisher: "TypeScript Handbook"
    url: "https://www.typescriptlang.org/docs/handbook/project-references.html"
  - title: "Project references example"
    publisher: "TypeScript wiki"
    url: "https://github.com/microsoft/TypeScript/wiki/Node-Target-Mapping"
---

A monorepo that uses `"paths": { "@app/*": ["packages/*"] }` without **project references** is asking `tsc` to recheck the world as one imaginary project. **Project references** make each package a **composite** project (`"composite": true`, `declaration: true`) that other packages `references`. `tsc -b` builds in order, reuses `.tsbuildinfo`, and consumes `.d.ts` from outputs instead of re-parsing every sibling source.

## The graph is the build

```json
{
  "files": [],
  "references": [
    { "path": "./packages/ui" },
    { "path": "./packages/app" }
  ]
}
```

The root is a **solution** config: no files, only references. Each package `tsconfig` lists `references` to its workspace dependencies. `app` references `ui`; `tsc -b packages/app` builds `ui` first. Forget a reference and you get stale types or a path alias that sees source while CI sees old `dist`.

`prepend` is obsolete. Don't use it.

## Paths versus references

If `app` imports `@acme/ui`, `paths` may still point at `packages/ui/src` for a nice editor experience, but `tsc -b` should resolve via the referenced project's **output**. Mixed modes cause "works in VS Code, fails in CI." Prefer `nodenext` resolution plus `exports` in each package, with references for build order. Tools like Nx and Turborepo orchestrate `tsc -b` or `tsc --filter`.

`disableSourceOfProjectReferenceRedirect` changes whether the editor uses source or d.ts. Know which you want.

## Incremental hygiene

Don't `rm -rf dist` on every CI unless you also drop `.tsbuildinfo` caches you intended to restore. Cache both. Circular references are unsupported; that is a package boundary smell.

Read the handbook's project references page fully (it is short). Then replace a mega `tsconfig` with a solution plus two packages and `tsc -b --pretty`. If the second build is not incremental, `composite` or `tsBuildInfoFile` is wrong. The monorepo's typecheck time is a graph problem. References are how TypeScript admits that.
