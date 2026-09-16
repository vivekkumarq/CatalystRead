---
title: "AWS Organizations SCPs: The Guardrail That Beats a Strongly Worded Wiki"
slug: "multi-account-aws-organizations-scp"
description: "Service control policies in a multi-account org: deny lists, allowed regions, and why SCPs do not replace IAM identity policies."
publishedAt: "2026-09-17"
category: "Cloud"
tags:
  - Cloud
  - AWS
  - IAM
  - Organizations
sources:
  - title: "Service control policies (SCPs)"
    publisher: "AWS Organizations"
    url: "https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html"
  - title: "AWS Organizations"
    publisher: "Amazon Web Services"
    url: "https://docs.aws.amazon.com/organizations/latest/userguide/orgs_introduction.html"
---

A multi-account AWS estate without **Organizations** is a pile of root users. With Organizations, you get a tree of OUs, consolidated billing, and **service control policies** (SCPs): JSON that sets the **maximum permissions** for accounts in an OU. An SCP cannot grant what IAM did not grant. It can deny `ec2:Create*` in a sandbox OU, deny regions you do not operate in, and deny disabling CloudTrail. That is the point of the landing zone.

## Deny is the usual shape

Allow-list SCPs (`"Effect":"Allow"` as the only statement) are easy to get wrong and break AWS itself if you omit required service principals. Prefer **deny** with conditions: `aws:RequestedRegion` not in `[eu-west-1, us-east-1]`, deny `s3:PutBucketPublicAccessBlock` inversions, deny leaving GuardDuty. `FullAWSAccess` is attached by default; removing it without a replacement is a lockout.

```json
{
  "Effect": "Deny",
  "Action": ["*"],
  "Resource": "*",
  "Condition": {
    "StringNotEquals": {
      "aws:RequestedRegion": ["us-east-1", "eu-west-1"]
    }
  }
}
```

Exceptions need paths: a break-glass role in a security account, not a hole in every workload account. Test SCPs in a sandbox OU. An SCP that denies `iam:*` without exceptions can prevent the incident response you wrote in the runbook.

## SCPs versus identity versus resource policies

Effective permission is the **intersection** of identity policy, permission boundaries (if any), SCP, session policies, and resource policies. An S3 bucket policy can still allow a confusing deputy if you only thought in SCPs. SCPs do not apply to the management account the way people assume — know the exceptions. They do not constrain AWS service-linked roles uniformly; read the current docs.

Account vending (Control Tower, AFT, or homemade) should attach SCPs at OU creation. Drift is a human attaching `AdministratorAccess` and believing SCP "regions" still hold — they do, unless the action is in an exempted prefix.

## Org structure

OUs by **environment and security posture** (prod, sandbox, security, suspended), not by every team name. Teams get accounts; OUs get policy. Moving an account between OUs changes its maximum permissions — treat it as a change-managed event.

Read the SCP evaluation chapter until you can explain why a user with `AdministratorAccess` still cannot create a resource in `ap-south-1`. Then write the deny-region policy and a sandbox that proves it. Wikis do not evaluate on `CreateBucket`.
