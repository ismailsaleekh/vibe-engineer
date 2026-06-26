export const unrelatedBefore = 1;

export function stableNested(input: number): number {
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
