---
title: "Gradual Typing the Office Codebase: TypeScript as a Migration Strategy"
slug: "microsoft-typescript-gradual-typing-at-office-scale"
description: "Why Microsoft built TypeScript to add types to JavaScript incrementally, and how that bet scaled across Office web, VS Code, and the broader ecosystem."
publishedAt: "2026-09-25"
updatedAt: "2026-09-25"
category: "Microsoft"
tags:
  - Engineering at Scale
  - Microsoft
  - TypeScript
  - Developer Tools
sources:
  - title: "TypeScript Language Specification and handbook"
    publisher: "Microsoft"
    url: "https://www.typescriptlang.org/docs/"
  - title: "TypeScript for the Microsoft 365 platform"
    publisher: "Microsoft 365 Developer Blog"
    url: "https://devblogs.microsoft.com/microsoft365dev/"
  - title: "Anders Hejlsberg on TypeScript"
    publisher: "Microsoft Developer Blogs"
    url: "https://devblogs.microsoft.com/typescript/"
---

Office's web clients, and a generation of Microsoft properties after them, lived in JavaScript because the browser demanded it. Large JavaScript codebases fail in a specific way: refactors that a compiler would reject become production incidents, "this" and implicit any drift through callbacks, and API contracts exist only in wiki pages. A full rewrite in a stricter language was never going to ship Word on the web. TypeScript's original pitch from Anders Hejlsberg's team was narrower and more operational: a typed superset that compiles to JavaScript, with types that can be added file by file, and with a type system that understands the messy patterns already in the wild (unions, structural typing, later mapped and conditional types).

## Types you can adopt without stopping the world

Gradual typing is a migration protocol. `allowJs`, JSDoc type comments, `any`, and `skipLibCheck` exist so a 2-million-line tree can compile on day one. Strictness flags — `strictNullChecks`, `noImplicitAny`, `strictFunctionTypes` — are then turned on per package when the local code is ready. That is the same playbook Stripe later used with Sorbet for Ruby: do not require a flag day. Microsoft's own usage inside VS Code, Azure portals, and Office web proved the compiler could survive framework-sized `.d.ts` graphs and still offer interactive checking in the editor via the language service.

Structural typing, not nominal classes, was the concession to JavaScript's duck-typed culture. It makes some Java-style guarantees impossible and some JS interop trivial. The later evolution of the language — discriminated unions, `unknown`, template literal types — is Microsoft responding to bugs that Office-scale code actually hits: "stringly" event names, nullable DOM nodes, and JSON that is not the type you hoped.

## The cost of a type system that must not break emit

TypeScript's contract with the ecosystem is that types erase. Runtime is still JavaScript. That means the compiler will not save you from `JSON.parse`, from `as` assertions, or from a dependency whose published types lie. At Office scale those lies cluster around hand-written declaration files for native bridges and around generated clients that drift from the service. The operational fix is the same as for any large typed monorepo: treat `.d.ts` quality as a product, run the compiler in CI on every package, and ban `as any` except behind a lint allowlist that decays.

Build performance is the other tax. A language service that type-checks a whole Office surface on every keystroke needs project references, incremental builds, and sometimes a split between editor checking and full pipeline checking. Teams that dump everything into one `tsconfig` learn this as "the editor froze." Microsoft invested in those engineering problems because TypeScript was not a side bet; it was how the company intended to keep shipping JavaScript-shaped products with compiler-backed refactors.

The borrow for a mid-size team is not "rewrite in TypeScript this quarter." It is: pick a strictness ladder, measure the percentage of files that are typed, and never let new code enter at a lower rung than the package's current floor. Gradual systems fail when `any` is contagious and nobody owns the boundary.

## What you can borrow

- Adopt types incrementally with an explicit strictness ladder; forbid new packages from starting looser than the current default.
- Invest in declaration quality for anything that crosses a process or language boundary; bad `.d.ts` files are production bugs.
- Erasure means runtime validation still belongs at trust boundaries (parse, network, native).
- Split compilation units so editor latency stays human; one giant program is a process-outage waiting to happen.
- Track `any` and assertion density like you track test coverage. Gradual typing only works if the gradual part shrinks.
