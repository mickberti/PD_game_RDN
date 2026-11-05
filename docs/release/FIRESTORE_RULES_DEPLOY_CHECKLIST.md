# Firestore Rules — checklist di pubblicazione

Data preparazione e pubblicazione: 5 novembre 2026. Progetto confermato dal proprietario: `pd-game-rdn`, database `(default)`. **Stato: pubblicata da CLI e confermata dal proprietario nella Console; smoke dispositivo ancora aperto.** Non usare `firebase deploy` generico: specificare sempre il target delle sole regole Firestore.

## Artefatto e prove locali

- File da pubblicare: `firestore.rules`; SHA-256 `A4A73F75BD3A16B6FA153CE75C20F78982B6D256E279557626C15E19DF45C269`. `firebase.json` punta a questo file. Nessun alias `.firebaserc`: specificare sempre `--project pd-game-rdn`.
- Snapshot delle regole precedenti comunicate dal proprietario: `docs/firebase/firestore.rules.current.txt`, SHA-256 `6D33ABB80EAB3D195EDD57A664D7BAE7E393398583C8C150CBAA00A29583FFBD`. Il 5 novembre il proprietario ha confermato dalla Console che il testo pubblicato è ancora identico allo snapshot (ultima pubblicazione 13/08/2026); non è una lettura diretta dell'agente.
- Emulator con file candidato esatto: **19 test eseguiti, 18 PASS, 1 FAIL anti-manomissione saldo accettato; exit 1**. Passano auto-promozione negata, isolamento utenti, admin preesistente, profilo legacy, reset/salvataggio progress, tempo e cataloghi. Un client modificato può ancora aumentare le proprie monete virtuali.
- `npm run typecheck`, `npm run lint`, `npm run build`: **PASS**. `npm run test:ci`: **92/93**, solo il test Free già fallito prima di questa modifica. Nessun test dispositivo o login live eseguito.
- La route admin usa `users/{uid}.role`; le nuove regole impediscono all'owner normale di crearsi o assegnarsi `admin`, ma **non revocano** gli admin già presenti. Il 5 novembre il proprietario ha confermato di aver verificato nella Console tutti i profili con `role: "admin"`: appartengono soltanto ai suoi account. Nessun UID è stato condiviso o letto dall'agente.

## Controlli precedenti e residui

1. Progetto `pd-game-rdn`, database `(default)` e testo delle regole live sono stati confermati dal proprietario dalla Console. Lo snapshot è conservato nel repository; conservare anche l'ID/versione ruleset mostrato dalla Console per rollback. Se il testo cambia ancora prima del deploy, fermarsi e riesaminare il diff.
2. Inventario degli admin completato dal proprietario nella Console: tutti i documenti con `role: "admin"` appartengono ai suoi account. Se emergono nuovi account inattesi, fermarsi prima del deploy.
3. **Aperto:** non è verificabile dal solo repository se client esterni usano `sessions/*`, `users/{uid}/private/*` oltre `progress`, o `users/{uid}/purchases/*` in scrittura. Le nuove regole negano queste operazioni ai client normali; monitorare eventuali `permission-denied`.
4. **Aperto:** provare sull'app un account normale e uno admin: login, profilo, salvataggio e restore progress, Adventure/Free, shop e premi, logout/riaccesso, offline/riconnessione. Test Android/dispositivo non ancora eseguiti. Il client aggiornato mostra il ruolo in sola lettura.
5. Confermare la scelta prodotto: il saldo virtuale resta alterabile dal proprietario tramite client modificato. Il test anti-cheat rimane FAIL documentato; non presentarlo come controllo superato.

## Pubblicazione e verifica

Il CLI locale ha inizialmente fallito per la catena TLS di Node. Usando temporaneamente un bundle delle CA pubbliche attendibili di Windows tramite `NODE_EXTRA_CA_CERTS`, `projects:list` ha confermato l'accesso a `pd-game-rdn` e il dry-run è **PASS (exit 0)**. TLS è rimasto verificato. Il bundle temporaneo non fa parte del repository. Il **deploy delle sole regole Firestore è PASS (exit 0)** il 5 novembre 2026, circa 10:28 CET: il CLI ha riferito `rules file firestore.rules compiled successfully`, `released rules firestore.rules to cloud.firestore` e `Deploy complete!`. Il proprietario ha poi confermato dalla Console che la data di pubblicazione è aggiornata al 5 novembre e che il testo attivo coincide con `firestore.rules`; non è una lettura diretta dell'agente. Nessun dato Firestore è stato modificato dal comando. Un test Android con account reale resta da eseguire; `adb devices -l` non ha mostrato dispositivi.

```text
firebase deploy --only firestore:rules --project pd-game-rdn --dry-run
firebase deploy --only firestore:rules --project pd-game-rdn
```

Dopo il deploy: rileggere dalla Console testo e data delle regole effettivamente distribuite, ripetere smoke con due account e verificare errori `permission-denied` su profilo, progress, tempo, admin e cataloghi. Registrare esito, ora, ruleset e hash nel piano release. Se un flusso legittimo fallisce, sospendere nuove modifiche ai dati, confrontare i log senza esporre informazioni personali e usare la versione precedente salvata per rollback **solo dopo aver valutato che riapre la vulnerabilità di auto-promozione**.
