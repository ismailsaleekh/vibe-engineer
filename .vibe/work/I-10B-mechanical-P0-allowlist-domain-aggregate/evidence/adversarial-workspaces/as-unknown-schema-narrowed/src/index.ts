declare const input: string;
const parsed = PayloadSchema.parse(input as unknown);
const PayloadSchema = { parse(value: unknown): unknown { return value; } };
