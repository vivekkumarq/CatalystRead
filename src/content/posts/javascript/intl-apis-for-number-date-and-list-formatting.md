---
title: "Stop Hand-Rolling Formatters: The Intl APIs You're Underusing"
slug: "intl-apis-for-number-date-and-list-formatting"
description: "Intl.NumberFormat, RelativeTimeFormat, ListFormat, and Segmenter replace most hand-rolled formatting and i18n code — here's how to actually use them."
publishedAt: "2026-02-08"
updatedAt: "2026-09-16"
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

## A worked example

`new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(1234.5)` vs concatenating `"€"`. `Intl.DateTimeFormat` with `timeZone: 'UTC'` for logs vs local for UI. `Intl.ListFormat` for "A, B, and C" with `type: 'conjunction'`. `Intl.RelativeTimeFormat` for "3 days ago" with a duration you computed.

You construct formatters once per locale (they are not free) and reuse.

## Failure modes

Relying on the runtime default locale on a server in `en-US` while users are in Japan. Hydration mismatches from server vs browser locale. Sorting with `localeCompare` without `{ sensitivity: 'base' }`. Polyfills missing on old engines. Currency without an ISO code. Parsing with `Date.parse` of localized strings.

Creating a formatter per table cell in a render loop.

## When this is the wrong tool

Protocol timestamps should be ISO-8601, not `toLocaleString`. Do not use Intl to serialize JSON. Binary size: if you polyfill full ICU on a tiny embedded WebView, a custom formatter may be smaller. `Intl.Segmenter` is the wrong tool if you only need `split(' ')`. For rounding money, use integer cents plus a formatter — Intl is display, not a ledger.

## A worked failure mode

Prices are formatted with `toLocaleString` without a locale or currency, so a US server renders `$` for a DE user or uses the wrong grouping. A list formatter is used for a legal enumeration that must use "and" in English and a different conjunction in another language without tests. Time zones default to the server. The failure is Intl without a locale policy. Pass `locale` and `currency` from the user profile, and snapshot tests per locale.

Hand-rolled formatters are the wrong default. Intl is the wrong tool only if you must match a pixel-perfect print standard it cannot. Do not format money as floats. Use Intl with explicit locales.

The wrong-tool test is easier with a concrete customer. If a user can lose money, lose access, or see someone else's data when "Stop Hand-Rolling Formatters: The Intl APIs You're Underusing" is slightly misapplied, do not let the pattern ride on defaults. Tighten the API, add an assertion in CI, and refuse silent fallbacks that look like success. Most production failures here are not exotic; they are a missing bound, a missing key, or a missing check that the original paper assumed a careful operator would have.
