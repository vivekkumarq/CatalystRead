---
title: "Boundary: Privileged Access Without a Bastion Full of Standing Keys"
slug: "hashicorp-boundary-privileged-access"
description: "How HashiCorp Boundary brokers sessions to infrastructure so engineers get just-in-time access instead of a shared SSH key on a jump box."
publishedAt: "2026-11-15"
updatedAt: "2026-11-15"
category: "HashiCorp"
tags:
  - Engineering at Scale
  - HashiCorp
  - Security
  - Access Control
sources:
  - title: "Boundary Architecture"
    publisher: "HashiCorp"
    url: "https://developer.hashicorp.com/boundary/docs/concepts/security/architecture"
  - title: "Privileged Access Management with Boundary"
    publisher: "HashiCorp"
    url: "https://www.hashicorp.com/blog"
---

The classic privileged-access design is a bastion host, a shared SSH key in a password manager, and a security questionnaire that asks whether you rotate it. The bastion becomes a hotel for credentials: everyone who ever needed production has a way in, network policies treat the jump box as trusted, and session logs — if they exist — are shell history on a box that attackers would love to own. HashiCorp Boundary was built as a broker, not a hotel. Users authenticate to a control plane, get authorization to a target, and workers stitch a session that does not require the user's laptop to hold the target's long-lived key.

## Controllers, workers, targets

Boundary splits control and data. Controllers store identity, grants, and target catalogs; they are the policy brain. Workers are the points that can actually reach private networks. A user never needs a VPN full of routes to every VPC if a worker already lives there. The session is the unit: it starts, it is recorded or not according to policy, and it ends. Credentials can be injected from Vault for the duration of the session rather than copied into the engineer's agent.

That model maps onto the identity story Vault already tells. A human is an OIDC subject, not an SSH user cloned onto fifty boxes. Host catalogs can come from cloud APIs so the target list is not a wiki of IPs. The alternative — updating a bastion's `authorized_keys` on every join and leave — is why jump boxes rot.

## Just-in-time beats standing privilege

Standing access is convenient until it is a breach narrative. Boundary's useful default is that access is a request that can be time-bounded, role-scoped, and revoked by deleting a grant rather than hunting keys. Protocol-aware proxies for SSH, RDP, and database protocols exist because "open a TCP tunnel and hope" is how you accidentally expose Redis to the same path as the app.

The product is also a reaction to service meshes and zero-trust marketing: most companies still have break-glass SSH, still have contractors, still have a data store that is not on the mesh. A PAM layer that speaks those protocols is more honest than a slide that says "no SSH."

## Failure modes of brokers that replace bastions

The concrete failure is a worker that is a wide-open network path with weak controller auth, which is a bastion with extra YAML. Another is injecting static credentials from Vault once and then leaving them in the session for days because max TTL was set to "please stop paging me." Mid-size steal: short sessions, workers in each isolation domain, and controllers that are not reachable from the public internet without SSO.

Operational gotcha: if session recording is on, you now store secrets that appeared on screen. Treat recordings as sensitive data, with retention and access control, not as a debug tape in an open bucket. If recording is off, you cannot answer "who dropped that table." Pick per target. DNS and target address drift will start sessions at the wrong host if catalogs are static; automate host discovery or you will rebuild the wiki. Do not share a single worker between PCI and toy environments because it was cheaper. The broker inherits every network it can route to. Test the deny path: a user who should not reach prod should fail before a TCP handshake, not after a successful SSH as a shared `ubuntu` account that Boundary merely forwarded.

## What you can borrow

- Broker sessions through an identity-aware control plane instead of distributing standing SSH keys to humans.
- Put workers in the networks that hold targets; do not haul every private route onto every laptop.
- Inject short-lived credentials for the session rather than teaching engineers to paste passwords.
- Treat session recordings as a regulated store, or accept that without them you cannot reconstruct privileged actions.
