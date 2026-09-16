---
title: "Helm Charts: Values, Templates, and the Gotchas That Bite in Production"
slug: "helm-charts-values-templates-and-gotchas"
description: "A practical look at how Helm's values and templating actually resolve, plus the recurring mistakes that turn a simple chart into a debugging session."
publishedAt: "2025-09-29"
updatedAt: "2026-09-16"
category: "DevOps"
tags:
  - Kubernetes
  - Helm
  - DevOps
  - Infrastructure
---

Helm gets pitched as "a package manager for Kubernetes," which undersells how much of it is really a templating engine with strong opinions about YAML merging. Most of the pain teams hit isn't with Helm's install/upgrade lifecycle — it's with values resolution and Go template syntax producing something subtly different from what was intended. Here's what actually trips people up.

## Values merge, they don't override wholesale

The most common surprise is that `values.yaml` overrides merge at the map level, not by replacing entire blocks. If your chart's default values define a `resources` block with both `requests` and `limits`, and your override only sets `limits.memory`, the default `requests` survives — but only because maps merge recursively. Lists do not merge; they replace entirely.

```yaml
# chart defaults (values.yaml)
resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 256Mi

# your override (prod-values.yaml)
resources:
  limits:
    memory: 512Mi
```

Result: `requests` is untouched, `limits.cpu` is untouched, only `limits.memory` changes. Now compare that to a list field like `env`:

```yaml
# override replaces the ENTIRE env list, not just one entry
env:
  - name: LOG_LEVEL
    value: debug
```

If the chart default had five environment variables defined, this override leaves you with exactly one. That's a frequent source of "why did my other env vars disappear" incidents after a values file change.

## Template functions run before Kubernetes ever sees YAML

Helm renders templates client-side into plain YAML before anything is sent to the API server, which means whitespace and indentation bugs in templates produce YAML errors that have nothing to do with Kubernetes semantics. The `nindent` and `indent` functions exist specifically because Go templates don't understand YAML structure — they're just string substitution.

```yaml
{{- if .Values.podAnnotations }}
metadata:
  annotations:
    {{- toYaml .Values.podAnnotations | nindent 4 }}
{{- end }}
```

Forgetting the `-` in `{{-` leaves stray blank lines and, depending on context, can shift indentation just enough to make the block invalid YAML or attach to the wrong parent key. Run `helm template . --debug` before every meaningful change — it's the fastest way to see exactly what will be applied, without touching a cluster.

## Subcharts and the values scoping trap

When a chart depends on subcharts, top-level values in the parent's `values.yaml` are not automatically visible to subchart templates. You have to nest them under the subchart's name:

```yaml
# parent values.yaml
postgresql:
  auth:
    database: myapp
  primary:
    persistence:
      size: 20Gi
```

Global values are the one exception — anything under a top-level `global:` key is passed down to every subchart, which makes `global` the right place for things like image pull secrets or a shared environment label, but a bad place for chart-specific configuration since every subchart receives it whether it uses it or not.

## Testing before you ship

`helm lint` catches structural problems, but it won't catch semantic mistakes like a mistyped values path that silently resolves to `nil` instead of erroring. Use `required` for values that must be set:

```yaml
image:
  repository: {{ required "image.repository is required" .Values.image.repository }}
```

Combine that with `helm template --values prod-values.yaml | kubectl apply --dry-run=server -f -` in CI, and most of the classic Helm surprises get caught before they reach a real cluster instead of during an incident.

## A worked example

A chart with `values.yaml` defaults, `values.prod.yaml` in the env repo. Templates use `required` for must-set values. `helm template` in CI diffs against a golden render. You pin chart version. `lookup` is avoided so CI can render.

A gotcha: `toYaml | nindent` whitespace breaking ConfigMaps.

## Failure modes

Logic-heavy templates (Turing-complete YAML). `latest` tags. Subcharts with conflicting CRDs. `helm upgrade --force` as a habit. Values that are entire files pasted. Random `nindent` bugs. Installing CRDs in hooks that never upgrade.

Two sources of values, neither documented.

## When this is the wrong tool

A single static manifest. Kustomize may be enough. Helm is the wrong tool to generate 500 slightly different charts by copy-paste — use a library chart or an operator. If you need real programming, an operator or cdk8s may be clearer. Do not use Helm as a Terraform replacement for cloud resources.
