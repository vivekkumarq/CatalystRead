---
title: "WebAuthn and Passkeys: Phishing Resistance That Comes From Origin Binding"
slug: "webauthn-passkeys-phishing-resistant"
description: "Public-key credentials scoped to RP ID, user verification, and why a fake login page cannot replay a passkey assertion."
publishedAt: "2026-08-22"
category: "Security"
tags:
  - Security
  - WebAuthn
  - Passkeys
  - Authentication
sources:
  - title: "Web Authentication: An API for accessing Public Key Credentials"
    publisher: "W3C"
    url: "https://www.w3.org/TR/webauthn-3/"
  - title: "Passkeys"
    publisher: "FIDO Alliance"
    url: "https://fidoalliance.org/passkeys/"
---

A password can be typed into `https://bank.example.evil`. A **passkey** cannot. WebAuthn credentials are generated for a **relying party ID** (usually the registrable domain). The authenticator signs a challenge together with the origin the browser believes it is on. A phishing site on another origin gets a signature that the real server will not accept — or the authenticator refuses to use the credential at all.

## Registration creates a key pair, not a shared secret

`navigator.credentials.create()` asks the authenticator (platform: iCloud Keychain, Google Password Manager, Windows Hello; or a roaming security key) to mint a key pair. The **public key** and credential id go to your server. The private key stays in the authenticator or in the vendor's encrypted sync fabric. Later, `get()` produces an **assertion**: a signature over the challenge, origin, and flags (user presence, user verification).

```text
register: challenge → authenticator → publicKey + credId stored server-side
login:    challenge → assertion(sig) → server verifies with publicKey
```

**User verification** (PIN, biometric) is a flag you request. Discoverable credentials (resident keys) enable usernameless login: the authenticator offers an account picker. Passkeys as marketed are discoverable, often synced credentials. Synced passkeys trade some device-bound hardness for recoverability. Device-bound keys (attestation, enterprise policy) are a different product for high-assurance fleets.

## Server-side chores people skip

Store credential id, public key, sign counter (if the authenticator reports it), and transports. Reject cloned counters that go backwards when the device sends a counter. Allow **multiple credentials per user** so a lost phone is not a lockout. Provide recovery that is not "email a new password" that undoes phishing resistance — recovery is the weak link; treat it as a high-risk flow with extra checks.

Attestation can tell you the authenticator model. Most consumer RP do not need to require attestation; enterprises sometimes do. Do not confuse attestation with user identity.

## UX is security

If passkeys fail closed on every browser quirk, users fall back to SMS. Test conditional UI (autofill passkeys), cross-device flows (QR, Bluetooth), and RP ID on `www` versus apex. Changing RP ID is a migration, not a DNS trick.

WebAuthn does not replace session security, CSRF defenses, or account linking logic. It replaces the shared secret that phishing harvests. MFA that is a second password (SMS OTP) is still phishable; WebAuthn is in a different class.

Read WebAuthn Level 3's ceremony diagrams, then implement with a maintained library and the passkey fallback matrix on iOS/Android/desktop. The origin binding is the feature. Everything else is account recovery policy.
