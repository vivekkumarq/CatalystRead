---
title: "Stop Hand-Rolling Formatters: The Intl APIs You're Underusing"
slug: "intl-apis-for-number-date-and-list-formatting"
description: "Intl.NumberFormat, RelativeTimeFormat, ListFormat, and Segmenter replace most hand-rolled formatting and i18n code — here's how to actually use them."
publishedAt: "2026-02-08"
category: "JavaScript"
tags:
  - Internationalization
  - JavaScript
  - Frontend Engineering
  - Formatting
---

Every codebase I've worked in has had at least one hand-rolled function for formatting currency, or a switch statement computing "2 days ago" from a timestamp, or a `join(", ")` call that produces "apples, bananas, cherries" instead of "apples, bananas, and cherries." All of this is built into the JavaScript runtime already, locale-aware and edge-case-tested, via the `Intl` namespace — and a surprising number of engineers have never used anything beyond `toLocaleDateString()`.

## Numbers, currency, and percentages

`Intl.NumberFormat` handles currency symbols, thousands separators, and locale-specific decimal conventions correctly, which is harder than it looks — some locales use a comma as the decimal separator and a period for thousands, the reverse of US conventions.

```javascript
const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});
usd.format(1234.5); // "$1,234.50"

const compact = new Intl.NumberFormat("en-US", {
  notation: "compact",
});
compact.format(1500000); // "1.5M"

const percent = new Intl.NumberFormat("en-US", { style: "percent" });
percent.format(0.437); // "44%"
```

The `notation: "compact"` option in particular replaces a common hand-rolled utility — the function that turns follower counts or large numbers into "1.5M" or "23K" — that gets reimplemented in nearly every dashboard codebase.

## Relative time without manual math

"3 days ago" or "in 5 minutes" is usually implemented as a pile of division and modulo against a timestamp difference, with a switch statement for pluralization. `Intl.RelativeTimeFormat` does this correctly, including pluralization rules that vary by language (not every language pluralizes the way English does).

```javascript
const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
rtf.format(-3, "day");  // "3 days ago"
rtf.format(1, "day");   // "tomorrow"
rtf.format(0, "hour");  // "this hour"
```

You still have to compute the numeric difference yourself — this API formats, it doesn't diff timestamps — but pairing it with a `Temporal.Duration` calculation removes essentially all the custom logic teams usually write for activity feeds and "last updated" labels.

## Lists and locale-aware sorting

`Intl.ListFormat` produces grammatically correct conjunctions and disjunctions, which matters more than it seems once you support more than one language.

```javascript
const lf = new Intl.ListFormat("en", { style: "long", type: "conjunction" });
lf.format(["apples", "bananas", "cherries"]);
// "apples, bananas, and cherries"

const lfOr = new Intl.ListFormat("en", { type: "disjunction" });
lfOr.format(["red", "green", "blue"]);
// "red, green, or blue"
```

For sorting, `Intl.Collator` fixes the classic bug where `.sort()` on strings uses code-point order, which puts uppercase letters before lowercase and mishandles accented characters — so "Zebra" sorts before "apple," and "café" doesn't sort next to "cafe" the way users expect.

```javascript
const names = ["café", "apple", "Zebra", "banana"];
names.sort(new Intl.Collator("en", { sensitivity: "base" }).compare);
// ["apple", "banana", "café", "Zebra"]
```

## Splitting text correctly with Segmenter

Counting "characters" in a string with `.length` breaks on emoji, combining characters, and many non-Latin scripts, because JavaScript strings are UTF-16 code units, not visual characters. `Intl.Segmenter` splits text into actual grapheme clusters, words, or sentences according to Unicode rules.

```javascript
const segmenter = new Intl.Segmenter("en", { granularity: "word" });
const words = [...segmenter.segment("The quick-brown fox jumps.")]
  .filter((s) => s.isWordLike)
  .map((s) => s.segment);
// ["The", "quick", "brown", "fox", "jumps"]
```

None of these require a dependency, a bundle size hit, or a translation file — they use the ICU data already shipped with the runtime. Before reaching for a formatting library, check whether `Intl` already does what you need; for the common cases, it usually does.
