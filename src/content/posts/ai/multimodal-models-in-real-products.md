---
title: "Multimodal Models in Real Products: Use Cases and Constraints"
slug: "multimodal-models-in-real-products"
description: "Where multimodal LLMs earn their cost in production products today, and the practical constraints around images, documents, and audio."
publishedAt: "2026-07-30"
category: "AI"
tags:
  - AI
  - Multimodal
  - LLMs
  - Product
---

Multimodal capability gets demoed with impressive one-off examples â€” reading a whiteboard photo, describing a meme â€” and then teams try to build a product feature on it and discover the gap between "can technically do this" and "reliable enough to ship" is wider than the demo suggested. The use cases that actually work well in production tend to be narrower and more structured than the demos imply.

## Where it reliably earns its cost

Document understanding â€” extracting structured data from invoices, forms, receipts, IDs â€” is the strongest production use case today, because the task is bounded: the model is locating and transcribing information that's actually present in the image, not reasoning about ambiguous visual content. Combined with structured output (a JSON schema the extraction has to conform to), this replaces a lot of what used to require dedicated OCR-plus-template-matching pipelines, and handles document layout variation that brittle template systems choke on.

```python
response = client.messages.create(
    model="your-model-id",
    max_tokens=500,
    messages=[{
        "role": "user",
        "content": [
            {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": image_b64}},
            {"type": "text", "text": "Extract vendor name, invoice date, and total amount as JSON."},
        ],
    }],
)
```

UI and screenshot understanding â€” reading error states, describing what's on screen for accessibility or support triage â€” is another solid use case, because it's grounded in exactly what's visible, not open-ended visual reasoning.

## Where it's still shaky

Precise spatial reasoning â€” exact counting, precise measurements, fine-grained localization ("is this specific pixel region a defect") â€” remains unreliable across most current multimodal models. If your use case needs the model to count objects precisely or measure something with tight tolerance, don't rely on the multimodal model alone; use it for coarse classification and pair it with a purpose-built computer vision model for anything requiring precision.

Chart and graph reading is better than it used to be but still error-prone on dense or unusually formatted charts â€” verify outputs on anything where a misread number has real consequences (financial data, medical charts) rather than trusting extraction wholesale.

## Cost and latency are not the same as text-only calls

Images consume a meaningful number of tokens depending on resolution â€” a high-resolution image can cost more tokens than a fairly long paragraph of text, and this scales with how many images you're sending per request. For document-heavy workflows processing many pages, this adds up fast enough to be a real line item, not a rounding error.

| Consideration | Practical guidance |
|---|---|
| Image resolution | Downscale to the minimum resolution the task needs before sending â€” most extraction tasks don't need full resolution |
| Multi-page documents | Consider splitting and processing pages separately with cheaper routing for pages unlikely to contain the target data |
| Video/audio | Check whether your provider processes these natively or requires pre-extraction to frames/transcripts â€” costs and latency differ significantly |

## Design the product around graceful degradation

Multimodal extraction should never be a silent, trust-the-output pipeline for anything consequential. Surface confidence where the model can express it, validate extracted structured data against sane ranges the same way you would for text-based structured output, and give users an easy correction path for extracted fields rather than assuming perfect accuracy. Products that succeed with multimodal features tend to treat the model as a fast first-pass assistant that a human or a downstream validator checks, not as the final authority â€” the same pattern that works for text-based LLM features generalizes here, the failure modes are just visual instead of textual.
