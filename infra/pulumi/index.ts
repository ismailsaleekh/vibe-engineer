// Provider-agnostic Pulumi scaffold program for vibe-engineer.
//
// v1 invariants (DL-18B / locked-decisions §10 / verification-layer §5.15):
//   - Imports ONLY the Pulumi SDK (`@pulumi/pulumi`); NO provider package.
//   - Instantiates NO provider and NO cloud resource.
//   - Declares NO default cloud / provider / region / deployment target.
//
// This file is the seam a project edits when it adopts a concrete provider. Until
// then it stays empty of resources on purpose so `pulumi preview` is a true
// no-op diff and the PR preview workflow cannot mutate anything.
//
// A provider is adopted by: (1) adding the provider package via the dependency
// lane (I-20S owns infra/pulumi/package.json), then (2) constructing it here.

import * as pulumi from "@pulumi/pulumi";

// Stack metadata outputs that require no provider. These give consumers (and the
// preview/deploy workflows) stable, provider-independent stack identification
// without instantiating any cloud resource.
const projectName = pulumi.getProject();
const stackName = pulumi.getStack();

// A project-neutral config namespace (NOT a cloud provider config). Kept empty by
// default; the provider-agnostic validator confirms this introduces no provider.
const scaffoldConfig = new pulumi.Config("vibe-engineer");

export const project = projectName;
export const stack = stackName;
// Provider-agnostic marker so stack outputs are non-empty without any resource.
export const providerAgnostic = scaffoldConfig.getBoolean("provider-agnostic") ?? true;
