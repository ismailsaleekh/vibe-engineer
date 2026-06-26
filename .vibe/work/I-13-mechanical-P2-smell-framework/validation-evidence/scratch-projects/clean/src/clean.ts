
export interface Result { readonly ok: boolean; readonly value?: string; readonly error?: string; }

export function typedRecovery(read: () => string): Result {
  try {
    return { ok: true, value: read() };
  } catch (error) {
    console.error(error);
    return { ok: false, error: "read-failed" };
  }
}

export function strictSwitch(type: string): Result {
  switch (type) {
    case "known":
      return { ok: true, value: "handled" };
    default:
      return { ok: false, error: "unknown" };
  }
}

export function structuredJson(value: string): string {
  return JSON.stringify({ value });
}
