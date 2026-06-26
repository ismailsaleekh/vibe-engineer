#!/usr/bin/env python3
import json
import pathlib
import re

repo = pathlib.Path.cwd()
owned_roots = [
    pathlib.Path('packages/schematics/src/builtins'),
    pathlib.Path('packages/schematics/templates'),
    pathlib.Path('packages/schematics/fixtures/builtins'),
]
expected_slugs = ['module', 'contract', 'adapter', 'test-fixture', 'context-file', 'standard-doc']
expected_ids = [f'builtin.{slug}' for slug in expected_slugs]
required_contract_fields = ['standardId', 'standardTitle', 'standardSummary', 'presetId', 'quickGateLabel', 'packageManager', 'typecheckCommand']
required_preset_kinds = ['typescript-config', 'eslint-policy', 'prettier-policy', 'workspace-config', 'turbo-config', 'package-manifest']
secret_patterns = [
    re.compile(r'(?i)(api[_-]?key|secret|token|password)\s*[:=]\s*[A-Za-z0-9_./+=-]{8,}'),
    re.compile(r'-----BEGIN [A-Z ]+PRIVATE KEY-----'),
]
forbidden_domain_terms = ['ecommerce', 'inventory', 'fashion', 'billz', 'telegram', 'instagram', 'checkout', 'customer', 'order']
unsafe_template_tokens = ['{{{', '{{&', '{{>']
unsafe_command_terms = ['curl ', 'wget ', 'http://', 'https://metadata', 'process.env', 'Date.now', 'new Date', 'Math.random', 'child_process', 'spawn(', 'exec(']

files = sorted(p for root in owned_roots if (repo/root).exists() for p in (repo/root).rglob('*') if p.is_file())
rel_files = [str(p.relative_to(repo)) for p in files]
js_mjs = [p for p in rel_files if pathlib.Path(p).suffix in {'.js', '.mjs'}]
production_js_mjs = [p for p in js_mjs if p.startswith('packages/schematics/src/') or p.startswith('packages/schematics/templates/')]

manifest_rows = []
manifest_failures = []
for slug in expected_slugs:
    manifest_path = repo / 'packages/schematics/templates' / slug / 'manifest.json'
    if not manifest_path.exists():
        manifest_failures.append({'slug': slug, 'failure': 'manifest_missing'})
        continue
    data = json.loads(manifest_path.read_text())
    dl08 = data['extensions']['dev.vibe-engineer.schematics.dl08']
    props = dl08['inputSchema']['properties']
    standard_ids = dl08.get('standardIds', [])
    row = {
        'slug': slug,
        'schematicId': data.get('schematicId'),
        'builtInId': dl08.get('builtInId'),
        'templateRoot': dl08.get('templateRoot'),
        'inputAdditionalProperties': dl08['inputSchema'].get('additionalProperties'),
        'requiredContractFieldsPresent': all(field in dl08['inputSchema'].get('required', []) and field in props for field in required_contract_fields),
        'standardIds': standard_ids,
        'duplicateStandardIds': sorted({x for x in standard_ids if standard_ids.count(x) > 1}),
        'standardPatterns': {field: props[field].get('pattern') for field in ['standardId', 'standardTitle', 'standardSummary'] if field in props},
        'presetPatterns': {field: props[field].get('pattern') for field in ['presetId', 'quickGateLabel', 'packageManager', 'typecheckCommand'] if field in props},
        'conflictBehavior': data.get('conflictBehavior'),
        'generatedPathPolicies': [item.get('conflictPolicy') for item in data.get('generatedPaths', [])],
        'dryRunWritesFiles': data.get('dryRunBehavior', {}).get('writesFiles'),
        'securitySafety': dl08.get('securitySafety'),
        'requiredPresetKinds': dl08.get('typescriptPreset', {}).get('requiredFileKinds', []),
        'sourceRefs': [item.get('ref') for item in data.get('sourceRefs', [])],
        'operationTemplates': [op.get('template') for op in dl08.get('operations', []) if 'template' in op],
        'operationPathTemplates': [op.get('pathTemplate') for op in dl08.get('operations', [])],
        'forbiddenPathPatterns': dl08.get('forbiddenPathPatterns', []),
        'touchedPathPatterns': dl08.get('touchedPathPatterns', []),
    }
    manifest_rows.append(row)
    if row['schematicId'] != f'builtin.{slug}' or row['builtInId'] != row['schematicId']:
        manifest_failures.append({'slug': slug, 'failure': 'id_mismatch', 'row': row})
    if row['templateRoot'] != 'files':
        manifest_failures.append({'slug': slug, 'failure': 'bad_template_root'})
    if row['inputAdditionalProperties'] is not False or not row['requiredContractFieldsPresent']:
        manifest_failures.append({'slug': slug, 'failure': 'input_schema_not_strict'})
    if row['duplicateStandardIds']:
        manifest_failures.append({'slug': slug, 'failure': 'duplicate_standard_ids', 'duplicates': row['duplicateStandardIds']})
    if row['conflictBehavior'] != 'fail' or any(policy != 'fail' for policy in row['generatedPathPolicies']):
        manifest_failures.append({'slug': slug, 'failure': 'conflict_policy_not_fail'})
    if row['dryRunWritesFiles'] is not False:
        manifest_failures.append({'slug': slug, 'failure': 'dry_run_writes_files'})
    safety = row['securitySafety'] or {}
    if safety.get('noNetwork') is not True or safety.get('noShell') is not True or safety.get('deterministicOnly') is not True:
        manifest_failures.append({'slug': slug, 'failure': 'security_safety_not_strict'})
    for kind in required_preset_kinds:
        if kind not in row['requiredPresetKinds']:
            manifest_failures.append({'slug': slug, 'failure': 'missing_preset_kind', 'kind': kind})

