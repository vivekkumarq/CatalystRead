---
title: "The Confused Deputy Problem in Cloud IAM, With Resource Policies That Close It"
slug: "iam-confused-deputy-and-resource-policies"
description: "How a service with a broad role gets tricked into acting on the wrong resource, and the sts:ExternalId / source ARN patterns that stop it."
publishedAt: "2026-08-22"
updatedAt: "2026-09-16"
category: "Cloud"
tags:
  - Cloud
  - IAM
  - Security
  - AWS
sources:
  - title: "The Confused Deputy Problem"
    publisher: "AWS IAM User Guide"
    url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/confused-deputy.html"
---

A confused deputy is a service that has permission to do something powerful, and a caller who should not be allowed to aim that power at an arbitrary target. In AWS this shows up when you let customers pass a role into your SaaS: your control plane assumes their role to write into *their* bucket — unless they sneak a bucket name they do not own, and your deputy writes there with a role that trusts you.

This is not theoretical. Cross-account `s3:PutObject` integrations, CloudWatch subscriptions, and KMS grants have all had variants. Least privilege on *your* role is not enough if the role can be pointed at any ARN the caller types into a form.

## External IDs and source identity

When a customer creates a role that trusts your account, they should require an external ID you generated and stored on their tenant record. Your `AssumeRole` call must send that ID. A attacker who creates a role trusting you, but does not know the victim's external ID, cannot hitch a ride on your deputy to the victim's resources — if you actually pass the ID and if the customer's trust policy checks it.

```json
{
  "Effect": "Allow",
  "Principal": { "AWS": "arn:aws:iam::YOUR_SAAS:root" },
  "Action": "sts:AssumeRole",
  "Condition": {
    "StringEquals": { "sts:ExternalId": "tenant-8f3c-..." }
  }
}
```

`aws:SourceArn` / `aws:SourceAccount` conditions on resource policies (SNS, S3, EventBridge) pin *which* of your resources may publish. Without them, any principal in your account that can publish to that service class might fan into a customer topic.

## Resource policies versus identity policies

Identity policy: what the role can do. Resource policy: who can use the bucket, key, or topic. Confused-deputy bugs live in the gap — identity says "s3:* on *" and the resource says "allow this service." Tighten both. Prefer generating the target ARN from *your* database (tenant id → bucket you provisioned) rather than from a client-supplied string.

Logs should record the external ID, the assumed role ARN, and the object key. After an incident, "we assumed something" is not a narrative.

If you are reviewing a multi-tenant AWS integration, ask: "If I pass you my competitor's bucket ARN, do you write to it?" The only acceptable answer is no, with a pointer to the condition keys that make it no.

## A worked example

Your SaaS provisions `arn:aws:s3:::acme-tenant-{id}` and stores `{id}` in your database. When the customer clicks "export," your worker assumes `arn:aws:iam::{customer}:role/AcmeExport` with `ExternalId` from your DB, then `PutObject` only to `s3://acme-tenant-{id}/exports/...`. The customer role's trust policy requires that external ID. The bucket policy allows `s3:PutObject` from that role ARN, not from the world.

A penetration test that supplies a competitor's bucket name in the API body must fail at *your* validation layer before `AssumeRole`, and would fail again if the assumed role is scoped to one prefix.

## Failure modes

Generating external IDs that are guessable (tenant slug). Reusing one external ID for all customers. Not passing `ExternalId` on `AssumeRole` because "the role already trusts us." Resource policies that allow `Principal: *` with a condition you mis-type. Lambda that takes a target ARN from an SQS message without binding it to the tenant on the message's IAM role.

CloudTrail without `sourceIPAddress` / `userIdentity` correlation makes after-the-fact proof expensive.

## When this is the wrong tool

If there is no cross-account assume-role, confused-deputy ExternalId is not your problem — ordinary least privilege is. Do not bolt ExternalId onto same-account role hops as a substitute for removing `s3:*`. Resource policies are the wrong tool to encode per-user product authorization (use the app). If a partner insists on a role that can write to any of their buckets, decline or isolate that partner on a dedicated AWS account. For non-AWS clouds, the same pattern is "audience + resource condition"; copy the idea, not the JSON keys.

## Review checklist

- Target ARNs come from tenant records you provisioned, not from form fields.
- `AssumeRole` always sends the stored external ID; trust policies require it.
- Resource policies pin `aws:SourceArn` / `aws:SourceAccount` for publishers.
- CloudTrail can answer which tenant, which role, which key.
