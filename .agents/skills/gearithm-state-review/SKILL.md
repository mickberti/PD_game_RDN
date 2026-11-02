---
name: gearithm-state-review
description: Review or change GEARITHM Angular/Ionic state, Firebase authentication, Firestore progress, shop, economy and event flows when those contracts are affected.
---

# State and economy review

Input: changed page/service, user flow and persistence path. Output: data-flow map, concrete risk findings and focused verification.

1. Read `src/app/AGENTS.md` and `src/app/core/services/AGENTS.md`. Trace UI -> `GameStateService`/`ProgressStoreService` -> provider -> remote service/model for the touched data. Signals/computed and RxJS coexist; follow the existing flow rather than migrating it wholesale.
2. For auth, check browser/Capacitor Google paths, bootstrap completion, logout, guards and development-only tools. For progress, examine UID isolation, fallback, debounce/retry and offline/online reconciliation. For economy, trace `PricingService`, shop availability, purchase limits, rewards, inventory and event activation with `TimeService`.
3. `RemoteConfigService` reads Firestore `gameConfigs/public`, not Firebase Remote Config SDK. `firebase.json` is empty. `docs/firebase/firestore.rules.current.txt` is a local snapshot only; compare with deployed rules using an authorized source before claiming server enforcement.
4. Run `npm run typecheck` and relevant existing specs (`shop.service`, daily-login, progression, availability). Manually test login/restore and two-user isolation when authorization or remote writes change. Do not use production accounts or modify live Firestore merely to perform a review.

Success: no unexplained state divergence, lost/duplicated rewards or cross-user access; separate client findings from unverified server behavior.
