
export function hardNested(input: number): number {
  if (input > 0) {
    for (let index = 0; index < input; index += 1) {
      while (index < input * 2) {
        try {
          if (index % 2 === 0) {
            return index;
          }
        } catch (error) {
          throw error;
        }
      }
    }
  }
  return 0;
}

export function advisoryDecisionPoints(value: number): number {
  let score = 0;
  if (value > 0) score += 1;
  if (value > 1) score += 1;
  if (value > 2) score += 1;
  if (value > 3) score += 1;
  if (value > 4) score += 1;
  if (value > 5) score += 1;
  if (value > 6) score += 1;
  return score;
}

export function ratchetedDecisionPoints(value: number): number {
  let score = 0;
  if (value > 0) score += 1;
  if (value > 1) score += 1;
  if (value > 2) score += 1;
  if (value > 3) score += 1;
  if (value > 4) score += 1;
  if (value > 5) score += 1;
  if (value > 6) score += 1;
  if (value > 7) score += 1;
  return score;
}

export function hardDecisionPoints(value: number, flags: readonly boolean[]): number {
  let score = 0;
  if (value > 0) score += 1;
  if (value > 1) score += 1;
  if (value > 2) score += 1;
  if (value > 3) score += 1;
  if (value > 4) score += 1;
  if (value > 5) score += 1;
  if (value > 6) score += 1;
  if (value > 7) score += 1;
  if (flags[0]) score += 1;
  if (flags[1]) score += 1;
  if (flags[2]) score += 1;
  if (flags[3]) score += 1;
  return score;
}

export function logAndContinue(read: () => string): string {
  let value = "";
  try {
    value = read();
  } catch (error) {
    console.error(error);
  }
  return value;
}

export function noOpSwitch(type: string): { ok: boolean } {
  switch (type) {
    case "known":
      return { ok: true };
    default:
      return { ok: true };
  }
}

export function noOpIfElse(action: string): readonly string[] {
  if (action === "known") {
    return ["handled"];
  } else {
    return [];
  }
}

export function jsonConcat(value: string): string {
  return '{"value":"' + value + '"}';
}

export function jsonTemplate(value: string): string {
  return `{"value":"${value}"}`;
}
