#!/usr/bin/env python3
import hashlib
import json
import os
from pathlib import Path
import re
import sys

import yaml

ROOT = Path('/Users/lizavasilyeva/work/vibe-engineer')
WORK = ROOT / '.vibe/work/I-11S-contract-dependency-package-handoff'
OUT = WORK / 'validation-evidence/fresh-metadata-negative-regression.json'
TREE_HASH_OUT = WORK / 'validation-evidence/fresh-sibling-tree-hashes.txt'

expected_deps = {
    'zod': '3.25.76',
    '@ts-rest/core': '3.52.1',
    '@ts-rest/nest': '3.52.1',
    '@nestjs/common': '11.1.27',
    '@nestjs/core': '11.1.27',
    '@nestjs/platform-express': '11.1.27',
    'reflect-metadata': '0.2.2',
    'rxjs': '7.8.2',
}
expected_dev_deps = {
    '@types/node': '24.13.2',
    'vitest': '4.1.9',
    '@vitest/coverage-v8': '4.1.9',
}
all_expected = {**expected_deps, **expected_dev_deps}
rejected = ['@ts-rest/client', 'fast-check']
relevant_names = set(all_expected) | set(rejected) | {'@vibe-engineer/testing'}


def read_json(path: Path):
    with path.open('r', encoding='utf-8') as fh:
        return json.load(fh)


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def section(pkg, name):
    value = pkg.get(name, {})
    return value if isinstance(value, dict) else {}


def package_manifest_paths():
    paths = {ROOT / 'package.json'}
    for pattern in ['packages/*/package.json', 'packages/presets/*/package.json', 'packages/adapters/*/package.json']:
        paths.update(ROOT.glob(pattern))
    return sorted(paths, key=lambda p: p.relative_to(ROOT).as_posix())


def parse_after_hashes():
    p = WORK / 'snapshots/after/shared-surface-sha256.txt'
    result = {}
    for line in p.read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if not line:
            continue
        digest, rel = line.split(None, 1)
        result[rel] = digest
    return result


def parse_before_hashes():
    p = WORK / 'snapshots/before/shared-surface-sha256.txt'
    result = {}
    for line in p.read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if not line:
            continue
        digest, rel = line.split(None, 1)
        result[rel] = digest
    return result


def tree_hash(root_rel: str):
    root = ROOT / root_rel
    entries = []
    if not root.exists():
        return {'exists': False, 'fileCount': 0, 'aggregateSha256': None}
    for path in sorted(root.rglob('*')):
        rel = path.relative_to(ROOT).as_posix()
        if any(part in {'node_modules', 'dist', 'coverage', '.turbo'} for part in path.relative_to(ROOT).parts):
            continue
        if path.is_file():
            entries.append((rel, sha256_file(path)))
    aggregate = hashlib.sha256('\n'.join(f'{digest}  {rel}' for rel, digest in entries).encode('utf-8')).hexdigest()
    return {'exists': True, 'fileCount': len(entries), 'aggregateSha256': aggregate, 'entries': entries}


def lock_has_zod4(lock):
    package_keys = list((lock.get('packages') or {}).keys()) + list((lock.get('snapshots') or {}).keys())
    return [k for k in package_keys if k.startswith('zod@4') or k.startswith('/zod/4')]


def manifest_dep_refs(manifest_paths):
    refs = {}
    for path in manifest_paths:
        pkg = read_json(path)
        rel = path.relative_to(ROOT).as_posix()
        for section_name in ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']:
            for name, spec in section(pkg, section_name).items():
                if name in relevant_names or name.startswith('@ts-rest/') or name.startswith('@nestjs/') or name.startswith('@vitest/') or name == 'zod':
                    refs.setdefault(rel, {}).setdefault(section_name, {})[name] = spec
    return refs


