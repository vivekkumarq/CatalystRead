---
title: "Password Storage: bcrypt, scrypt, Argon2, and Why Plain Hashing Fails"
slug: "password-storage-bcrypt-scrypt-argon2"
description: "Why fast general-purpose hashes like SHA-256 are unsafe for passwords, and how bcrypt, scrypt, and Argon2 defend against modern offline cracking hardware."
publishedAt: "2025-10-08"
updatedAt: "2026-09-16"
category: "Security"
tags:
  - Security
  - Authentication
  - Application Security
  - Backend Engineering
---

"We hash the passwords" is not, by itself, a meaningful security claim. The algorithm behind that hash determines whether a stolen database is a minor incident or a catastrophic one, and the difference between the right and wrong choice is measured in orders of magnitude of attacker effort.

## Why SHA-256 and MD5 are the wrong tool

General-purpose cryptographic hash functions like SHA-256 are designed to be fast, because their usual job is verifying file integrity or building other cryptographic primitives, where speed is a feature. That same speed is a liability for password storage, because it means an attacker who steals a database of hashes can attempt an enormous number of guesses per second on commodity GPU hardware. A single modern GPU can compute billions of SHA-256 hashes per second, which turns cracking a database of unsalted or weakly salted fast hashes into a matter of hours for anything but the longest, most random passwords. Salting prevents precomputed rainbow table attacks and ensures identical passwords don't produce identical hashes, but it does nothing to slow down an attacker brute-forcing one password at a time — that requires the hash itself to be slow.

## Purpose-built password hashing functions

Bcrypt, scrypt, and Argon2 are designed around deliberate slowness and, for the latter two, deliberate memory cost. Bcrypt has a configurable cost factor that controls how many rounds of internal hashing occur, and it's been battle-tested since 1999 with no fundamental breaks, which is a meaningful track record in cryptography. Its weakness relative to newer alternatives is that it's not memory-hard, which makes it somewhat more amenable to parallelized cracking on custom hardware than the memory-hard alternatives.

Scrypt introduced memory-hardness: it requires a configurable amount of RAM per hash computation, which makes building cheap, massively parallel cracking hardware much harder, since GPUs and ASICs have far less memory per compute unit than a general-purpose CPU. Argon2, the winner of the 2015 Password Hashing Competition, refined this further and is the current recommendation from OWASP for new applications, specifically the Argon2id variant, which combines resistance to both GPU-based and side-channel attacks.

```python
# Argon2id via the argon2-cffi library
from argon2 import PasswordHasher

ph = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=4)
hashed = ph.hash("user-supplied-password")

try:
    ph.verify(hashed, "user-supplied-password")
except Exception:
    # verification failed
    pass
```

## Choosing and tuning parameters

The right cost parameters depend on your server's available CPU and memory and should target roughly 250-500ms per hash operation on your actual production hardware — enough to meaningfully slow an attacker without degrading login latency for real users. Retest these parameters periodically; hardware gets faster, and a cost factor that was appropriately slow three years ago may be comparatively cheap today. Most password hashing libraries expose a way to detect when a stored hash used outdated parameters, so you can transparently re-hash a user's password with updated cost settings the next time they log in successfully.

## The parts that are easy to get wrong anyway

Never cap password length in a way that truncates before hashing, since some poor bcrypt implementations silently ignore characters past 72 bytes — validate this against your specific library rather than assuming. Never roll a custom hashing scheme by combining a fast hash with a manual salt and a loop counter; the failure modes of naive iterated hashing are well documented and a purpose-built algorithm has already solved them correctly. And keep in mind that password hashing only protects against a stolen database — it does nothing against credential stuffing, weak or reused passwords, or a compromised endpoint, so it belongs alongside rate limiting, breach-password checks, and multi-factor authentication rather than in place of them.

## A worked failure mode

MD5 is "salted" in application code. bcrypt is used with a cost of 4, or on a truncated 72-byte secret that silently drops entropy. Pepper is in the same database. The failure is hashing as folklore. Use a modern KDF with a tuned cost, full password, unique salt, and pepper in a KMS.

## When this is the wrong tool

Password hashing is the wrong tool if you should be using a passkey or SSO. Do not hash API keys the same way you hash passwords if you need fast lookup—use HMAC or a table of hashes designed for that. Store passwords only if you must.

A second, quieter failure is operational: the idea is copied from a talk into a path that has no rollback, no owner, and no metric that would show the invariant breaking. For "Password Storage: bcrypt, scrypt, Argon2, and Why Plain Hashing Fails", that usually means a Friday deploy with production as the first realistic test. Write down the user-visible symptom, the invariant, and the revert before you scale the pattern. If revert is a data rewrite, you do not have a revert—you have a project. Practice the failure in staging with production-sized data at least once, or you will practice it on customers.
