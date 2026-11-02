# Servizi, Firebase e stato

## Ambito e responsabilità
- Si applica a `src/app/core/services`: autenticazione, dati, stato, gameplay, progressione ed economia.
- Fatti verificati: `AuthService` osserva Firebase Auth; `login-service.ts` integra il login Google Capacitor; `GameStateService` espone signals/computed e sceglie provider mock/remoto; `ProgressStoreService` governa le mutazioni del progresso. Firestore legge profilo, progresso, shop, eventi e documento `gameConfigs/public`; `RemoteConfigService` è un lettore Firestore con fallback `DEFAULT_REMOTE_CONFIG`, non usa Firebase Remote Config SDK. `firebase.json` è vuoto; `docs/firebase/firestore.rules.current.txt` è una copia locale non tracciata, non una configurazione di deploy versionata.

## Convenzioni e implementazione
- Conservare i percorsi Firestore e la forma dei modelli in `src/app/core/models/remote` e `auth`; per nuovi dati, aggiornare mapping/default e chiamanti insieme. Non usare il solo stato locale come prova di autorizzazione o saldo affidabile.
- Passare le modifiche di progresso attraverso `GameStateService`/`ProgressStoreService` e i servizi remoti esistenti; mantenere il comportamento mock/remoto, retry/cache e bootstrap. Per shop e premi preservare disponibilità temporale, valuta, limiti d'acquisto e operazioni coerenti; non inventare garanzie server che il client non implementa.
- Non loggare token, dati personali o documenti privati. Le route admin hanno `AdminGuard`, ma ogni nuova scrittura Firestore richiede anche verifica delle regole effettivamente distribuite nel progetto Firebase; la copia in `docs/firebase` non ne prova l'attivazione.

## Regressioni, controlli e completamento
- Evitare perdita o duplicazione di progressi su login, logout, refresh, offline e resume; evitare cache shop non invalidata e fallback remoto disabilitato.
- Eseguire `npm run typecheck` e gli spec interessati (ad esempio shop, puzzle, progressione); provare manualmente mock/remoto e autenticazione quando toccati. Per mutazioni dati reali, verificare autorizzazione e atomicità sul backend prima del rilascio.
- Completato quando contratti di persistenza, fallback, identità e aggiornamenti dello stato coincidono fra servizi e UI, con limitazioni server esplicitate.
