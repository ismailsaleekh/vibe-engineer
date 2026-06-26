export interface OperationResult {
  readonly ok: boolean;
  readonly value?: string;
  readonly error?: string;
}

export function simpleDecision(input: number): number {
  if (input <= 0) {
    return 0;
  }
  return input + 1;
}

export function recoverWithTypedFailure(read: () => string): OperationResult {
  try {
    return { ok: true, value: read() };
  } catch (error) {
    console.error(error);
    return { ok: false, error: "read-failed" };
  }
}

export function dispatchStrict(action: string): OperationResult {
  switch (action) {
    case "start":
      return { ok: true, value: "started" };
    case "stop":
      return { ok: true, value: "stopped" };
    default:
      return { ok: false, error: "unknown-action" };
  }
}

export function renderStructured(value: string): string {
  return JSON.stringify({ value });
}
