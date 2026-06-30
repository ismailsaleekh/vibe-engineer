# Deployment

This document describes how `vibe-engineer` is deployed. It is intentionally
**provider-agnostic** and **domain-neutral**: it describes the deployment _model_
and _controls_, not any specific cloud's resources.

Authoritative decision source: [`docs/decisions/DL-18B-pulumi-deployment-defaults.md`](../decisions/DL-18B-pulumi-deployment-defaults.md) (LOCKED).

## At a glance

| Aspect                      | Default (v1)                                                              |
| --------------------------- | ------------------------------------------------------------------------- |
| IaC engine                  | **Pulumi TypeScript**                                                     |
| State backend               | **Pulumi Cloud**                                                          |
| Cloud / provider / region   | **None** (provider-agnostic until a project chooses one)                  |
| Environments                | **`dev`** and **`prod`**                                                  |
| Per-PR preview environments | **None** by default                                                       |
| PR infrastructure check     | **preview / diff only, non-mutating**                                     |
| Deploy trigger              | **manual only** (`workflow_dispatch`)                                     |
| Deploy protection           | **protected GitHub Environment approval** (`dev`/`prod`)                  |
| Auto-deploy                 | **none** on PR / push / merge / tag / schedule                            |
| `pulumi destroy`            | **absent by default** (break-glass is a separate, future, protected flow) |

## Layout

```
infra/pulumi/                 Pulumi TypeScript program (provider-agnostic)
  Pulumi.yaml                 project definition
  Pulumi.dev.yaml             dev stack config (no secrets)
  Pulumi.prod.yaml            prod stack config (no secrets)
  index.ts                    program entry (no provider/resource by default)
  tsconfig.json               program typecheck config
.github/workflows/
  infra-preview.yml           PR preview/diff — NON-MUTATING
  deploy.yml                  workflow_dispatch + protected-environment deploy
scripts/ci/pulumi/
  validate-pulumi-scaffold.mjs  Pulumi-specific static validator (N1–N9)
```

## Workflows

- **`infra-preview.yml`** runs on PRs/pushes that touch `infra/pulumi/**`. It runs
  `pulumi preview --diff` only. It **cannot** deploy or mutate infrastructure
  (no `pulumi up` / `refresh` / `destroy`). It uploads the preview output as an
  artifact and writes a step summary.
- **`deploy.yml`** is **`workflow_dispatch`-only** with a `stack` input
  (`dev`/`prod`). Its job binds `environment: $&#123;&#123; inputs.stack &#125;&#125;`, so GitHub
  blocks the run until a reviewer approves the protected `dev`/`prod`
  environment. It runs `pulumi preview` then `pulumi up`. There is **no**
  `pulumi destroy` step.

## Secrets

- **No secrets are committed.** Stack config files contain only non-secret,
  provider-agnostic values.
- The Pulumi access token is stored as a **GitHub Environment secret**
  (`PULUMI_ACCESS_TOKEN`) on the `dev` and `prod` environments, so it is only
  exposed **after** environment approval.
- Any Pulumi config secret must be set with `pulumi config set --secret`
  (encrypted by the Pulumi Cloud secrets provider); it never appears as a
  plaintext value in `Pulumi.*.yaml`.

## Operator one-time setup

1. Create the protected GitHub Environments `dev` and `prod` with required
   reviewers.
2. Add the `PULUMI_ACCESS_TOKEN` secret to each environment.
3. `pulumi stack init dev` and `pulumi stack init prod` against the Pulumi Cloud
   project `vibe-engineer-infra`.

See [`pulumi.md`](./pulumi.md) for the detailed Pulumi model and adoption path.

## Local / CI parity

The same Pulumi CLI version (pinned to the SDK version in
`infra/pulumi/package.json`, currently `3.248.0`) and the same program are used
locally and in CI. There is no CI-only bespoke path.
