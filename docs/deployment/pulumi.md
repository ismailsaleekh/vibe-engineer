# Pulumi deployment model

Decision source: [`../decisions/DL-18B-pulumi-deployment-defaults.md`](../decisions/DL-18B-pulumi-deployment-defaults.md) (LOCKED).

## Why provider-agnostic

v1 deliberately ships **no** default cloud provider, region, or deployment
target. The scaffold in `infra/pulumi/` imports only the Pulumi SDK
(`@pulumi/pulumi`), instantiates no provider, and declares no resource. This
keeps `pulumi preview` a true no-op diff and guarantees the PR preview workflow
cannot mutate anything.

A project adopts a concrete provider by:

1. Adding the provider package (e.g. `@pulumi/aws`) through the dependency lane
   that owns `infra/pulumi/package.json`. (Per the I-20 ownership split, the
   manifest/lock is owned by the dependency lane; do not edit it ad hoc.)
2. Constructing the provider and resources in `infra/pulumi/index.ts`.

## Backend

- Default backend is **Pulumi Cloud**. Self-managed backends (`file://`, `s3://`,
  `azblob://`, `gs://`) are a future/explicit-override surface, not the default.
- Authenticate with `pulumi login` (Pulumi Cloud). In CI this is driven by the
  `PULUMI_ACCESS_TOKEN` environment/secret.

## Stacks

- Default environments are **`dev`** and **`prod`**, with `Pulumi.dev.yaml` and
  `Pulumi.prod.yaml`.
- There are **no per-PR preview environments** by default.

## Preview (PR)

- `infra-preview.yml` runs `pulumi preview --diff` only.
- It is **non-mutating**: no `pulumi up` / `refresh` / `destroy`.
- Least permissions (`contents: read`); no `pull_request_target`.
- Actions pinned to immutable commit SHAs.

## Deploy

- `deploy.yml` is **`workflow_dispatch`-only** with a `stack` input
  (`dev`/`prod`).
- The deploy job binds `environment: $&#123;&#123; inputs.stack &#125;&#125;`, enforcing **protected
  GitHub Environment approval** before `pulumi up`.
- **No auto-deploy** from PR / push / merge / tag / schedule.

## Destroy

- There is **no `pulumi destroy` step by default**.
- Any destructive break-glass flow is a separate, future, explicitly-owned
  protected flow requiring manual approval. It is absent from v1 scaffolding.

## Static validation

`scripts/ci/pulumi/validate-pulumi-scaffold.mjs` enforces the Pulumi-specific
invariants and workflow rules (N1–N9): provider-agnostic program, no committed
secrets, no unapproved backend, PR non-mutation, no auto-deploy, manual + protected
deploy, no unprotected destroy, least permissions, immutable action pinning. It
fails closed (non-zero) on any violation.

```sh
node scripts/ci/pulumi/validate-pulumi-scaffold.mjs \
  --infra infra/pulumi \
  --workflows .github/workflows/infra-preview.yml .github/workflows/deploy.yml
```

## Live validation boundary

The **live** Pulumi preview / protected-deploy proof (actual Pulumi Cloud
preview/diff, actual protected-environment approval, actual `pulumi up`) belongs
to the real-boundary validation lane. Deterministic/static witnesses
(typecheck, structural validator, workflow parse) prove scaffold conformance; they
do **not** substitute for the live seam.