def main():
    checks = {}
    details = {}
    failures = []

    contracts_path = ROOT / 'packages/contracts/package.json'
    contracts = read_json(contracts_path)
    checks['contracts_dependencies_exact'] = section(contracts, 'dependencies') == expected_deps
    checks['contracts_devDependencies_exact'] = section(contracts, 'devDependencies') == expected_dev_deps
    checks['contracts_has_no_testing_dependency'] = '@vibe-engineer/testing' not in section(contracts, 'dependencies') and '@vibe-engineer/testing' not in section(contracts, 'devDependencies')
    checks['contracts_no_exports_scripts_build_source_claim'] = not any(k in contracts for k in ['exports', 'scripts', 'main', 'module', 'types']) and not (ROOT / 'packages/contracts/src').exists()
    checks['contracts_exact_pin_format'] = all(re.fullmatch(r'\d+\.\d+\.\d+', v) for v in section(contracts, 'dependencies').values()) and all(re.fullmatch(r'\d+\.\d+\.\d+', v) for v in section(contracts, 'devDependencies').values())
    details['contracts_dependencies'] = section(contracts, 'dependencies')
    details['contracts_devDependencies'] = section(contracts, 'devDependencies')

    lock_text = (ROOT / 'pnpm-lock.yaml').read_text(encoding='utf-8')
    lock = yaml.safe_load(lock_text)
    importers = lock.get('importers') or {}
    contracts_importer = importers.get('packages/contracts') or {}
    importer_deps = contracts_importer.get('dependencies') or {}
    importer_dev_deps = contracts_importer.get('devDependencies') or {}

    for name, version in expected_deps.items():
        entry = importer_deps.get(name)
        checks[f'lock_importer_dependency_{name}_specifier_exact'] = bool(entry and str(entry.get('specifier')) == version)
        checks[f'lock_importer_dependency_{name}_version_resolves_expected'] = bool(entry and str(entry.get('version', '')).startswith(version))
    for name, version in expected_dev_deps.items():
        entry = importer_dev_deps.get(name)
        checks[f'lock_importer_devDependency_{name}_specifier_exact'] = bool(entry and str(entry.get('specifier')) == version)
        checks[f'lock_importer_devDependency_{name}_version_resolves_expected'] = bool(entry and str(entry.get('version', '')).startswith(version))

    package_keys = set((lock.get('packages') or {}).keys())
    snapshot_keys = set((lock.get('snapshots') or {}).keys())
    for name, version in all_expected.items():
        package_key = f'{name}@{version}'
        checks[f'lock_package_entry_{package_key}_present'] = package_key in package_keys
        checks[f'lock_snapshot_entry_{package_key}_present_or_peer_snapshot_present'] = package_key in snapshot_keys or any(k.startswith(package_key + '(') for k in snapshot_keys)

    manifest_paths = package_manifest_paths()
    manifest_refs = manifest_dep_refs(manifest_paths)
    details['workspace_manifest_paths'] = [p.relative_to(ROOT).as_posix() for p in manifest_paths]
    details['workspace_relevant_dependency_refs'] = manifest_refs
    outside_refs = {path: refs for path, refs in manifest_refs.items() if path != 'packages/contracts/package.json'}
    outside_i11s_refs = {}
    for path, refs in outside_refs.items():
        for sec, deps in refs.items():
            for name, spec in deps.items():
                if name in all_expected or name in rejected or name == '@vibe-engineer/testing' or name.startswith('@ts-rest/') or name.startswith('@nestjs/') or name.startswith('@vitest/') or name == 'zod':
                    # packages/testing/package.json name is not in dependency refs because only dependency sections are scanned.
                    outside_i11s_refs.setdefault(path, {}).setdefault(sec, {})[name] = spec
    checks['no_relevant_dependency_refs_outside_contracts_manifest'] = outside_i11s_refs == {}

    root = read_json(ROOT / 'package.json')
    root_sections = {sec: section(root, sec) for sec in ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']}
    root_i11s_refs = {sec: {k: v for k, v in deps.items() if k in all_expected or k in rejected or k == '@vibe-engineer/testing' or k.startswith('@ts-rest/') or k.startswith('@nestjs/') or k.startswith('@vitest/') or k == 'zod'} for sec, deps in root_sections.items()}
    root_i11s_refs = {sec: deps for sec, deps in root_i11s_refs.items() if deps}
    checks['root_manifest_has_no_i11s_dependency_additions'] = root_i11s_refs == {}
    root_importer = importers.get('.') or {}
    root_importer_text_refs = json.dumps(root_importer, sort_keys=True)
    checks['root_lock_importer_has_no_i11s_dependency_additions'] = not any(token in root_importer_text_refs for token in list(all_expected) + rejected + ['@vibe-engineer/testing', '@ts-rest/', '@nestjs/', '@vitest/', 'zod'])

    lock_lower = lock_text.lower()
    checks['no_ts_rest_client_in_lockfile'] = '@ts-rest/client' not in lock_text
    checks['no_ts_rest_client_in_workspace_manifests'] = '@ts-rest/client' not in json.dumps(manifest_refs, sort_keys=True)
    checks['no_fast_check_in_lockfile'] = 'fast-check' not in lock_text
    checks['no_fast_check_in_workspace_manifests'] = 'fast-check' not in json.dumps(manifest_refs, sort_keys=True)
    zod4_keys = lock_has_zod4(lock)
    checks['no_zod4_lock_package_or_snapshot'] = zod4_keys == []
    checks['no_zod4_manifest_spec'] = not any(name == 'zod' and str(spec).startswith('4') for refs in manifest_refs.values() for deps in refs.values() for name, spec in deps.items())
    checks['no_zod_at_4_text_token'] = 'zod@4' not in lock_lower and 'zod@4' not in json.dumps(manifest_refs, sort_keys=True).lower()

    impl_report_text = (WORK / 'I-11S-implementation-report.md').read_text(encoding='utf-8')
    allowed_runtime = 'pnpm --filter @vibe-engineer/contracts add zod@3.25.76 @ts-rest/core@3.52.1 @ts-rest/nest@3.52.1 @nestjs/common@11.1.27 @nestjs/core@11.1.27 @nestjs/platform-express@11.1.27 reflect-metadata@0.2.2 rxjs@7.8.2'
    allowed_dev = 'pnpm --filter @vibe-engineer/contracts add --save-dev @types/node@24.13.2 vitest@4.1.9 @vitest/coverage-v8@4.1.9'
    pnpm_add_lines = [line.strip(' `') for line in impl_report_text.splitlines() if 'pnpm --filter @vibe-engineer/contracts add' in line]
    details['implementation_report_pnpm_add_lines'] = pnpm_add_lines
    checks['implementation_report_records_allowed_runtime_command'] = any(allowed_runtime in line for line in pnpm_add_lines)
    checks['implementation_report_records_allowed_dev_command'] = any(allowed_dev in line for line in pnpm_add_lines)
    checks['implementation_report_records_no_testing_add_command'] = not any('add --save-dev @vibe-engineer/testing@workspace:*' in line or 'add @vibe-engineer/testing@workspace:*' in line for line in pnpm_add_lines)
    optional_log_paths = sorted((WORK / 'logs').glob('*testing*'))
    checks['no_optional_testing_pnpm_log_present'] = optional_log_paths == []

    after_hashes = parse_after_hashes()
    before_hashes = parse_before_hashes()
    current_hashes = {}
    mismatches = {}
    for rel, expected_hash in after_hashes.items():
        path = ROOT / rel
        digest = sha256_file(path)
        current_hashes[rel] = digest
        if digest != expected_hash:
            mismatches[rel] = {'expectedAfter': expected_hash, 'current': digest}
    checks['current_hashes_match_implementation_after_shared_surfaces'] = mismatches == {}
    changed_between_impl_snapshots = sorted(rel for rel in after_hashes if before_hashes.get(rel) != after_hashes.get(rel))
    checks['implementation_shared_surface_diff_limited_to_contracts_package_and_lockfile'] = changed_between_impl_snapshots == ['packages/contracts/package.json', 'pnpm-lock.yaml']
    details['current_shared_surface_hashes'] = current_hashes
    details['shared_surface_hash_mismatches_vs_after'] = mismatches
    details['changed_between_implementation_before_after_shared_surfaces'] = changed_between_impl_snapshots

    sibling_roots = [
        'packages/mechanical-gates',
        'packages/testing',
        'packages/verification',
        'packages/cli',
        'packages/artifacts',
        'packages/skills',
        'packages/registry',
        'packages/presets',
    ]
    tree_summaries = {}
    detailed_lines = []
    for rel in sibling_roots:
        summary = tree_hash(rel)
        entries = summary.pop('entries', []) if summary.get('exists') else []
        tree_summaries[rel] = summary
        detailed_lines.append(f'## {rel}')
        for file_rel, digest in entries:
            detailed_lines.append(f'{digest}  {file_rel}')
    TREE_HASH_OUT.write_text('\n'.join(detailed_lines) + '\n', encoding='utf-8')
    details['sibling_tree_summaries'] = tree_summaries

    checks['packages_core_absent'] = not (ROOT / 'packages/core').exists()
    checks['contracts_manifest_has_no_domain_specific_business_vocabulary'] = not re.search(r'\b(customer|invoice|payment|order|tenant|loan|cart|product)\b', (ROOT / 'packages/contracts/package.json').read_text(encoding='utf-8'), re.I)

    for key, value in checks.items():
        if value is not True:
            failures.append(key)

    result = {
        'status': 'PASS' if not failures else 'FAIL',
        'checks': checks,
        'failures': failures,
        'details': details,
        'evidence': {
            'json': OUT.relative_to(ROOT).as_posix(),
            'siblingTreeHashes': TREE_HASH_OUT.relative_to(ROOT).as_posix(),
        },
    }
    OUT.write_text(json.dumps(result, indent=2, sort_keys=True) + '\n', encoding='utf-8')
    print(json.dumps({'status': result['status'], 'failures': failures, 'evidence': result['evidence']}, indent=2, sort_keys=True))
    return 0 if not failures else 1


if __name__ == '__main__':
    sys.exit(main())
