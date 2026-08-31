---
title: "Date/Time Handling With the Temporal API"
slug: "date-time-handling-with-the-temporal-api"
description: "Why the legacy Date object keeps causing bugs, what Temporal's PlainDate, ZonedDateTime, and Instant types fix, and how to plan a real migration."
publishedAt: "2026-01-11"
category: "JavaScript"
tags:
  - Temporal API
  - JavaScript
  - Date and Time
  - Node.js
---

`Date` has been broken in ways that matter for as long as JavaScript has existed, and everyone who's shipped a scheduling feature, a billing cycle, or anything touching multiple timezones has a war story. Months are zero-indexed. Parsing accepts wildly inconsistent formats depending on engine and locale. There's no built-in concept of a timezone-aware date that isn't tied to a specific instant. And `Date` objects are mutable, so passing one into a function that calls `.setMonth()` on it can silently corrupt state elsewhere in your program. Temporal isn't a convenience wrapper around these problems — it's a different model that eliminates most of them by construction.

## The core problem Temporal solves: conflating concepts

Legacy `Date` represents exactly one thing: a specific instant in time, stored internally as milliseconds since the Unix epoch, always implicitly tied to your system's local timezone for display purposes. But most real-world date/time needs aren't actually about a single instant — "this invoice is due on March 15" is a calendar date with no time component and no timezone at all, while "the meeting starts at 3pm Tokyo time" needs a timezone-aware wall-clock time. Cramming all of these into one `Date` type is why so much date-handling code accumulates timezone bugs: you're constantly converting between concepts that were never distinct types in the first place.

Temporal splits these into separate, purpose-built types.

```javascript
// A calendar date with no time or timezone — an invoice due date
const dueDate = Temporal.PlainDate.from("2026-03-15");

// A wall-clock date and time, still no timezone — "3pm on the 15th"
const localTime = Temporal.PlainDateTime.from("2026-03-15T15:00:00");

// A specific, unambiguous instant tied to a real timezone
const meeting = Temporal.ZonedDateTime.from(
  "2026-03-15T15:00:00[Asia/Tokyo]"
);

// A raw point on the timeline, no calendar or timezone attached
const now = Temporal.Now.instant();
```

Each type only exposes operations that make sense for it — you can't accidentally do timezone-dependent arithmetic on a `PlainDate`, because it has no timezone to be dependent on.

## Immutability removes a whole class of bugs

Every Temporal object is immutable. Arithmetic methods return new objects instead of mutating in place, which means passing a `Temporal.PlainDate` into a function is safe by default — nothing downstream can corrupt your original value.

```javascript
const start = Temporal.PlainDate.from("2026-01-11");
const later = start.add({ months: 1, days: 15 });

console.log(start.toString());  // "2026-01-11" — unchanged
console.log(later.toString());  // "2026-02-26"
```

Duration arithmetic is also explicit about calendar vs. exact time — adding "1 month" to January 31st correctly handles the ambiguity of shorter months instead of silently overflowing into a different month the way `setMonth` does with legacy `Date`.

## Where things stand for adoption

Temporal shipped in Firefox and is available in current Node LTS releases behind no flag as of recent versions; Safari and Chrome support have been landing incrementally, so as of early 2026 you should verify actual coverage against your target browser matrix rather than assuming universal support — it's close, but not yet safe to assume for browser-facing code without a check. For server-side Node code, adoption is generally safe today. If you need to ship to older browsers now, the `@js-temporal/polyfill` package implements the full proposal and is a reasonable bridge — use it with the plan to drop it once your minimum supported browser versions catch up, not as a permanent dependency.

For new code, model dates and times as what they actually are — a plain calendar date, a wall-clock time, or a precise instant — rather than defaulting to `Date` out of habit. It removes an entire category of "which timezone did I mean here" bugs before they can happen.
