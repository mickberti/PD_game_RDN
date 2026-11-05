# Firebase: correzione progressiva delle regole (progetto, 5 novembre 2026)

Stato aggiornato al 5 novembre: la variante senza backend `firestore.rules` è stata **pubblicata** su `pd-game-rdn`/(default) dal CLI (exit 0) e il proprietario ha confermato dalla Console data aggiornata e testo coincidente; smoke Android ancora aperto. Le sezioni iniziali descrivono il precedente prototipo Stage 1, non distribuito. Il proprietario aveva trascritto le regole pubblicate il 13 agosto 2026; `docs/firebase/firestore.rules.current.txt` è lo snapshot usato nei test, non una lettura diretta della Console. Nessun dato Firestore è stato scritto dal comando di deploy.

## Contratto che le regole devono rispettare

| Percorso | Uso effettivo | Conseguenza di un blocco immediato |
| --- | --- | --- |
| `users/{uid}` | `PlayerService` crea `role: user`, aggiorna nickname/banner/immagine e completa `profileId`/`createdAt`; dal 5 novembre la pagina profilo mostra `role` in sola lettura | Il ruolo resta leggibile da `AdminGuard` ma non è inviato dal salvataggio del profilo. I client precedenti possono ancora inviarlo invariato |
| `users/{uid}/private/progress` | `ProgressService` salva/resetta l'intero snapshot; gameplay, shop, premi ed eventi mutano monete, inventario e claim sul client | Negare tutte le write blocca progressione e shop; permetterle non protegge i saldi |
| `users/{uid}/private/progress/purchases/*` | `ShopService` legacy legge; nessuna scrittura runtime trovata | La lettura owner va preservata finché il servizio è in uso; una write client non è giustificata dal codice trovato |
| `users/{uid}/purchases/*`, `sessions/*` | Nessun chiamante runtime trovato | Prima del deploy inventariare eventuali consumatori esterni e dati live |
| `meta/time` | `TimeService` scrive `{now: serverTimestamp()}` e poi legge | Negare ogni write provoca fallback all'orologio locale |

`RemoteGameDataProvider.loadShop()` restituisce `[]`: lo shop RDN attivo usa lo stato progress, non i record legacy. `ProgressStoreService` usa cache locale per UID, debounce e retry, ma il save remoto non confronta revisioni: la correzione economica va coordinata con il rischio di overwrite tra dispositivi.

## Prototipo verificato solo in Emulator

`docs/firebase/firestore.rules.stage1.emulator.txt` è caricato **solo** da `firebase.emulator.stage1.json` nel progetto fittizio `demo-gearithm-rules`. Non è referenziato da `firebase.json` di produzione. Le regole candidate:

1. richiedono `role: user` e i soli campi del profilo corrente alla creazione, con `createdAt` uguale al tempo server; rendono `role` immutabile per l'owner e consentono backfill di `profileId` vuoto o `createdAt` nullo, anche quando il payload reinvia un ruolo invariato;
2. basano l'accesso admin su un custom claim, non sul documento modificabile dall'utente;
3. tolgono la write client ai due percorsi di acquisto; preservano la read owner dove necessaria;
4. non concedono accesso client a `sessions/*`;
5. consentono la scrittura di `meta/time` soltanto con il singolo campo `now` uguale al tempo server della richiesta, preservando `TimeService.sync()`.

**Limiti:** la write owner sul progress resta intenzionalmente ampia; l'utente può ancora impostare saldi/claim arbitrari. Il bypass admin globale richiede prima un processo attendibile di assegnazione e revoca dei custom claim. Gli admin attuali basati solo su `users/{uid}.role` perderebbero i permessi Firestore se il prototipo fosse distribuito senza migrazione. Eventuali utenti già auto-promossi non sono corretti retroattivamente. `PlayerService.mapProfile()` restituisce `profileId: ''` quando il dato legacy è una stringa vuota: il suo backfill attuale reinvia `''` e non ripara quel valore; serve migrazione o correzione client verificata. Percorsi privati non trovati nell'app potrebbero dipendere da client o strumenti esterni. La scrittura `meta/time` resta disponibile a qualsiasi autenticato con payload valido e può generare traffico; il documento condiviso non è un orologio immutabile. Il prototipo non è quindi una release candidate delle regole.

