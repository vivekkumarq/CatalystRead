---
title: "Vault: Identity-Based Secrets Instead of a Shared Password in Git"
slug: "hashicorp-vault-identity-based-secrets"
description: "How HashiCorp Vault replaced long-lived shared credentials with authenticated identities, dynamic leases, and revocation as a first-class operation."
publishedAt: "2026-11-12"
updatedAt: "2026-11-12"
category: "HashiCorp"
tags:
  - Engineering at Scale
  - HashiCorp
  - Security
  - Platform Engineering
sources:
  - title: "Vault Concepts: Identity"
    publisher: "HashiCorp"
    url: "https://developer.hashicorp.com/vault/docs/concepts/identity"
  - title: "Dynamic Secrets"
    publisher: "HashiCorp"
    url: "https://developer.hashicorp.com/vault/docs/secrets"
---

The default secrets architecture in a growing company is a wiki page, an encrypted file in a repo, or an environment variable copied into every scheduler. Those approaches share one property: the secret is a static string that outlives the process that needed it, and the only identity the database sees is a username that twelve services share. When someone leaves, or a laptop is stolen, or a log line prints the connection string, rotation becomes a multi-team incident. HashiCorp Vault's bet was that secrets should be issued to identities for a lease, not copied forever.

## Authenticate a workload, then mint what it needs

Vault sits behind auth methods — tokens, AppRole, Kubernetes service accounts, cloud IAM, LDAP — and maps a successful login onto policies. The interesting product is not encryption as a service, though Vault can do that. It is that a database secret backend can create a unique username and password when an identity asks, with a TTL, and revoke it when the lease expires or an operator kills it. The application never needed a long-lived shared password in the first place; it needed a way to prove who it was to a broker that already has admin rights on the target system.

That identity layer also covers humans. A break-glass path that still uses a shared root token is how Vault deployments recreate the problem they were bought to solve. Entity aliases, groups, and identity policies exist so "this GitHub user" and "this Kubernetes pod" can be reasoned about as subjects, not as bags of tokens that leaked into CI logs.

## Leases, renewal, and the shape of failure

A static KV secret is still available for teams that must store a third-party API key they cannot mint. The operational contract should still be identity-gated: who can read it, how is it audited, how is it rotated. Dynamic secrets raise the bar. If an application cannot renew a lease, it should fail in a way operators notice, not silently keep a password that Vault already destroyed. Cubes and sidecars that refresh credentials on a timer exist because processes are bad at this unless you design it in.

Unsealing and auto-unseal with a cloud KMS or HSM are how you avoid a ceremony every reboot without putting the master key in the same Git repo you just emptied of passwords. Replication and performance standbys exist because a single Vault is a single door in front of every database login.

## Operational gotchas of making Vault the front door

The failure mode is treating Vault as a slow key-value store in the hot path. Every request decrypts a secret at request time, Vault becomes the latency budget, and an outage of the secrets broker is an outage of the product. Cache leases in the process with a refresh well before expiry; do not call Vault on every SQL connection.

Another gotcha is orphan tokens and periodic tokens that never expire because someone wanted to "just make CI work." You have reintroduced immortal credentials with extra YAML. Mid-size steal: short TTLs, renewable leases, and an audit device you actually read after an incident. Root tokens should be created, used to bootstrap, and revoked. Policies that say `path "*" { capabilities = ["sudo"] }` are a wiki password with an API. Dynamic database roles that grant `ALL` because the app team was in a hurry will still dump the customer table when the pod is compromised — Vault limited who could get a password, not what the password could do. Pair identity with least privilege in the target system. Test revocation: if you cannot kill a leaked credential in minutes, you bought a vault-shaped cache.

## What you can borrow

- Authenticate workloads with platform identity (IAM, service accounts) instead of copying a shared password into every runtime.
- Prefer short-lived, revocable credentials over static strings, even if a few third-party keys still have to live in a gated KV path.
- Keep secret fetch off the per-request hot path; renew on a timer and fail loud when renewal dies.
- Treat root and overly broad policies as incidents waiting for a log scrape, not as bootstrap that never ended.
