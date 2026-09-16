---
title: "IAM Least Privilege in Practice, Not Just in Theory"
slug: "iam-least-privilege-in-practice"
description: "Least privilege is easy to state as a principle and hard to implement well. Here's how to actually scope IAM policies without breaking every deploy."
publishedAt: "2025-10-06"
updatedAt: "2026-09-16"
category: "Cloud"
tags:
  - IAM
  - Security
  - Cloud
  - AWS
---

"Least privilege" is one of those security principles everyone agrees with and almost nobody fully implements, because the honest version of it is tedious: enumerating exactly which actions a role needs, on exactly which resources, and revisiting that list as the system evolves. Most teams end up somewhere between "one wildcard admin role for everything" and genuine least privilege, and the gap between those two is where a surprising number of breaches actually happen.

## Why wildcard policies are the default failure mode

It's much faster to grant `s3:*` on `*` than to figure out the six specific actions a service actually calls, so under deadline pressure, broad policies win by default. The risk isn't abstract — a compromised credential or a vulnerable dependency with that role attached now has the blast radius of the wildcard, not the blast radius of what the service actually does:

```json
{
  "Effect": "Allow",
  "Action": "s3:*",
  "Resource": "*"
}
```

versus the policy that actually matches what an image-processing service does — reading from one bucket, writing to another:

```json
{
  "Effect": "Allow",
  "Action": ["s3:GetObject"],
  "Resource": "arn:aws:s3:::uploads-raw/*"
},
{
  "Effect": "Allow",
  "Action": ["s3:PutObject"],
  "Resource": "arn:aws:s3:::uploads-processed/*"
}
```

The second version means a compromised credential for this service can read from one bucket and write to another — it cannot delete objects, list unrelated buckets, or touch any other AWS service, even though that takes more upfront work to write correctly.

## Using access analyzer output instead of guessing

Writing a minimal policy from scratch by reading documentation is slow and error-prone — it's easy to miss an action a service calls only in an edge case. AWS IAM Access Analyzer's policy generation, built from actual CloudTrail activity over a observation period, produces a policy based on what a role really did, not what you assumed it needed:

```bash
aws accessanalyzer start-policy-generation \
  --policy-generation-details principalArn=arn:aws:iam::123456789012:role/image-processor \
  --cloud-trail-details '{"trails":[{"cloudTrailArn":"arn:aws:cloudtrail:us-east-1:123456789012:trail/main","allRegions":true}],"startTime":"2026-01-01T00:00:00Z"}'
```

This flips the workflow from "guess broad, tighten later" (which rarely happens) to "start from what's observed, then explicitly add anything for known upcoming use," which is a much more reliable path to a genuinely tight policy.

## Scoping by resource, not just by action

Limiting which actions are allowed is only half of least privilege — the other half is limiting which resources those actions apply to. A policy that allows `s3:GetObject` on `*` still lets a compromised role read every bucket in the account:

```json
{
  "Effect": "Allow",
  "Action": "s3:GetObject",
  "Resource": "arn:aws:s3:::uploads-raw/${aws:PrincipalTag/team}/*"
}
```

Using policy variables like `${aws:PrincipalTag/team}` ties the resource scope to a tag on the calling principal, which is especially useful for multi-tenant setups where dozens of similar roles need access to their own slice of a shared bucket structure, without maintaining a separate hand-written policy per team.

## Treating IAM policies as code, with review

Because IAM changes are often made directly in the console during an urgent fix, they tend to drift from what's in version control and never get tightened back up afterward. Managing policies through Terraform or CloudFormation, with pull request review specifically for permission changes, catches over-broad grants before they ship rather than during a security audit months later:

```hcl
resource "aws_iam_role_policy" "image_processor" {
  name = "s3-scoped-access"
  role = aws_iam_role.image_processor.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      { Effect = "Allow", Action = ["s3:GetObject"], Resource = "arn:aws:s3:::uploads-raw/*" }
    ]
  })
}
```

A dedicated reviewer for IAM diffs, even informally, catches the "just add `*` to unblock myself" commits that would otherwise merge without scrutiny.

## A worked failure mode

A service role is granted `s3:*` on `*` because a developer was blocked on Friday. Six months later a dependency with SSRF lists buckets and copies a backup. Nobody notices: CloudTrail is on but nobody diffs IAM. A tighter design would have been one bucket ARN, prefix, and verbs, plus a permission boundary so even "admin" developers cannot widen production roles. The failure is treating IAM as an unlock button. Start from the API calls in logs, write the policy, and break that path in staging on purpose.

## When this is the wrong tool

Spending a month on perfect IAM is the wrong tool if the app still uses a shared root key in a repo. Least privilege will not stop a stolen credential that has the privileges it needs; pair it with short-lived creds and detection. Do not copy AWS managed Admin policies into production custom roles. Use least privilege when you can name the resource and the verbs; use a temporary break-glass role with logging for the exceptions.
If a dry-run in staging with production-like volume does not reproduce the benefit, do not scale the idea on a hope and a dashboard. Ship the smaller version that you can revert in one deploy.
