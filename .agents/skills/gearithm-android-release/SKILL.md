---
name: gearithm-android-release
description: Audit or prepare a GEARITHM Android Capacitor build or release, checking package identity, Gradle versions and release evidence before publishing.
---

# Android release

Input: target build/release variant and intended package/version. Output: identity audit, build/test evidence and unresolved gates.

1. Read `android/AGENTS.md`, `capacitor.config.ts`, `android/app/build.gradle`, `android/variables.gradle` and `docs/RELEASE_READINESS_GEARITHM.md`.
2. Run `node .agents/skills/gearithm-android-release/scripts/audit-android.mjs` for read-only identity/version checks. A passing static audit does not validate Play Console, signing, Firebase fingerprints or an installed APK.
3. For an actual build, first run `npm run build`, then `npx cap sync android`, then the relevant Gradle debug/release task. These commands can modify generated outputs; inspect Git status and seek the task's authorization before external publishing or production changes.
4. Test login, restore, touch, back button, pause/resume, audio and WebGL recovery on the target device. Check release manifest permissions and store assets. Do not mark release complete without package decision, Firebase/Google Sign-In validation and signing evidence.

Success: package/version agree across local configs, build/install tests pass on target devices, and remaining external gates are recorded explicitly.
