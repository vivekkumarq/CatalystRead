---
title: "Prometheus Pull vs Push: A Tradeoff, Not a Moral Position"
slug: "prometheus-pull-vs-push-tradeoffs"
description: "Scrapes, service discovery, Pushgateway, and OpenTelemetry collectors: when pull is the operational win, and when short-lived jobs need push."
publishedAt: "2026-09-19"
category: "DevOps"
tags:
  - DevOps
  - Prometheus
  - Metrics
  - Observability
sources:
  - title: "Prometheus documentation: scraping"
    publisher: "Prometheus"
    url: "https://prometheus.io/docs/prometheus/latest/getting_started/"
  - title: "When to use the Pushgateway"
    publisher: "Prometheus"
    url: "https://prometheus.io/docs/practices/pushing/"
---

Prometheus **pulls**. It scrapes HTTP `/metrics` from targets discovered via Kubernetes, Consul, or files. That inverts the Nagios/StatsD instinct of pushing into a daemon. Pull means the server knows what **should** exist: a missing scrape is a target down. Push means you hope the sender is still alive. Both can lie. The documentation's warning about Pushgateway is not snobbery; it is a cardinality and lifetime bug report.

## Why pull fits long-lived services

A Deployment with a stable pod IP (or a kube-sd target) can be scraped every 15s. Relabeling drops noise. `up` is a metric. Horizontal sharding (functional or via agents) scales scrape load. You can still overwhelm Prometheus with **high cardinality** labels (`user_id` on a counter). Pull vs push does not save you from that.

```text
Prometheus --scrape--> pod:8080/metrics
kube-sd updates targets as pods roll
```

Short-lived batch jobs die before a scrape. **Pushgateway** exists for that: the job pushes, Pushgateway holds the last value, Prometheus scrapes the gateway. Stale metrics from a job name that will never run again are the classic outage of "success=1" forever. Delete groups. Use recording rules carefully. The Prometheus authors still prefer the job to expose metrics to a pull if it can linger, or to emit logs/traces for completion, or to use the OpenTelemetry collector with a bounded lifetime.

## Push paths that are honest

Grafana Alloy / OTel Collector can receive OTLP and **remote write** to Prometheus or Mimir. That is push into the collector, pull or write into storage. Network partitions: pull from a central Prometheus into a locked-down VPC needs extra networking; a collector next to the workload that remote-writes may be easier. Firewalls that block incoming scrapes force push.

## Choosing without a flame war

Long-lived microservices: pull, kube-sd, examples with `_bucket` suffixes. Lambda/CI jobs: push with explicit metric **group deletion**, or don't use Prometheus for that heartbeat. Multi-tenant: neither model replaces authentication on scrape endpoints (bearer tokens) or on remote write.

Read the Pushgateway practice page, then look at your batch jobs' last-success times. If a dashboard shows a green job from last quarter, you chose push without TTL. Pull would have shown `up=0`. That is the tradeoff in one screenshot.
