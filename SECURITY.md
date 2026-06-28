# Security Policy

## Private vulnerability reporting

Please report suspected vulnerabilities through GitHub private vulnerability reporting:

<https://github.com/ismailsaleekh/vibe-engineer/security/advisories/new>

Do not include exploit details, secrets, bypass steps, or sensitive vulnerability information in public issues, public pull requests, public discussions, or public chat. If GitHub private vulnerability reporting is unavailable for any reason, email the maintainer at <ismailsalikhodjaev@gmail.com> with a short non-sensitive subject and wait for a safe exchange path before sending sensitive details.

## Public hardening issues

Public issues and pull requests are appropriate for non-sensitive hardening work, documentation corrections, security-tooling improvements, and general safety proposals that do not reveal exploitable details or private information.

If you are unsure whether a report is sensitive, use the private vulnerability reporting path above.

## Supported versions

No public version has been released yet. Once `0.1.0` is published, security fixes are expected to target the latest released minor line unless maintainers explicitly document additional support. From `1.0.0` onward, security support targets the latest major release line unless maintainers document older supported versions.

Unsupported versions may receive best-effort guidance, but there is no silent backport promise.

## Disclosure and triage

Maintainers will acknowledge and triage private reports on a best-effort basis until a formal service-level agreement is explicitly decided. Reporters should avoid public disclosure until maintainers have had a reasonable opportunity to assess impact, coordinate a fix, and prepare release notes that do not expose users unnecessarily.

Security fixes should be recorded in [CHANGELOG.md](./CHANGELOG.md) under `Security` when safe to disclose.

## Scope

This policy covers the `vibe-engineer` harness repository and published `vibe-engineer` / `@vibe-engineer/*` packages. Technical security controls, secret scanning, unsafe-command policy, and build or release enforcement must align with this private-reporting policy.
