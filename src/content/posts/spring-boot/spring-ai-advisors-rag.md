---
title: "Spring AI Advisors: Practical RAG Without a Framework Religion"
slug: "spring-ai-advisors-rag"
description: "Advisors around ChatClient, QuestionAnswerAdvisor, and the retrieval details that matter: chunking, filters, and not stuffing the window."
publishedAt: "2026-09-09"
category: "Spring Boot"
tags:
  - Spring Boot
  - Spring AI
  - RAG
  - Java
sources:
  - title: "Spring AI Advisors"
    publisher: "Spring"
    url: "https://docs.spring.io/spring-ai/reference/api/advisors.html"
  - title: "Retrieval Augmented Generation"
    publisher: "Spring AI docs"
    url: "https://docs.spring.io/spring-ai/reference/api/retrieval-augmented-generation.html"
---

Spring AI's `ChatClient` is a fluent wrapper over model providers. **Advisors** are interceptors around the call: logging, memory, safety, and **RAG**. `QuestionAnswerAdvisor` (and vector-store retrieval advisors) pull documents, then inject them into the prompt. That is convenient. It is also how teams ship a demo that retrieves the wrong PDF chunk and sounds confident.

## Advisors are a chain, not magic memory

Order matters. A retrieval advisor should run before the model call and after you have a user question (and any rewritten query). A logging advisor should redact. Token counting advisors belong in production if you pay per token. Write a small custom advisor when you need tenant filters on the vector store — generic RAG that searches the whole corpus is a data leak.

```java
ChatClient.builder(model)
  .defaultAdvisors(
      new QuestionAnswerAdvisor(vectorStore,
          SearchRequest.builder().topK(4).build()))
  .build();
```

`topK=4` is a guess. Too small: misses the table that answers the question. Too large: context window fills with near-duplicates, latency and cost jump, and the model latches onto the wrong paragraph. Measure groundedness with a golden set of questions, not with "it feels better."

## Chunking and metadata beat prompt poetry

Split on structure (headings, pages) with overlap. Store `tenant_id`, `doc_id`, `as_of_date` as metadata and **filter** before similarity. Similarity search without a filter is how employee A sees employee B's handbook. Re-rank if you can afford a second model; BM25 hybrid search often beats naive embeddings on identifiers and error codes.

Do not retrieve into every chit-chat message. Gate RAG on intent. Cache embeddings of queries with care (privacy). The advisor should fail open to "I don't know" when scores are low; fail closed is a product decision you must implement, not a default.

## Operational Spring bits

Vector stores (Pgvector, OpenSearch, Pinecone) are another production database: backups, schema, and poisoning. Ingest pipelines need the same review as any ETL. Model outages: timeouts and fallbacks on `ChatClient`. Prompt injection: retrieved docs are **untrusted text**; they can instruct the model. Treat them like untrusted HTML.

Spring AI will keep renaming types as the project moves. Pin versions. Keep your chunker and filters in code you own, even if the advisor class changes.

Read the advisors reference, then build a 20-question eval set from real tickets. If retrieval `@1` is wrong, no advisor chain will save the answer. RAG is search plus a model. Debug search first.
