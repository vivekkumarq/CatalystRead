---
title: "Serverless Cold Starts and How to Actually Mitigate Them"
slug: "serverless-cold-starts-and-how-to-mitigate-them"
description: "What causes cold starts in serverless functions, why runtime and package size matter more than most tuning knobs, and the mitigations that actually move the needle."
publishedAt: "2025-09-08"
category: "Cloud"
tags:
  - Serverless
  - Cloud
  - AWS
  - Performance
---

Cold starts get blamed for a lot of serverless performance complaints, but the fix people reach for first — bumping memory allocation — is often a band-aid over a deeper problem with runtime choice or package size. Understanding what actually happens during a cold start makes it obvious which mitigations are worth the effort and which just move the number slightly without addressing the cause.

## What's actually slow during a cold start

A cold start has several phases: provisioning a new execution environment, downloading and initializing the runtime, loading your deployment package, and running any module-level initialization code before the handler even executes. For a large Node.js function pulling in a heavy dependency tree, that init phase — not the sandbox provisioning — is frequently the biggest contributor:

```javascript
// This runs on every cold start, before the handler is invoked
const AWS = require('aws-sdk');          // large, slow to parse
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();       // connection setup at module scope

exports.handler = async (event) => {
  // ...
};
```

Every import at the top of the file gets parsed and executed before the first request can be served, so a function with a 40MB deployment package and a dozen heavy imports can spend hundreds of milliseconds just loading code, independent of anything AWS controls.

## Runtime choice matters more than most tuning

Interpreted, JIT-compiled runtimes like Node.js and Python generally cold-start faster than JVM-based runtimes like Java, where class loading and JIT warm-up add real overhead. Compiled languages with minimal runtime initialization — Go, Rust — tend to cold-start fastest of all because there's no separate runtime to bootstrap; the binary just starts executing.

```dockerfile
# A minimal Go Lambda has almost nothing to initialize at cold start
FROM public.ecr.aws/lambda/provided:al2023 AS base
COPY bootstrap /var/runtime/bootstrap
CMD ["handler"]
```

If a workload is genuinely latency-sensitive on the cold path — user-facing APIs invoked sporadically rather than steady background jobs — the runtime choice alone can be a bigger win than any amount of tuning within a slower runtime.

## Reducing package size and lazy-loading dependencies

Trimming the deployment package directly reduces the code that has to be loaded before the handler runs. Bundling with esbuild or webpack, tree-shaking unused code, and excluding dev dependencies from the deployed artifact all shrink init time measurably:

```bash
esbuild src/handler.js --bundle --minify --platform=node --outfile=dist/handler.js
```

For dependencies only needed by a rarely-hit code path, importing them inside the handler rather than at module scope defers that cost to only the requests that actually need it:

```javascript
exports.handler = async (event) => {
  if (event.requiresPdfExport) {
    const { generatePdf } = require('./pdf-generator'); // loaded on demand
    return generatePdf(event);
  }
  return { statusCode: 200, body: 'ok' };
};
```

## Provisioned concurrency, and when it's worth the cost

For latency-critical endpoints where even occasional cold starts are unacceptable, provisioned concurrency keeps a set number of execution environments pre-initialized and ready:

```bash
aws lambda put-provisioned-concurrency-config \
  --function-name checkout-api \
  --qualifier prod \
  --provisioned-concurrent-executions 5
```

This isn't free — you pay for those environments whether or not they're handling traffic — so it's best reserved for functions with a known, sustained baseline of traffic where the cost is predictable, not for spiky or rarely-invoked functions where it would mean paying to keep capacity idle most of the time. For those, reducing package size and choosing a faster runtime usually delivers most of the benefit at zero ongoing cost.
