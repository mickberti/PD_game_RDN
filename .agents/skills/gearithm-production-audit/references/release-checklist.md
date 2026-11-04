# Stable release controls

Statuses: `PASS`, `FAIL`, `WARNING`, `MANUAL`, `NOT_APPLICABLE`, `NOT_RUN`. Priorities: P0 blocks user data/security/release identity; P1 blocks a release candidate; P2 should be resolved or accepted before wider rollout; P3 maintenance. Record each control even when the check cannot run.

| ID | Area | Requirement / authoritative local evidence |
| --- | --- | --- |
| AND-01 | Android | Package, namespace, Firebase Android client and intended Play listing agree; `capacitor.config.ts`, `android/app/build.gradle`. |
| AND-02 | Android | versionCode/versionName and target/min/compile SDK are release-appropriate; `android/variables.gradle`, `android/app/build.gradle`. |
| AND-03 | Android | Production web build, Capacitor sync and native bundle use same revision; `angular.json`, `www`, Android outputs. |
| AND-04 | Android | Signed AAB, Play App Signing and merged release manifest/permissions are verified. |
| AND-05 | Android | Installed Android devices pass login, back, resume, touch, audio and WebGL recovery. |
| WEB-01 | Angular | Production build and app typecheck pass; `package.json`, `angular.json`. |
| WEB-02 | Angular | Lint and automated specs are executable and pass. |
| WEB-03 | Angular | Routes/guards and production debug/mock controls are reviewed; `src/app/app.routes.ts`, `src/app/pages/settings`. |
| GAM-01 | Gameplay | Adventure, Time Attack and Free flows pass on device; `src/app/core/game/phaser`, `src/app/pages/gameplay`. |
| GAM-02 | Gameplay | Active catalogue structure and generator check agree; `src/app/core/game/phaser/catalogues`, `src/assets/rnd/catalogues`. |
| GAM-03 | Gameplay | Replay/solution, GEM/LINK/AREA effects and mode defaults pass focused tests and smoke checks. |
| AST-01 | Assets | Atlas bounds, file dimensions and audio paths are valid; `src/assets`, audio manifest. |
| FB-01 | Firebase | Android registration, fingerprints and Google Sign-In work on Play-installed build. |
| FB-02 | Firebase | Deployed Firestore rules protect cross-user progress, admin writes and balances; `firebase.json` alone cannot prove this. |
| FB-03 | Firebase | Offline/reconnect and two-device progress reconciliation preserve newer progress. |
| FB-04 | Firebase | Public config and required documents exist with appropriate access; `gameConfigs/public`. |
| ECO-01 | Economy | Shop prices, currency, rewards and event grants cannot be forged or duplicated by a client. |
| ECO-02 | Economy | Real-money billing/ads declarations match actual integrations; rewarded-ad boundary alone does not prove ads. |
| SEC-01 | Security | No server secrets or sensitive auth data are exposed in tracked source or runtime logs. |
| SEC-02 | Privacy | Account deletion flow, backup behavior and privacy policy match shipped features. |
| PLAY-01 | Play | Target API and app identity meet current Play rules. |
| PLAY-02 | Play | Listing assets, descriptions, support contact, screenshots and privacy URL are approved in Console. |
| PLAY-03 | Play | Data Safety, app access, content rating, target audience and ads declarations are complete. |
| PLAY-04 | Play | Closed test/production access requirements, signing and track install are met for this account. |
| QLT-01 | Quality | Crash/ANR monitoring and rollout/rollback owner are defined. |
| QLT-02 | Quality | Release evidence, unresolved findings and final GO/NO-GO are recorded without claiming unrun tests. |
