import { SUPPORTED_SCHEMA_VERSION } from './schema-registry.js';

const REFERENCES = Object.freeze({
  qualityBar: Object.freeze({
    label: 'Vibe Engineer HLO Quality Bar',
    path: '/Users/lizavasilyeva/work/harness-starter/.pi/hlo/vibe-engineer/prompts/quality-bar.md'
  }),
  dl01: Object.freeze({
    label: 'DL-01 repository and package structure',
    path: '/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-01-repo-package-structure.md'
  }),
  dl15: Object.freeze({
    label: 'DL-15 mechanical engine',
    path: '/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-15-mechanical-engine.md'
  }),
  dl20a: Object.freeze({
    label: 'DL-20A domain-neutrality foundation',
    path: '/Users/lizavasilyeva/work/vibe-engineer/docs/decisions/DL-20A-domain-neutrality-foundation.md'
  }),
  verification: Object.freeze({
    label: 'Verification layer specification',
    path: '/Users/lizavasilyeva/work/harness-starter/docs/verification-layer.md'
  })
});

export const STANDARD_DEFINITIONS = Object.freeze([
  Object.freeze({
    schemaVersion: SUPPORTED_SCHEMA_VERSION,
    standardId: 'typed-boundary-contracts',
    title: 'Typed boundary contracts',
    summary: 'External and generated carriers enter through named runtime contracts before any package consumes them.',
    rationale: 'Boundary validation keeps artifacts, schemas, config, commands, and adapters fail-closed instead of relying on prose or parser self-agreement.',
    category: 'contracts',
    level: 'required',
    neutrality: 'core',
    appliesTo: Object.freeze(['artifacts', 'commands', 'config', 'schemas', 'verification']),
    requirements: Object.freeze([
      Object.freeze({
        id: 'named-runtime-contract',
        statement: 'Every load-bearing carrier must have a named structural contract and a typed result surface.',
        verification: 'Run a positive fixture through the real producer and consumer, then run negative fixtures for missing fields, unknown fields, and unsupported versions.'
      }),
      Object.freeze({
        id: 'fail-closed-boundary',
        statement: 'Malformed input must return typed blocking errors and must not silently fall back to default acceptance.',
        verification: 'Assert invalid carriers produce stable error codes with JSON-pointer paths where available.'
      })
    ]),
    references: Object.freeze([REFERENCES.dl15, REFERENCES.verification]),
    tags: Object.freeze(['contracts', 'runtime-validation', 'fail-closed'])
  }),
  Object.freeze({
    schemaVersion: SUPPORTED_SCHEMA_VERSION,
    standardId: 'real-boundary-witnesses',
    title: 'Real boundary witnesses',
    summary: 'A seam is green only after the actual producer, carrier, and consumer run together.',
    rationale: 'Shape-only checks can hide broken joins; early real-boundary proof turns interface claims into executable evidence.',
    category: 'verification',
    level: 'required',
    neutrality: 'core',
    appliesTo: Object.freeze(['evidence', 'fixtures', 'packages', 'verification']),
    requirements: Object.freeze([
      Object.freeze({
        id: 'actual-consumer',
        statement: 'Each standard-bearing package must provide a lane-owned fixture that imports the real public API and consumes real output.',
        verification: 'Run the witness with Node and record command, exit code, stdout, stderr, and evidence artifact path.'
      }),
      Object.freeze({
        id: 'negative-boundary',
        statement: 'The same seam must reject invalid, missing, duplicate, and unsupported carriers with typed errors.',
        verification: 'Exercise negative fixtures against the same public API used by the positive witness.'
      })
    ]),
    references: Object.freeze([REFERENCES.qualityBar, REFERENCES.verification]),
    tags: Object.freeze(['real-boundary', 'evidence', 'verification'])
  }),
  Object.freeze({
    schemaVersion: SUPPORTED_SCHEMA_VERSION,
    standardId: 'domain-neutral-core',
    title: 'Domain-neutral core surfaces',
    summary: 'Core harness packages use generic engineering vocabulary and isolate extension or sample content from core defaults.',
    rationale: 'Reusable harness behavior must not encode a consuming workspace model, workflow, organization, or external service assumption.',
    category: 'domain-neutrality',
    level: 'required',
    neutrality: 'core',
    appliesTo: Object.freeze(['agents', 'docs', 'fixtures', 'packages', 'prompts', 'schematics', 'standards']),
    requirements: Object.freeze([
      Object.freeze({
        id: 'core-vocabulary',
        statement: 'Core text, identifiers, schema fields, and defaults must use generic package, module, contract, adapter, test, context, evidence, standard, and verification vocabulary.',
        verification: 'Run the actual domain-purity validator over governed core surfaces classified as core.'
      }),
      Object.freeze({
        id: 'sample-boundary',
        statement: 'Sample, demo, fixture, and negative surfaces must be explicitly classified and must not become core defaults.',
        verification: 'Run paired domain-purity fixtures proving core leakage fails while labeled sample or negative content remains isolated.'
      })
    ]),
    references: Object.freeze([REFERENCES.dl20a, REFERENCES.dl15]),
    tags: Object.freeze(['domain-neutrality', 'core', 'governed-surface'])
  }),
  Object.freeze({
    schemaVersion: SUPPORTED_SCHEMA_VERSION,
    standardId: 'dirty-tree-ownership',
    title: 'Dirty-tree ownership discipline',
    summary: 'Agents edit only owned paths, preserve unrelated work, and stop on concrete ownership conflict.',
    rationale: 'Multi-agent work requires exact path ownership so evidence stays attributable and parallel lanes do not overwrite each other.',
    category: 'orchestration',
    level: 'required',
    neutrality: 'core',
    appliesTo: Object.freeze(['agents', 'evidence', 'packages', 'prompts', 'verification']),
    requirements: Object.freeze([
      Object.freeze({
        id: 'owned-paths-only',
        statement: 'Write access is limited to explicit owned paths; read-only and untouchable paths remain unchanged.',
        verification: 'Record the changed-path list and compare it to the lane ownership list.'
      }),
      Object.freeze({
        id: 'no-destructive-git',
        statement: 'Agents must not request a clean tree and must not use destructive git state operations.',
        verification: 'Report command history and confirm no stash, reset, clean, checkout, or restore command was used.'
      })
    ]),
    references: Object.freeze([REFERENCES.qualityBar]),
    tags: Object.freeze(['ownership', 'dirty-tree', 'orchestration'])
  }),
  Object.freeze({
    schemaVersion: SUPPORTED_SCHEMA_VERSION,
    standardId: 'report-first-evidence',
    title: 'Report-first evidence',
    summary: 'Every implementation or validation lane creates its report before inspection or edits and updates it after each stage.',
    rationale: 'Crash-safe checkpointing lets future agents recover exact status, touched paths, commands, evidence, blockers, and next steps.',
    category: 'evidence',
    level: 'required',
    neutrality: 'core',
    appliesTo: Object.freeze(['agents', 'evidence', 'packages', 'verification']),
    requirements: Object.freeze([
      Object.freeze({
        id: 'first-artifact',
        statement: 'Create the lane report before reading target files or modifying package files.',
        verification: 'The report stage log records creation before subsequent inspection and product changes.'
      }),
      Object.freeze({
        id: 'command-evidence',
        statement: 'Every meaningful command records working directory, exit code, stdout or stderr summary, and evidence path when produced.',
        verification: 'Compare witness commands with evidence files under the lane work directory.'
      })
    ]),
    references: Object.freeze([REFERENCES.qualityBar, REFERENCES.verification]),
    tags: Object.freeze(['checkpointing', 'evidence', 'reports'])
  }),
  Object.freeze({
    schemaVersion: SUPPORTED_SCHEMA_VERSION,
    standardId: 'dependency-hygiene',
    title: 'Dependency hygiene',
    summary: 'Packages import only declared package dependencies, local owned modules, or allowed Node built-ins.',
    rationale: 'Undeclared imports and hidden package-manager mutations make private workspace packages non-repeatable and break package boundary proof.',
    category: 'package-boundaries',
    level: 'required',
    neutrality: 'core',
    appliesTo: Object.freeze(['packages', 'schemas', 'standards', 'verification']),
    requirements: Object.freeze([
      Object.freeze({
        id: 'declared-imports',
        statement: 'Runtime source must not rely on hoisted or phantom dependencies absent from the package manifest.',
        verification: 'Scan package source imports and confirm every external module is declared or is a Node built-in.'
      }),
      Object.freeze({
        id: 'no-package-manager-mutation',
        statement: 'A lane must stop rather than run install or add commands when a new dependency would be required.',
        verification: 'Confirm root manifests, lockfile, workspace files, and node_modules were not mutated by the lane.'
      })
    ]),
    references: Object.freeze([REFERENCES.dl01, REFERENCES.dl15]),
    tags: Object.freeze(['dependencies', 'package-boundaries', 'workspace'])
  }),
  Object.freeze({
    schemaVersion: SUPPORTED_SCHEMA_VERSION,
    standardId: 'deterministic-schematics',
    title: 'Deterministic schematic behavior',
    summary: 'Schematics use typed manifests, deterministic path planning, dry-run safety, and fail-closed conflict handling.',
    rationale: 'Generated structure must be predictable and inspectable before files are written so agents can build on reusable scaffolds safely.',
    category: 'schematics',
    level: 'recommended',
    neutrality: 'core',
    appliesTo: Object.freeze(['fixtures', 'schemas', 'schematics', 'verification']),
    requirements: Object.freeze([
      Object.freeze({
        id: 'typed-manifest',
        statement: 'A schematic declares its inputs, generated paths, conflict policy, and verification expectations in a strict manifest.',
        verification: 'Validate manifest fixtures and reject unknown fields, missing path policy, and unsupported versions.'
      }),
      Object.freeze({
        id: 'dry-run-first',
        statement: 'Dry-run mode reports planned changes without writing and apply mode refuses conflicting files.',
        verification: 'Run dry-run, apply, repeat-apply, and conflict fixtures at the real engine boundary.'
      })
    ]),
    references: Object.freeze([REFERENCES.verification]),
    tags: Object.freeze(['schematics', 'deterministic-generation', 'fixtures'])
  })
]);

export const STANDARD_IDS = Object.freeze(STANDARD_DEFINITIONS.map((standard) => standard.standardId));

export const STANDARDS_CATALOG = Object.freeze({
  schemaVersion: SUPPORTED_SCHEMA_VERSION,
  catalogId: 'vibe-engineer-core-standards',
  title: 'Vibe Engineer Core Standards Catalog',
  summary: 'Domain-neutral standards for harness implementation, verification, package boundaries, and evidence discipline.',
  neutrality: 'core',
  standardIds: STANDARD_IDS,
  standards: STANDARD_DEFINITIONS
});
