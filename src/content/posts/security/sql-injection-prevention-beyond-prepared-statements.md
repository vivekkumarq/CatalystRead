---
title: "SQL Injection Prevention Beyond Prepared Statements"
slug: "sql-injection-prevention-beyond-prepared-statements"
description: "Parameterized queries solve the classic SQL injection case, but ORMs, dynamic identifiers, and second-order injection still find ways through."
publishedAt: "2025-02-27"
updatedAt: "2026-09-16"
category: "Security"
tags:
  - Security
  - SQL Injection
  - Database
  - Web Security
---

Prepared statements have been the standard answer to SQL injection for long enough that most developers treat the problem as closed. It mostly is, for the textbook case: a query built with string concatenation and unescaped user input. But SQL injection still shows up in modern codebases, and it's almost always in the places that don't look like the textbook case — inside an ORM, in a dynamically built identifier, or in data that was safely parameterized once and then trusted forever after.

## The gap ORMs don't close by default

Object-relational mappers parameterize queries automatically when you use their query-building API as intended, which is why teams using an ORM often assume injection isn't something they need to think about anymore. Almost every ORM also ships an escape hatch for raw SQL, for the cases the query builder can't express — and that escape hatch offers zero protection on its own.

```javascript
// Parameterized by the ORM — safe
User.findAll({ where: { email: userInput } });

// Raw query interpolation — reintroduces the exact vulnerability
// the ORM exists to prevent
User.sequelize.query(`SELECT * FROM users WHERE email = '${userInput}'`);
```

The danger isn't that raw query methods exist — sometimes they're genuinely necessary for performance or for a query shape the builder can't produce. The danger is that they look identical in the code to every other ORM call, so a reviewer skimming a diff has no visual signal that this particular line needs injection scrutiny. Treat any raw query call as needing the same manual verification a hand-written SQL statement would.

## What parameterization doesn't cover

Prepared statements protect values — the things that go where a literal would go in the query. They don't protect identifiers: table names, column names, and `ORDER BY` targets, because a placeholder can't stand in for a column name in standard SQL. An application that lets users choose a sort column through a query parameter and passes it straight into an `ORDER BY` clause is vulnerable even with a fully parameterized query everywhere else.

```python
# Still injectable, even with parameterized values elsewhere
query = f"SELECT * FROM products ORDER BY {sort_column}"

# Safe: validate against an allowlist before use
ALLOWED_SORT_COLUMNS = {"price", "name", "created_at"}
if sort_column not in ALLOWED_SORT_COLUMNS:
    raise ValueError("invalid sort column")
```

The fix is always an allowlist, not sanitization — there's no reliable way to escape an identifier the way you'd escape a value, so the only safe pattern is validating the input against a known set of acceptable options before it ever reaches the query string.

## Second-order injection and stored data

The subtler case is data that was safely inserted with a parameterized query, sits in the database looking completely ordinary, and later gets pulled back out and used to build a different query without going through parameterization a second time. A username containing a single quote is stored safely; if a background job later builds a report query by concatenating that stored username into a new SQL string, the injection fires on the read path even though the write path did everything right.

This tends to happen in exactly the places teams don't think to check: admin tooling, internal reporting scripts, and data migration jobs, which are usually held to a lower security bar than user-facing endpoints because "it's internal." The rule that closes this gap is simple to state and easy to forget in practice: every query is parameterized based on where the data is going, not based on how trustworthy the data seemed when it arrived.

## A worked example

Prepared statements for values. Allowlist for `ORDER BY` columns. Identifiers never concatenated from users. Dynamic filters built as `AND col = ?` with bound values. A linter/semgrep rule for string-built SQL. Tests with `'` in names. Stored procedures that still concatenate inside are not a fix.

ORM `where` APIs instead of raw strings; raw only with bound params.

## Failure modes

`${id}` in template SQL. `escape` functions you wrote. LIKE `%${term}%` still needs binding (and watch `%`/`_`). Second-order injection from stored fields. GraphQL concatenating. Excel CSV formulas (different injection).

`int` cast as the only defense on a string column.

## When this is the wrong tool

Prepared statements are not XSS defense. If you need a user-defined query language, use a parser and a safe AST-to-SQL compiler, not string glue. NoSQL has its own injection (operators). An allowlist is the wrong tool if the list is `*` of every column including secrets. Do not "sanitize" SQL with regex. For analytics, a BI tool with its own permissions may beat ad-hoc SQL from the app.
