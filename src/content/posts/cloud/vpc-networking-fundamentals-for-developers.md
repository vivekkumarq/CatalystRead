---
title: "VPC Networking Fundamentals Every Developer Should Actually Know"
slug: "vpc-networking-fundamentals-for-developers"
description: "A practical walkthrough of VPC networking concepts, from subnets and route tables to security groups, aimed at developers who deploy but don't design networks."
publishedAt: "2026-01-05"
category: "Cloud"
tags:
  - Cloud
  - Networking
  - AWS
  - Infrastructure
---

Most application developers treat the VPC as infrastructure someone else set up, right up until a service can't reach a database and the debugging session turns into a crash course in route tables and security groups under time pressure. A working mental model of the handful of concepts that actually matter — subnets, route tables, and security boundaries — turns that debugging session from guesswork into a five-minute checklist.

## Public and private subnets are a routing decision, not a label

A subnet is "public" or "private" purely based on what its route table points to for `0.0.0.0/0` traffic, not because of any inherent property of the subnet itself. A public subnet routes internet-bound traffic to an internet gateway; a private subnet routes it to a NAT gateway (or nowhere at all):

```
Public subnet route table:
0.0.0.0/0  -> igw-0abc123          (internet gateway, direct)
10.0.0.0/16 -> local

Private subnet route table:
0.0.0.0/0  -> nat-0def456          (NAT gateway, outbound only)
10.0.0.0/16 -> local
```

The practical consequence: a private subnet resource can initiate outbound connections (pulling a package, calling an external API) through the NAT gateway, but nothing on the internet can initiate a connection inbound to it. That asymmetry is exactly why databases and internal services belong in private subnets — they need outbound access for updates and calls to other services, but should never be directly reachable from outside the VPC.

## Security groups are stateful, NACLs are not

This distinction causes more confusion than almost anything else in VPC networking. A security group is stateful: if you allow inbound traffic on port 443, the response traffic is automatically allowed back out, regardless of the outbound rules. A network ACL is stateless: you must explicitly allow both the inbound request and the outbound response, on the correct ephemeral port range.

```
# Security group: this single rule is enough for both directions
Inbound:  ALLOW  tcp/443  from 0.0.0.0/0

# NACL: you need both directions explicitly, including the ephemeral range
Inbound:  ALLOW  tcp/443       from 0.0.0.0/0
Outbound: ALLOW  tcp/1024-65535 to 0.0.0.0/0   # ephemeral response ports
```

Most teams should default to security groups for day-to-day access control and reserve NACLs for coarse, subnet-wide deny rules — blocking a known bad IP range at the subnet level, for instance — where their stateless, explicit nature is actually an asset rather than a source of confusing misconfiguration.

## Why "it can't reach the database" is usually one of three things

When a service in one subnet can't reach a resource in another, the cause is almost always one of: the security group on the destination doesn't allow inbound traffic from the source's security group or CIDR, the route table on the source subnet has no path to the destination (common when the destination is in a peered VPC and the route wasn't added on both sides), or the destination's own OS-level firewall is blocking the connection independently of anything AWS-level.

```bash
# Quick diagnostic: does the destination security group allow the source?
aws ec2 describe-security-groups --group-ids sg-0123456789 \
  --query 'SecurityGroups[0].IpPermissions'
```

Checking security group rules first is usually the fastest path to an answer, since route table misconfigurations tend to fail loudly (complete timeout, no partial connectivity) while security group misconfigurations look identical from the client's perspective — both present as a connection that simply hangs.

## VPC peering and transit gateways don't propagate routes automatically

Setting up a VPC peering connection or attaching a VPC to a transit gateway doesn't automatically make routing work — each side's route table still needs an explicit route pointing traffic for the other VPC's CIDR at the peering connection or transit gateway attachment. This is the single most common cause of "I set up peering but it still doesn't connect," and checking both sides' route tables, not just confirming the peering connection is in `active` state, is the fix.
