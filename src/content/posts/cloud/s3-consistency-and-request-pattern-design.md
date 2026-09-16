---
title: "Object Storage Consistency and the Request Patterns That Survive It"
slug: "s3-consistency-and-request-pattern-design"
description: "What read-after-write means on S3 today, why list-after-delete still bites, and how to design keys, retries, and multipart uploads around that."
publishedAt: "2026-08-19"
updatedAt: "2026-09-16"
category: "Cloud"
tags:
  - Cloud
  - S3
  - Storage
  - Distributed Systems
sources:
  - title: "Amazon S3 now provides strong read-after-write consistency"
    publisher: "AWS News Blog"
    url: "https://aws.amazon.com/blogs/aws/amazon-s3-update-strong-read-after-write-consistency/"
  - title: "Amazon S3 Strong Consistency"
    publisher: "AWS Documentation"
    url: "https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html"
---

For years, S3 tutorials opened with "eventual consistency on overwrite and delete." In 2020 AWS announced strong read-after-write consistency for new puts, overwrites, and deletes in all regions — a GET after a successful PUT of the same key should see that write. That change retired a class of "retry until the object appears" hacks. It did not retire key design, listing semantics, or the fact that your *application's* multi-key workflow is still not a transaction.

## What "strong" covers, and what it does not

Strong consistency is per key, for the object store's own operations. It does not make two keys atomic. Uploading `manifest.json` and `data/0001.parquet` as two PUTs can still be observed in-between: a reader can see the new manifest and miss a part, or the reverse, unless you publish the manifest last and treat it as the commit record.

List operations are the remaining source of surprise. A LIST may lag or include keys you just deleted depending on prefix and timing. Build workflows that do not require LIST as a linearizable transaction log. Prefer a DynamoDB or Postgres index of keys you care about, or a single commit object that names the set.

```text
Good:  put parts → put manifest (immutable versioned key)
Bad:   put parts → expect LIST(prefix) to be the source of truth immediately
```

## Idempotent keys beat clever retries

PUT is idempotent for the same body; multipart upload is not if you mix upload IDs. Use deterministic object keys from a content hash or a business id plus a version. Retries after a timeout should reuse the same key, not mint `file-copy-2`. Otherwise you leak objects and you cannot tell which one the database row points at.

Conditional writes (`If-None-Match: *` on a create, or etag-based updates where supported) are how you prevent two workers from clobbering a non-versioned key. If the object is the system of record, enable versioning or you will not have a forensic trail.

## Request patterns that keep bills and latency sane

Small random GETs of huge objects are the anti-pattern; use range GETs or chunk the file. Tiny objects (kilobytes of JSON at millions per day) often belong in a database, with S3 used for blobs. Cross-region replication is asynchronous: do not pretend a PUT in `us-east-1` is already readable in `ap-south-1` for a user request.

The 2020 consistency upgrade is real and worth deleting old comments about "wait 2 seconds after PUT." Replace those comments with the actual invariant you need: single-key read-your-writes, or a multi-object commit protocol you designed on purpose.

## A worked manifest commit

Upload parts to `runs/2026-09-16/job-9f3c/parts/0001.parquet` … `000N`. Only after all parts succeed, PUT `runs/2026-09-16/job-9f3c/manifest.json` listing every part key and checksum. Readers take a manifest key from a database row (or a `current.json` you overwrite last). They never LIST the prefix to decide completeness. A retry of part `0001` uses the same key and the same bytes (or a new versioned key if you must replace).

Multipart: reuse one upload ID per part set; abort abandoned uploads on a timer or you pay for incomplete parts.

## Failure modes

**LIST as transaction log.** Clients see a partial prefix and process it.

**Timeout then new key.** Orphan objects and a DB pointer at the old name.

**Cross-region read-your-write.** Replication lag is not the 2020 strong-consistency guarantee.

**Overwrite without versioning** on a system-of-record object. No forensic trail.

**Tiny JSON at millions of PUTs/day.** Request overhead dominates; those rows wanted a database.

## When not to treat S3 as a database

Secondary indexes, multi-key transactions, query-by-attribute, and low-latency conditional logic. Conditional PUTs help for a single key; they do not replace DynamoDB for a work queue. Also skip S3 for the source of truth of a lock unless you fully understand TTL and fencing; people rebuild ZooKeeper badly with objects.

## Review checklist

- Multi-object workflows have an explicit commit object; LIST is not the commit.
- Keys are deterministic; retries do not mint copies.
- Versioning or immutability on objects that are the system of record.
- Cross-region is called out as async; range GET for large blobs.
