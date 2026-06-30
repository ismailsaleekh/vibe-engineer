export const CliClassification = Object.freeze({
  InvalidInvocation: "invalid_invocation",
  InvalidInput: "invalid_input",
  InvalidProject: "invalid_project",
  InvalidConfig: "invalid_config",
  MissingPrerequisite: "missing_prerequisite",
  UnsupportedOperation: "unsupported_operation",
  DeterministicFailure: "deterministic_failure",
  SafetyPolicyBlock: "safety_policy_block",
  OwnershipConflict: "ownership_conflict",
  WriteConflict: "write_conflict",
  ExternalUnavailable: "external_unavailable",
  InternalError: "internal_error",
  PartialIncomplete: "partial_incomplete",
});

export const CliErrorCode = Object.freeze({
  InvalidInvocation: "VE_INVALID_INVOCATION",
  InvalidFlag: "VE_INVALID_FLAG",
  MissingFlagValue: "VE_MISSING_FLAG_VALUE",
  UnsupportedOperation: "VE_UNSUPPORTED_OPERATION",
  DuplicateCommandId: "VE_DUPLICATE_COMMAND_ID",
  MalformedCommandMetadata: "VE_MALFORMED_COMMAND_METADATA",
  InvalidConfig: "VE_INVALID_CONFIG",
  MissingConfig: "VE_MISSING_CONFIG",
  ResultFileWriteFailed: "VE_RESULT_FILE_WRITE_FAILED",
  FoundationFailure: "VE_FOUNDATION_FAILURE",
  PartialIncomplete: "VE_PARTIAL_INCOMPLETE",
  InvalidEnvelope: "VE_INVALID_ENVELOPE",
  InternalError: "VE_INTERNAL_ERROR",
});

export const EXIT_CODES = Object.freeze({
  success: 0,
  deterministicFailure: 1,
  invalidInvocation: 2,
  invalidProjectOrConfig: 3,
  safetyPolicyBlock: 4,
  ownershipConflict: 5,
  externalUnavailable: 6,
  internalError: 7,
  partial: 8,
});

export function diagnostic({
  severity = "error",
  code,
  classification,
  message,
  path = null,
  span = null,
  hint = null,
}) {
  return { severity, code, classification, message, path, span, hint };
}

export function cliError({
  code,
  classification,
  retryable = false,
  blocking = true,
  message,
  details = {},
}) {
  return { code, classification, retryable, blocking, message, details };
}
