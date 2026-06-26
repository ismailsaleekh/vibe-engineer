export interface ExampleInput {
  readonly value: string;
}

export function formatExampleInput(input: ExampleInput): string {
  return input.value.toUpperCase();
}
