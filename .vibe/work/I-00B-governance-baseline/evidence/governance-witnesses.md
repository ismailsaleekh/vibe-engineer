# I-00B Governance Witnesses

Working directory for commands: `/Users/lizavasilyeva/work/vibe-engineer`.

## Owned file presence

Command:

```sh
test -f README.md && test -f LICENSE && test -f CONTRIBUTING.md && test -f CODE_OF_CONDUCT.md && test -f SECURITY.md && test -f CHANGELOG.md && test -f docs/README.md && test -f docs/architecture/index.md
```

Output:

```txt
exit=0
```

## Required governance content markers

Command:

```sh
rg -n "MIT License|SPDX|MIT" LICENSE README.md
```

Output:

```txt
README.md:13:- [License](./LICENSE) — MIT, with copyright metadata still to be filled before public release.
LICENSE:1:SPDX-License-Identifier: MIT
LICENSE:3:MIT License
LICENSE:18:IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
exit=0
```

Command:

```sh
rg -n "DCO|Signed-off-by|maintainer" CONTRIBUTING.md
```

Output:

```txt
33:All external pull requests require maintainer review before merge. External contributors do not merge their own changes. Maintainers may request additional deterministic evidence, independent validation, or narrower ownership before approving a change.
35:Changes that affect contracts, schemas, CLI behavior, prompts, governance, security, releases, package metadata, or public APIs require explicit maintainer attention and recorded evidence.
39:This project uses the Developer Certificate of Origin 1.1. All external pull-request commits must include a DCO sign-off using a `Signed-off-by:` commit trailer, for example:
42:Signed-off-by: Your Name <you@example.com>
45:By signing off, you certify that you have the right to submit the contribution under this project's MIT license terms. A future repository bot or maintainer check may enforce this mechanically; until then, maintainers must reject unsigned external commits or require correction before merge.
51:No contributor or maintainer should be the sole validator of their own significant change. Independent review is part of the quality bar.
exit=0
```

Command:

```sh
rg -n "Contributor Covenant|2\.1|Enforcement" CODE_OF_CONDUCT.md
```

Output:

```txt
3:This code of conduct is adapted from the Contributor Covenant Code of Conduct, version 2.1.
41:## Enforcement responsibilities
47:## Enforcement Guidelines
77:This Code of Conduct is adapted from the Contributor Covenant, version 2.1, available at https://www.contributor-covenant.org/version/2/1/code_of_conduct.html.
exit=0
```

Command:

```sh
rg -n "private|vulnerability|supported versions|public release" SECURITY.md
```

Output:

```txt
3:## Private vulnerability reporting
5:Please report suspected vulnerabilities through a private channel. Do not include exploit details, secrets, bypass steps, or sensitive vulnerability information in public issues, public pull requests, public discussions, or public chat.
9:Public release, package publication, and external contributor solicitation are blocked until a real private vulnerability reporting channel is available. The preferred future channel is GitHub private vulnerability reporting or security advisories for the repository. If that is unavailable, maintainers must provide an equivalent private contact path before release.
13:Public issues and pull requests are appropriate for non-sensitive hardening work, documentation corrections, security-tooling improvements, and general safety proposals that do not reveal exploitable details or private information.
15:If you are unsure whether a report is sensitive, use the private channel once it exists. Until the placeholder above is replaced by a real channel, release readiness remains blocked.
19:This supported versions policy applies once public package or CLI versions exist. No public package or CLI version has been released yet.
21:Before `1.0.0`, security fixes are expected to target the latest released minor line unless maintainers explicitly document additional support. From `1.0.0` onward, security support targets the latest major release line unless maintainers document older supported versions.
23:Unsupported versions may receive best-effort guidance, but there is no silent backport promise.
27:Maintainers will acknowledge and triage private reports on a best-effort basis until a formal service-level agreement is explicitly decided. Reporters should avoid public disclosure until maintainers have had a reasonable opportunity to assess impact, coordinate a fix, and prepare release notes that do not expose users unnecessarily.
33:This policy covers the `vibe-engineer` harness repository. Technical security controls, secret scanning, unsafe-command policy, and build or release enforcement belong to later implementation lanes and must align with this private-reporting policy.
exit=0
```

