import { ReferenceRequestBodySchema } from '../contracts/reference-flow.contract.js';
export function parserOnly(): boolean { return ReferenceRequestBodySchema.safeParse({ label: 'Alpha', sequence: 1, absence: { kind: 'not-provided', reason: 'parser' } }).success; }
