export const I14B_PI_RUNTIME_EXTENSION_POLICY = {
  defaultDeny: true,
  requiresCredentialsByDefault: false,
  permitsDestructiveOperationsByDefault: false,
  permitsExternalMutationByDefault: false,
  claimsSandboxing: "not_provided",
  runtimeExecutionClaim: "pending-live",
  trustBoundary:
    "Project-local TypeScript extension executes only after pi project trust; no sandbox isolation is claimed.",
} as const;

export default function i14bPiRuntimePolicyExtension(): void {
  // Default-deny fixture: registers no tools, executes no commands, needs no credentials,
  // performs no network or filesystem mutation, and makes no live runtime proof claim.
}
