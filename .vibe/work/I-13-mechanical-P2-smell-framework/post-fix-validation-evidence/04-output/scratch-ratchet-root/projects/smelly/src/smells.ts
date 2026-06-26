export function deeplyNested(input: number): number {
  if (input > 0) {
    for (let index = 0; index < input; index += 1) {
      while (index < input * 2) {
        try {
          if (index % 2 === 0) {
            switch (input) {
              case 1:
                return index;
              default:
                return input;
            }
          }
        } catch (error) {
          throw error;
        }
        break;
      }
    }
  }
  return 0;
}

export function manyDecisionPoints(value: number, flags: readonly boolean[]): number {
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

export function advisoryNested(input: number): number {
  if (input > 0) {
    for (let index = 0; index < input; index += 1) {
      while (index < input * 2) {
        if (index % 2 === 0) {
          return index;
        }
        break;
      }
    }
  }
  return 0;
}

export function catchAndContinue(read: () => string): string {
  let value = "";
  try {
    value = read();
  } catch (error) {
    console.error(error);
  }
  return value;
}

export function dispatchAction(action: string): { ok: boolean } {
  switch (action) {
    case "start":
      return { ok: true };
    case "stop":
      return { ok: true };
    default:
      return { ok: true };
  }
}

export function renderSerialized(value: string): string {
  return "{\"value\":\"" + value + "\"}";
}

export function renderSerializedTemplate(value: string): string {
  return `{"value":"${value}"}`;
}
