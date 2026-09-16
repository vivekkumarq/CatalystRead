---
title: "Cloud Cost Optimization Tactics That Don't Sacrifice Reliability"
slug: "cloud-cost-optimization-tactics"
description: "Concrete cloud cost optimization tactics, from rightsizing to commitment discounts, ranked by effort versus savings so you know where to start."
publishedAt: "2025-10-20"
updatedAt: "2026-09-16"
category: "Cloud"
tags:
  - Cloud
  - AWS
  - Cost Optimization
  - Infrastructure
---

Cloud cost optimization projects tend to swing between two extremes: an unfocused across-the-board cut that damages reliability margins, or an endless audit that produces a spreadsheet nobody acts on. The tactics that actually move a bill meaningfully are a short list, and most of them are safe to apply without touching anything that affects availability.

## Rightsizing before anything else

The highest-leverage, lowest-risk optimization is almost always rightsizing — matching instance and resource requests to what workloads actually use, rather than what was provisioned defensively at launch. Cloud provider cost tools surface this directly:

```bash
aws ce get-rightsizing-recommendation \
  --service AmazonEC2 \
  --configuration '{"RecommendationTarget":"SAME_INSTANCE_FAMILY"}'
```

In Kubernetes clusters specifically, pod resource requests are a frequent source of waste — a request set to `2` CPU "to be safe" when actual usage sits at 300m means the scheduler reserves capacity that's never used, inflating node count. Tools like the Vertical Pod Autoscaler in recommendation-only mode surface this gap without automatically applying changes:

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: checkout-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: checkout
  updatePolicy:
    updateMode: "Off"  # recommendation only, doesn't auto-apply
```

## Commitment discounts for predictable baseline load

For workloads with a stable, predictable floor — not the peak, the floor — reserved instances or savings plans trade a commitment for a substantial discount, often 30-50% versus on-demand pricing:

```bash
aws ce get-savings-plans-purchase-recommendation \
  --savings-plans-type COMPUTE_SP \
  --term-in-years ONE_YEAR \
  --payment-option NO_UPFRONT
```

The key discipline is committing only to the floor, not the peak — sizing the commitment against your minimum sustained usage over the last few months, and covering the variable portion above that with on-demand or spot capacity. Over-committing based on a temporary traffic spike locks in cost for capacity you may not keep using.

## Spot instances for interruption-tolerant workloads

Batch jobs, CI runners, and stateless workers that can handle being interrupted and restarted are strong candidates for spot instances, which run at 60-90% off on-demand pricing in exchange for the provider being able to reclaim capacity with short notice:

```yaml
# Karpenter NodePool example targeting spot capacity
apiVersion: karpenter.sh/v1
kind: NodePool
spec:
  template:
    spec:
      requirements:
        - key: karpenter.sh/capacity-type
          operator: In
          values: ["spot"]
```

This is a poor fit for anything stateful or latency-sensitive where an interruption mid-request causes user-visible failure, but for a CI fleet or a batch ETL pipeline with retry logic already built in, it's close to free savings.

## Storage class and data transfer are the quiet cost centers

Compute gets the attention, but storage class misallocation and cross-AZ or cross-region data transfer often account for a larger, less visible share of the bill than expected. Data written once and rarely read sitting in S3 Standard instead of Infrequent Access, or a chatty microservice architecture generating heavy cross-AZ traffic between services that could colocate, both compound quietly over a full billing cycle.

```bash
aws ce get-cost-and-usage \
  --time-period Start=2026-01-01,End=2026-02-01 \
  --granularity MONTHLY \
  --metrics "UnblendedCost" \
  --group-by Type=DIMENSION,Key=USAGE_TYPE
```

Grouping cost explorer output by usage type, rather than just by service, is usually what surfaces these — a line item for `DataTransfer-Regional-Bytes` that's a meaningful fraction of total EC2 spend is a signal worth investigating architecturally, not just accepting as a fixed cost of doing business.

## A worked example

Rightsizing: p95 CPU 15% on a 4xlarge → smaller instance + HPA. Disk: gp3 vs io2 measured. Idle: turn off non-prod at night with a schedule that on-call knows. Storage lifecycle on S3. Commit discounts only after a stable baseline. A weekly report: cost per checkout, not only total bill.

You tag `service` and `env` and refuse untagged spend.

## Failure modes

Killing redundancy for savings. Reserved instances for a service you will delete. Spot for a stateful primary without a story. "Optimization" that increases engineer time more than the bill. Ignoring data transfer. Autoscaling min=10 forever.

FinOps dashboards nobody owns.

## When this is the wrong tool

Cost cuts during an incident. Do not optimize a $20 sandbox. Premature Graviton rewrites without a perf test. If the product is unused, turn it off — that beats kube tuning. Negotiating enterprise discounts is not an engineer-only tactic. Avoid "move to serverless" as a cost story without measuring.
