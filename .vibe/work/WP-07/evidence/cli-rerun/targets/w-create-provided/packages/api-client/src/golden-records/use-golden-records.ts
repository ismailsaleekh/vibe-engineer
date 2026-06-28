// @sample @demo @reference — golden-records module (DL-16 / DL-20A).
import type { GoldenRecord } from "@vibe-engineer-starter/domain";
import { goldenRecordsClient } from "./golden-records.client.js";

// Generic consumer hook shape consumed by web and mobile. The exact React/RN
// binding is owned by I-16/I-17; the starter reference keeps it framework-neutral
// so both apps import the same client surface (DL-16 import rules).
export function useGoldenRecords(): readonly GoldenRecord[] {
  void goldenRecordsClient;
  return [];
}