Le regole sovrapposte concedono accesso se **almeno una** condizione è vera; per questo la candidata rimuove il match ricorsivo owner su `private/**` invece di aggiungere un deny specifico agli acquisti ([Firebase, struttura delle regole](https://firebase.google.com/docs/firestore/security/rules-structure)). La restrizione dei campi aggiornati usa `diff().affectedKeys()` ([Firebase, accesso ai campi](https://firebase.google.com/docs/firestore/security/rules-fields)). I custom claim vanno assegnati solo tramite ambiente privilegiato/Admin SDK e propagano con il nuovo token ([Firebase, custom claims](https://firebase.google.com/docs/auth/admin/custom-claims)).

## Evidenza riproducibile

Con Node 22, JDK 21, Firebase CLI 15.32.1 e Firestore Emulator 1.22.0:

```text
firebase emulators:exec --project demo-gearithm-rules --config firebase.emulator.json --only auth,firestore "node --test scripts/firestore-rules.emulator.test.mjs"
firebase emulators:exec --project demo-gearithm-rules --config firebase.emulator.stage1.json --only auth,firestore "node --test scripts/firestore-rules.emulator.test.mjs"
```

Esecuzione finale del 5 novembre: regole correnti **4 PASS / 11 FAIL su 15**; prototipo **14 PASS / 1 FAIL su 15**. Entrambi i comandi terminano con exit 1: il caso residuo del prototipo è la write arbitraria di monete nel progress. I test aggiunti coprono creazione diretta di profilo admin, campi aggiuntivi alla creazione, protezione di `createdAt`/`profileId` esistenti, aggiornamento del profilo con `role` invariato e sincronizzazione positiva via `serverTimestamp()`. Log completi in TEMP, dati solo negli Emulator locali. Mancano test di backfill per profili legacy con campi null/vuoti, claim admin legittimo, utente anonimo, transizioni economiche e flussi completi client; il backfill legacy va provato prima di qualsiasi deploy. **14/15 non equivale a PASS di sicurezza o autorizzazione al deploy.** Eseguire la suite sempre tramite `emulators:exec --config` esplicito: un `node --test` isolato controlla solo che le porte rispondano, non quale ruleset sia caricato.

## Sequenza necessaria prima del deploy

1. **Inventario e conservazione:** esportare con procedura controllata regole/versione live, elenco degli admin legittimi e stato dei dati economici; individuare client vecchi e consumatori di `sessions`/path privati. Non usare il documento `role` come prova di amministratore senza verifica esterna.
2. **Ruolo:** definire provisioning/revoca admin da ambiente privilegiato e migrare gli admin verificati ai custom claim. Allineare `AdminGuard` e UI del profilo; eliminare la modifica del ruolo dal form. Testare login/token refresh, admin legittimo e revoca prima della sostituzione del bypass.
3. **Economia:** scegliere un'autorità server per prezzo, saldo, ricompensa e inventario con operazioni atomiche e chiavi idempotenti. Separare i campi economici dai progressi client; definire schema/versione e migrazione dei saldi/claim esistenti. Una regola sui soli delta di `coins` non impedisce replay di premi. Nessuna Cloud Function è introdotta in questo intervento.
4. **Concorrenza:** definire revisione server e merge/conflitto per stelle, livelli, statistiche, inventario e valute; provare offline, retry, due dispositivi, crash e cambio UID. Conservare snapshot vecchio e nuovo per riconciliazione.
5. **Cutover coordinato, se si sceglierà un'autorità server:** predisporre client e autorità server, testare vecchia/nuova versione in staging, poi restringere le write al progress e distribuire regole solo con piano approvato. Richiedere PASS dei casi economici/admin pertinenti, smoke Android e verifica delle regole effettivamente distribuite.

Rollback: conservare versione delle regole e snapshot dati, ma non ripristinare una regola che riapra auto-promozione o scritture economiche arbitrarie. Prevedere un client/server compatibile di recupero e riconciliare le operazioni per ID; non riscrivere il catalogo v011 né i progressi senza una migrazione verificata.

## Scelta senza backend — 5 novembre 2026

Il proprietario conferma che le monete sono virtuali e che non è previsto un server applicativo. Per preservare il salvataggio attuale, la variante ora in `firestore.rules` mantiene la write owner su `private/progress` e usa il ruolo già presente in `users/{uid}` per gli admin, reso immutabile ai client normali. **Questo è un modello con economia affidata al client, non una soluzione anti-cheat.** Un utente che modifica le richieste può ancora cambiare il proprio saldo, inventario o flag di ricompensa. Non va pubblicizzato come saldo protetto o come PASS del controllo di integrità economica. Se le monete acquisiscono valore economico, influenzano classifiche competitive o premi tra utenti, rivalutare il modello prima del lancio di tali funzioni.

Suite Emulator sul progetto `demo-gearithm-rules`, con config `firebase.emulator.client-trusted.json`: **16 eseguiti, 15 PASS, 1 FAIL atteso, exit 1**. Il test positivo aggiunto conferma che l'owner salva e rilegge il progress; il test negativo rimasto dimostra che può assegnarsi `coins: 999999`. Il test resta nel repository e il risultato non è rinominato PASS. Il rischio è **accettato a livello di prodotto**, mentre il gate anti-manomissione resta FAIL tecnico. La decisione di pubblicare richiede ancora verifica di tutti gli altri gate.

Prima di qualsiasi deploy della variante: inventariare gli admin esistenti e verificare da fonte fidata che nessun `role: admin` sia stato autoassegnato sotto le regole precedenti; provare profilo UI, login/logout, offline/riconnessione su client e Android. Admin preesistente, nuovo utente, profilo legacy (`profileId: ''`, `createdAt: null`), salvataggio/reset progress e accessi base sono ora coperti da test Emulator. La UI di `profile.page.ts` e `PlayerService.updateProfile` non inviano più `role`; `mapProfile` corregge anche il fallback di `profileId` vuoto. Nessun deploy è stato effettuato.

## Preparazione alla pubblicazione — 5 novembre 2026

La variante senza backend è ora il file `firestore.rules`, referenziato da `firebase.json`; `firebase.emulator.client-trusted.json` carica **lo stesso file**. SHA-256 locale: `A4A73F75BD3A16B6FA153CE75C20F78982B6D256E279557626C15E19DF45C269`. La [checklist di deploy](FIRESTORE_RULES_DEPLOY_CHECKLIST.md) raccoglie prove e verifica post-pubblicazione. Il CLI autenticato ha visto `pd-game-rdn`; con le CA attendibili di Windows fornite a Node, dry-run e deploy delle sole regole Firestore sono **PASS, exit 0**. Alle 10:28 CET circa del 5 novembre, il CLI ha confermato compilazione, rilascio e `Deploy complete!`. Il proprietario aveva verificato dalla Console che il ruleset precedente coincideva con lo snapshot del 13/08/2026 e che tutti gli admin esistenti sono suoi; dopo il deploy ha confermato data aggiornata al 5 novembre e testo attivo coincidente con `firestore.rules`. È una verifica riferita dal proprietario, non una lettura diretta dell'agente. I flussi su dispositivo restano da verificare; nessun dato live è stato scritto dal comando di deploy.
