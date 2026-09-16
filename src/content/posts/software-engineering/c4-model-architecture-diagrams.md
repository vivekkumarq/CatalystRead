---
title: "The C4 Model: Four Zoom Levels Beats a 200-Box Visio"
slug: "c4-model-architecture-diagrams"
description: "Simon Brown's C4: Context, Container, Component, Code — what to draw for onboarding, and what to leave in the IDE."
publishedAt: "2026-09-03"
category: "Software Engineering"
tags:
  - Software Engineering
  - Architecture
  - Documentation
  - C4
sources:
  - title: "The C4 model for visualising software architecture"
    author: "Simon Brown"
    publisher: "c4model.com"
    url: "https://c4model.com/"
  - title: "Software Architecture for Developers"
    author: "Simon Brown"
    url: "https://softwarearchitecturefordevelopers.com/"
---

Architecture diagrams fail by mixing **zoom levels**: a box is a company, a JVM, and a class. **C4** (Simon Brown) fixes the zoom. **Level 1 Context**: your system and the people/systems around it. **Level 2 Container**: deployable/runnable units (SPA, API, database, queue). **Level 3 Component**: major modules inside one container. **Level 4 Code**: classes — usually skip this; the IDE is better.

## What a container is

Not Docker-only. A container is a **process or store** you deploy or operate: a Spring Boot app, a mobile client, Redis, S3. Lines are **relationships with protocol and purpose** ("HTTPS/JSON, places orders"), not just arrows. C4-PlantUML and Structurizr generate diagrams from a model so the diagram does not rot independently — still a risk if nobody updates the model.

```text
Person Customer → [Web App] → [Orders API] → [(PostgreSQL)]
                         ↘ [Stripe]
```

Context diagrams should be readable in five minutes on day one. If you need a legend for 30 colors, you drew components at context level.

## Notation hygiene

Stick to boxes and arrows; C4 is notation-light on purpose. UML component diagrams are optional at level 3. Sequence diagrams complement C4 for **runtime** stories; C4 is **static structure**. Don't put every Kafka topic on the context diagram.

Multiple systems in an org: each has a context diagram. An enterprise "all of IT" poster is not C4.

## Governance without bureaucracy

Store diagrams next to the code (`docs/c4`). Review them in ADRs when containers appear. A PR that adds a database should add a container box. That's enough process.

Read c4model.com's example diagrams. Then redraw your "architecture" slide as a context diagram and a container diagram only. If you cannot name the containers, you cannot operate them. The model is a zoom control. Use it to stop drawing classes on the all-hands slide.
