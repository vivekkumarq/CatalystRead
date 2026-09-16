---
title: "The OWASP Top 10 as a Code Review Checklist"
slug: "owasp-top-10-code-review-checklist"
description: "A practical translation of the OWASP Top 10 into concrete questions you can ask during pull request review, not just categories to memorize."
publishedAt: "2024-08-05"
updatedAt: "2026-09-16"
category: "Security"
tags:
  - Security
  - Code Review
  - OWASP
  - Web Security
---

Most engineers can recite the OWASP Top 10 categories from memory but struggle to apply them during an actual pull request review. "Broken Access Control" and "Cryptographic Failures" are useful for structuring a training deck, but they don't tell you what to type into a review comment when someone adds a new endpoint. The gap between knowing the list and using it is where most vulnerabilities slip through. What follows is a version of the Top 10 rewritten as questions you can actually ask while reading a diff.

## Turning categories into questions

Broken access control stops being abstract when you ask: does this endpoint check that the requesting user owns the resource, or only that they're authenticated? A huge share of real-world access control bugs are exactly this substitution — checking "is this a valid session" instead of "is this session allowed to touch this specific record." Look for object IDs pulled straight from the URL or request body and used in a query without an ownership filter.

Injection risks show up as: does any user input reach a query, shell command, or template without going through a parameterized API? Grep for string concatenation near anything that looks like `query`, `exec`, or `render`.

```python
# Red flag during review
cursor.execute(f"SELECT * FROM orders WHERE user_id = {user_id}")

# What it should look like
cursor.execute("SELECT * FROM orders WHERE user_id = %s", (user_id,))
```

Cryptographic failures become: is anything sensitive stored or transmitted without encryption, and is the encryption using a library default rather than a hand-rolled scheme? Ask specifically whether passwords are hashed with a slow, purpose-built algorithm rather than a general-purpose hash.

Security misconfiguration turns into: does this change ship with a debug flag, a permissive CORS policy, or a default credential that was fine for local development but is now going to production?

## Where reviewers get lazy

The categories reviewers skip most often are the ones that require reading intent rather than syntax. Insecure design and security logging failures don't show up as an obviously wrong line of code — they show up as an absence. Nobody flags a missing audit log entry in review because there's nothing to point at. The fix is to make it part of the checklist explicitly: for any endpoint that changes permissions, money, or account state, is there a log entry that records who did it and when?

Vulnerable and outdated components is another category that gets skipped because it's not visible in the diff at all — it lives in a lockfile change three files down that nobody scrolls to. Treat any dependency version bump as worth a thirty-second check of the changelog for security fixes, not just a rubber stamp.

## Building it into your process

A checklist only works if it's short enough to actually use. Trying to run the full Top 10 against every one-line change guarantees the checklist gets ignored. Instead, tie specific questions to specific diff shapes:

- New endpoint or route added — ask the access control question, plus the input validation question.
- Query or template change — ask the injection question.
- New dependency or version bump — ask the supply chain question.
- Auth, session, or token code touched — ask the cryptographic failure and session management questions.

Put this mapping in your PR template as a short comment block rather than a separate document nobody opens. The goal isn't to make reviewers OWASP experts — it's to make sure the five or six questions that catch most real bugs get asked automatically, every time, without anyone having to remember the full list from a training session six months ago.

## A worked failure mode

A review ticks OWASP items while missing a business-logic over-refund. SSRF is listed but the reviewer only greps for `http://`. The Top 10 becomes a cargo cult. The failure is a checklist without the app's threat model. Use OWASP as prompts, then follow data flows for money and identity.

## When this is the wrong tool

A Top 10 checklist is the wrong tool for crypto design review. It is not a pentest. Do not fail a PR for a missing header while SQL is concatenated. Use it as a memory aid, not a score.

Copy-paste from an internal success is still a failure mode. The last team had different traffic, a different datastore, and six months of scars. "The OWASP Top 10 as a Code Review Checklist" should be adopted with the scars attached: the dashboard they wished they had, the migration they feared, the incident that made the rule. If those artifacts are missing, you are adopting a slide. Spend a day interviewing the last on-call before you spend a quarter implementing their diagram.