secret_hits = []
unsafe_template_hits = []
domain_hits = []
unsafe_command_hits = []
for rel in rel_files:
    path = repo / rel
    try:
        text = path.read_text(errors='ignore')
    except UnicodeDecodeError:
        continue
    for pat in secret_patterns:
        if pat.search(text):
            secret_hits.append({'path': rel, 'pattern': pat.pattern})
    # Ignore explicitly invalid negative fixtures and executable witness internals for production safety scans.
    negative_surface = '/invalid-templates/' in rel or '/inputs/invalid/' in rel
    witness_surface = rel.endswith('/run-builtins-witnesses.mjs')
    if rel.endswith('.mustache') and not negative_surface:
        for token in unsafe_template_tokens:
            if token in text:
                unsafe_template_hits.append({'path': rel, 'token': token})
    if not negative_surface and not witness_surface:
        lower = text.lower()
        for term in forbidden_domain_terms:
            if term in lower:
                domain_hits.append({'path': rel, 'term': term})
        for term in unsafe_command_terms:
            if term in text:
                unsafe_command_hits.append({'path': rel, 'term': term})

# Detect obvious copied upstream source modules/catalog implementations rather than allowed references/snapshots.
source_duplication_hits = []
for rel in rel_files:
    text = (repo / rel).read_text(errors='ignore')
    if 'STANDARD_DEFINITIONS' in text or 'STANDARDS_CATALOG' in text or 'TYPESCRIPT_COMPILER_STRICT_OPTIONS' in text:
        source_duplication_hits.append(rel)

result = {
    'ownedFileCount': len(rel_files),
    'ownedFiles': rel_files,
    'jsMjsFiles': js_mjs,
    'productionJsMjs': production_js_mjs,
    'expectedSlugs': expected_slugs,
    'manifestRows': manifest_rows,
    'manifestFailures': manifest_failures,
    'catalogIdsUnique': sorted([row['schematicId'] for row in manifest_rows]) == sorted(expected_ids),
    'secretPatternHits': secret_hits,
    'unsafeTemplateHits': unsafe_template_hits,
    'domainHitsOutsideNegativeFixtures': domain_hits,
    'unsafeCommandHitsOutsideNegativeFixtures': unsafe_command_hits,
    'sourceDuplicationHits': source_duplication_hits,
}
out = repo / '.vibe/work/I-07B-built-in-schematics-fixtures/post-fix-revalidation-evidence/inspection/static-sweep.json'
out.write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result))
if production_js_mjs or manifest_failures or secret_hits or unsafe_template_hits or domain_hits or unsafe_command_hits or source_duplication_hits or not result['catalogIdsUnique']:
    raise SystemExit(2)
