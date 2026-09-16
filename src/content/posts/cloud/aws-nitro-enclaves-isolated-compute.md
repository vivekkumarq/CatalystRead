---
title: "AWS Nitro Enclaves: Isolated Compute When the Operator Is in the Threat Model"
slug: "aws-nitro-enclaves-isolated-compute"
description: "Enclaves, vsock, attestation documents, and KMS Decrypt that only the enclave can call — plus the operational limits that keep this from being 'just a VM'."
publishedAt: "2026-09-12"
category: "Cloud"
tags:
  - Cloud
  - AWS
  - Confidential Computing
  - Security
sources:
  - title: "Nitro Enclaves User Guide"
    publisher: "Amazon Web Services"
    url: "https://docs.aws.amazon.com/enclaves/latest/user/nitro-enclaves.html"
  - title: "Nitro System"
    publisher: "AWS"
    url: "https://aws.amazon.com/ec2/nitro/"
---

A Nitro Enclave is a **locked-down VM** carved from a parent EC2 instance: no persistent storage, no interactive SSH, no operator console, connectivity primarily over **vsock**. The parent cannot dump the enclave's memory with ordinary tools. You use it when the threat model includes **the instance role's humans**, a compromised parent OS, or a need to prove to KMS that only a measured enclave image can unwrap a key.

## Attestation is the product

At boot, Nitro produces an **attestation document** with PCRs (hashes of the enclave image, IAM role, and related measurements). KMS can require those PCRs in a key policy (`kms:RecipientAttestation:ImageSha384` and friends) so `Decrypt` only works **from inside** an enclave whose image matches. The parent can broker bytes over vsock; it should never see plaintext keys.

```text
parent  --vsock--> enclave (unwrap DEK via KMS + attestation)
enclave processes payload, returns ciphertext or a token
```

If you skip attestation-bound KMS and just "run the code in an enclave," you have isolation from the parent but not a cryptographic proof. Anyone who can start a different enclave image on a similar instance may still call KMS if the policy is slack.

## What you will fight operationally

Images are built with `nitro-cli`. Debugging is log-over-vsock, not `ssh`. Memory and vCPU are reserved from the parent; oversize the enclave and the parent starves. No easy outbound networking: you proxy through the parent, which means the parent is still in the availability path and can DoS or tamper with **ciphertext** (integrity of the channel is your protocol). Clock and entropy come from Nitro; still design protocols that do not need the parent to be honest about time.

Enclaves are a poor fit for a general application server. They are a fit for: pinning a TLS private key, processing PCI tokens, or a small policy engine. Latency includes enclave boot if you start per job; long-lived enclaves are more common.

## Honest limits

Nitro Enclaves are not a substitute for IAM hygiene. A parent that can replace the enclave image in an auto-scaling group without PCR pinning in KMS undoes the story. Side channels exist in the confidential computing literature; AWS's isolation is strong against casual operator dump, not a mathematical end of all leakage.

Read the user guide's attestation and KMS integration chapters. Then write a key policy that names PCRs before you write the vsock protocol. The enclave is a vault. The policy is the lock.
