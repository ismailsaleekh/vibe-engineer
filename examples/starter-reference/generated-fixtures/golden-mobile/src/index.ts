// @sample @demo @reference — golden-mobile barrel (I-17B / DL-12 / DL-16 / DL-20A).
//
// Exports the DL-12 runner-selection + conflict validator, the no-fork RN
// consumption seam + testID surface, and the real-boundary witness entry point.
// Generated Maestro/Detox flow artifacts live under `e2e/` and metadata under
// `metadata/` (referenced by the validator at runtime).

export { validateSelectionMetadata, type SelectionValidationError, type SelectionValidationResult } from "./validate/selection-metadata.js";
export {
  GOLDEN_RECORDS_TEST_IDS,
  runGoldenRecordsRnConsumptionSeam
} from "./consumption/golden-records.rn-consumption.js";
