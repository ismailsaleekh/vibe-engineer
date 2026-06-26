# Security Policy

## Private vulnerability reporting

Please report suspected vulnerabilities through a private channel. Do not include exploit details, secrets, bypass steps, or sensitive vulnerability information in public issues, public pull requests, public discussions, or public chat.

Current placeholder: `[PRIVATE VULNERABILITY REPORTING CHANNEL TBD]`.

Public release, package publication, and external contributor solicitation are blocked until a real private vulnerability reporting channel is available. The preferred future channel is GitHub private vulnerability reporting or security advisories for the repository. If that is unavailable, maintainers must provide an equivalent private contact path before release.

## Public hardening issues

Public issues and pull requests are appropriate for non-sensitive hardening work, documentation corrections, security-tooling improvements, and general safety proposals that do not reveal exploitable details or private information.

If you are unsure whether a report is sensitive, use the private channel once it exists. Until the placeholder above is replaced by a real channel, release readiness remains blocked.

## Supported versions

This supported versions policy applies once public package or CLI versions exist. No public package or CLI version has been released yet.

Before `1.0.0`, security fixes are expected to target the latest released minor line unless maintainers explicitly document additional support. From `1.0.0` onward, security support targets the latest major release line unless maintainers document older supported versions.

Unsupported versions may receive best-effort guidance, but there is no silent backport promise.

## Disclosure and triage

Maintainers will acknowledge and triage private reports on a best-effort basis until a formal service-level agreement is explicitly decided. Reporters should avoid public disclosure until maintainers have had a reasonable opportunity to assess impact, coordinate a fix, and prepare release notes that do not expose users unnecessarily.

Security fixes should be recorded in [CHANGELOG.md](./CHANGELOG.md) under `Security` when safe to disclose.

## Scope

This policy covers the `vibe-engineer` harness repository. Technical security controls, secret scanning, unsafe-command policy, and build or release enforcement belong to later implementation lanes and must align with this private-reporting policy.
