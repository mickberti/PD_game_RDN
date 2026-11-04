---
name: gearithm-production-audit
description: Run a GEARITHM production readiness audit in FULL, QUICK or RELEASE mode before a release decision, using repeatable local checks and explicit manual gates.
---

# Production readiness audit

Input: `FULL`, `QUICK` or `RELEASE` (default `QUICK`), target version/package and, for RELEASE, intended Play track. Output: updated `docs/release/PRODUCTION_READINESS.md` and `RELEASE_ACTION_PLAN.md` for FULL/RELEASE, or a dated delta for QUICK. Use the stable controls in [release-checklist.md](references/release-checklist.md).

1. Read root and domain `AGENTS.md`, `docs/RELEASE_READINESS_GEARITHM.md` as historical context, then `docs/CODEX_PRODUCTION_AUDIT.md`. Record baseline `git status --short` and target commit. Do not overwrite user changes.
2. `QUICK`: rerun local Android, catalogue and asset scripts below; inspect changed files and relevant controls. `FULL`: also inspect build, typecheck, lint, tests, game modes, persistence/economy, security/privacy and all manual gates. `RELEASE`: use FULL and require current signed AAB, merged release manifest, installation from intended track and Console evidence. Missing external evidence is `MANUAL` or `NOT_RUN`, never `PASS`.
3. From repository root run the read-only scripts: `node .agents/skills/gearithm-android-release/scripts/audit-android.mjs`, `node .agents/skills/gearithm-rdn-validation/scripts/audit-catalogue.mjs`, `node .agents/skills/gearithm-assets-audit/scripts/audit-assets.mjs`. For FULL run `npm run build`, `npm run typecheck`, `npm run lint`, `npm test -- --watch=false --browsers=ChromeHeadless`, `npm run rdn:catalogue:check` where feasible. Record exit codes, date, errors and any generated output; `rdn:catalogue:check` may create temporary files. Use domain Skills for deeper diagnosis. No source or published catalogue mutations.
4. Verify time-sensitive Play rules against official current Google documentation. Inspect local identity, target SDK, actual dependency and code paths. Verify Firebase rules, IAM, Google Sign-In, signing and Play declarations only with authorized external evidence; a repository snapshot is insufficient. Never print credentials or personal data.
5. For each applicable control include ID, requirement, status, P0-P3 priority, evidence/file, verification, correction and owner or dependency. A `FAIL` needs a reproducible failure; `WARNING` is a supported risk; `MANUAL` needs console/device/human evidence; `NOT_RUN` names the unexecuted test. Mark `NOT_APPLICABLE` only with proof of feature absence. `GO` requires no open P0/P1 and all release gates verified; `NO-GO` follows any confirmed P0/P1 blocker; otherwise `INDETERMINATO`.
6. Compare `git status --short` with baseline; report generated files and leave real data untouched. Distinguish historical findings from current results. Stop after sufficient evidence; never upload, deploy, sign or commit as part of an audit.

Success: reproducible dated report, prioritized action plan, explicit decision, and a clean separation between local checks and external gates.