Command:

```sh
rg -n "Unreleased|Added|Changed|Deprecated|Removed|Fixed|Security|SemVer" CHANGELOG.md
```

Output:

```txt
5:The format follows Keep a Changelog, and this project uses Semantic Versioning (SemVer) for packages, CLI behavior, documented public APIs, artifact schemas, presets, plugins, adapters, schematics, and generated starter template releases once those surfaces exist.
7:## [Unreleased]
9:### Added
15:- Security policy requiring private vulnerability reporting and blocking public release until a real private channel exists.
18:### Changed
22:### Deprecated
26:### Removed
30:### Fixed
34:### Security
40:Future release sections must use SemVer headings in this shape:
46:Prerelease versions must use SemVer prerelease identifiers and record migration or compatibility notes when public behavior changes.
exit=0
```

## Domain-neutrality and unsafe-public-vulnerability reporting sweep

Command:

```sh
rg -n -i "ecommerce|inventory|fashion|Billz|Telegram|Instagram|CheckoutFlow|ShoppingCart|CustomerOrder|ProductCatalog" README.md CONTRIBUTING.md CODE_OF_CONDUCT.md SECURITY.md CHANGELOG.md docs/README.md docs/architecture/index.md || true
```

Output:

```txt
domain_sweep_exit=0
```

Command:

```sh
rg -n -i "report vulnerabilities publicly|post exploit publicly|open a public issue with exploit" SECURITY.md && exit 1 || true
```

Output:

```txt
unsafe_public_vuln_sweep_exit=0
```

## Product path non-touch sentinel

Command:

```sh
find packages apps .github scripts examples -maxdepth 0 -print 2>/dev/null
```

Output:

```txt
exit=1
```

Interpretation: no output; all sentinel paths are absent in this target repo state.

## Deterministic relative-link real-boundary witness

Command:

```sh
python3 - <<'PY'
from pathlib import Path
import re, sys, urllib.parse
files = [
    Path('README.md'),
    Path('CONTRIBUTING.md'),
    Path('CODE_OF_CONDUCT.md'),
    Path('SECURITY.md'),
    Path('CHANGELOG.md'),
    Path('docs/README.md'),
    Path('docs/architecture/index.md'),
]
link_re = re.compile(r'(?<!!)\[[^\]]+\]\(([^)]+)\)')
errors = []
checked = 0
for file in files:
    text = file.read_text(encoding='utf-8')
    for raw in link_re.findall(text):
        target = raw.strip().split()[0]
        if not target or target.startswith('#'):
            continue
        parsed = urllib.parse.urlparse(target)
        if parsed.scheme in {'http', 'https', 'mailto'}:
            continue
        if parsed.scheme or target.startswith('//'):
            errors.append(f'{file}: unsupported link scheme: {raw}')
            continue
        path_part = target.split('#', 1)[0]
        if not path_part:
            continue
        checked += 1
        resolved = (file.parent / urllib.parse.unquote(path_part)).resolve()
        root = Path.cwd().resolve()
        try:
            resolved.relative_to(root)
        except ValueError:
            errors.append(f'{file}: link escapes repo: {raw}')
            continue
        if not resolved.exists():
            errors.append(f'{file}: missing link target: {raw} -> {resolved.relative_to(root)}')
if errors:
    print('LINK CHECK FAILED')
    for err in errors:
        print(err)
    sys.exit(1)
print(f'LINK CHECK PASSED: files={len(files)} relative_links_checked={checked}')
PY
```

Output:

```txt
LINK CHECK PASSED: files=7 relative_links_checked=25
exit=0
```

Real-boundary interpretation: the actual on-disk I-00B Markdown files were read by a deterministic consumer; all relative links resolve to actual files inside the repo.
