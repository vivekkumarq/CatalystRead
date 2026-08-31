---
title: "Reading Unfamiliar Codebases Efficiently"
slug: "reading-unfamiliar-codebases-efficiently"
description: "Reading someone else's large codebase top to bottom doesn't work — a more targeted approach gets you productive in days instead of weeks."
publishedAt: "2024-10-31"
category: "Career"
tags:
  - Career
  - Software Engineering
  - Onboarding
  - Productivity
---

Every engineer eventually inherits a codebase they didn't write, usually with a deadline attached and no one available to walk them through it. The instinct to open the entry point and read forward, file by file, feels thorough and is almost always the slowest possible way to get productive. A codebase of any real size doesn't reveal its structure by being read linearly — it reveals it by being interrogated with specific questions.

## Start from behavior, not from structure

Before reading any code, find out what the system actually does from the outside — what requests it serves, what jobs it runs, what a user or another service experiences interacting with it. This sounds obvious and gets skipped constantly, because reading code feels like progress and using the running system feels like a detour. It isn't a detour. Once you've clicked through the actual application, or hit its API with a real request, you have a mental scaffold to hang the code onto, and every file you open afterward has an obvious "this is part of that" or "I don't know what this is part of yet" — the second category is where you should be spending your reading time, not the parts you can already place.

## Follow one request end to end

Rather than trying to build a map of the whole system before touching anything, pick one concrete request or job and trace it from the entry point through every function it touches until you hit the response or the side effect. This is slower per-file than skimming broadly, but it produces something skimming doesn't: an accurate picture of how the pieces actually connect, as opposed to how the directory structure suggests they connect, which are frequently different things in a codebase that's grown organically over years.

Do this for two or three genuinely different flows — a read path and a write path, or the happy path and an error path — rather than one. A single trace tells you about one slice of the system; the differences between two traces tell you about the conventions the codebase actually follows versus the ones that only apply in one corner of it.

## Let git history answer questions the code can't

Code tells you what the system does now. It rarely tells you why, and "why" is frequently the thing that stops you from confidently changing something. Blame on a confusing function often leads to a commit message or a linked ticket explaining a bug it was written to prevent — information that would take much longer to reconstruct by reasoning about the code alone, and that changes your assessment of how safe it is to touch. A file's commit frequency is a useful signal too: code that changes constantly is probably core and well-understood by the team even if it looks messy, while code that hasn't been touched in two years but sits in a critical path deserves extra caution, since nobody currently on the team may remember its edge cases.

## Write down what you learn as you go

The understanding you build reading a new codebase decays fast if it isn't captured somewhere. A short running document — not polished, just notes — of what you've figured out, what confused you and how you resolved it, and what's still unclear, does two things: it forces you to articulate understanding precisely enough to write it down, which surfaces gaps a vague mental model would hide, and it becomes genuinely useful onboarding material for whoever joins after you, who will hit the same confusing corners you just spent an afternoon untangling. Codebases rarely come with good documentation, but every new person who reads one seriously has a chance to leave it slightly better documented than they found it.
