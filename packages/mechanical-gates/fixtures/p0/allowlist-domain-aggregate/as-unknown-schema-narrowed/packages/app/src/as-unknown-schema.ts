declare const input: string;
const PayloadSchema = { parse(value: unknown): unknown { return value; } };
export const parsed = PayloadSchema.parse(input as unknown);
