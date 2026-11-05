import assert from 'node:assert/strict';
import test from 'node:test';
import { initializeApp, deleteApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth, connectAuthEmulator } from 'firebase/auth';
import { doc, getDoc, getFirestore, connectFirestoreEmulator, setDoc, serverTimestamp } from 'firebase/firestore';

// Only the explicitly configured demo project and loopback emulators are reachable.
const projectId = 'demo-gearithm-rules';
const authUrl = 'http://127.0.0.1:9099';
const firestoreUrl = 'http://127.0.0.1:8080';

async function requireLocalEmulators() {
  for (const url of [authUrl, firestoreUrl]) {
    try {
      await fetch(url, { signal: AbortSignal.timeout(1500) });
    } catch {
      throw new Error(`Emulator non disponibile su ${url}. Avviare il comando documentato in FIREBASE_SECURITY_AUDIT.md.`);
    }
  }
}

let counter = 0;
async function createUser(label) {
  const instance = ++counter;
  const app = initializeApp({ apiKey: 'demo-key', authDomain: `${projectId}.firebaseapp.com`, projectId }, `rules-test-${label}-${instance}`);
  const auth = getAuth(app);
  connectAuthEmulator(auth, authUrl, { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  const email = `${label}-${instance}@example.invalid`;
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, 'local-only-test-password');
    return { app, db, uid: credential.user.uid };
  } catch (error) {
    await deleteApp(app);
    throw error;
  }
}

async function withUsers(callback) {
  const a = await createUser('a');
  const b = await createUser('b');
  try {
    await setDoc(doc(a.db, 'users', a.uid), { role: 'user', profileId: a.uid, nickname: '', bannerUrl: '', imageUrl: '', createdAt: serverTimestamp() });
    await setDoc(doc(b.db, 'users', b.uid), { role: 'user', profileId: b.uid, nickname: '', bannerUrl: '', imageUrl: '', createdAt: serverTimestamp() });
    await callback(a, b);
  } finally {
    await Promise.all([deleteApp(a.app), deleteApp(b.app)]);
  }
}

async function denied(operation) {
  await assert.rejects(operation, (error) => String(error?.code).endsWith('permission-denied'));
}

async function seedFixture(path, fields) {
  // Emulator-only REST fixture: never use a real project ID or non-loopback host.
  const url = `${firestoreUrl}/v1/projects/${projectId}/databases/(default)/documents/${path}`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { authorization: 'Bearer owner', 'content-type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  assert.equal(response.status, 200, `Fixture Emulator fallita: ${await response.text()}`);
}

test.before(requireLocalEmulators);

test('utente A non legge il profilo di B', async () => {
  await withUsers(async (a, b) => denied(() => getDoc(doc(a.db, 'users', b.uid))));
});

test('utente A legge e aggiorna un campo ordinario del proprio profilo', async () => {
  await withUsers(async (a) => {
    await setDoc(doc(a.db, 'users', a.uid), { role: 'user', nickname: 'Test locale', profileId: a.uid }, { merge: true });
    const profile = await getDoc(doc(a.db, 'users', a.uid));
    assert.equal(profile.data()?.nickname, 'Test locale');
  });
});

test('un utente non puo assegnarsi il ruolo admin', async () => {
  await withUsers(async (a) => denied(() => setDoc(doc(a.db, 'users', a.uid), { role: 'admin' }, { merge: true })));
});

test('un nuovo utente non puo creare direttamente un profilo admin', async () => {
  const a = await createUser('new-admin');
  try {
    await denied(() => setDoc(doc(a.db, 'users', a.uid), { role: 'admin', profileId: a.uid, nickname: '', bannerUrl: '', imageUrl: '', createdAt: serverTimestamp() }));
  } finally {
    await deleteApp(a.app);
  }
});

test('un nuovo utente non puo aggiungere campi privilegiati al profilo', async () => {
  const a = await createUser('extra-field');
  try {
    await denied(() => setDoc(doc(a.db, 'users', a.uid), { role: 'user', profileId: a.uid, nickname: '', bannerUrl: '', imageUrl: '', createdAt: serverTimestamp(), coins: 999999 }));
  } finally {
    await deleteApp(a.app);
  }
});

test('un utente non puo riscrivere createdAt o profileId esistenti', async () => {
  await withUsers(async (a) => {
    await denied(() => setDoc(doc(a.db, 'users', a.uid), { createdAt: serverTimestamp() }, { merge: true }));
    await denied(() => setDoc(doc(a.db, 'users', a.uid), { profileId: 'forged' }, { merge: true }));
  });
});

test('un profilo legacy con campi vuoti puo completare il backfill', async () => {
  const a = await createUser('legacy');
  try {
    await seedFixture(`users/${a.uid}`, {
      role: { stringValue: 'user' },
      profileId: { stringValue: '' },
      createdAt: { nullValue: null },
    });
    await setDoc(doc(a.db, 'users', a.uid), { profileId: 'recovered-id', createdAt: serverTimestamp() }, { merge: true });
    const profile = await getDoc(doc(a.db, 'users', a.uid));
    assert.equal(profile.data()?.profileId, 'recovered-id');
    assert.equal(typeof profile.data()?.createdAt?.toMillis(), 'number');
  } finally {
    await deleteApp(a.app);
  }
});

test('un admin preesistente puo leggere un altro profilo e gestire cataloghi', async () => {
  const admin = await createUser('admin');
  const user = await createUser('regular');
  try {
    await seedFixture(`users/${admin.uid}`, { role: { stringValue: 'admin' } });
    await setDoc(doc(user.db, 'users', user.uid), { role: 'user', profileId: user.uid, nickname: '', bannerUrl: '', imageUrl: '', createdAt: serverTimestamp() });
    await getDoc(doc(admin.db, 'users', user.uid));
    await setDoc(doc(admin.db, 'gameConfigs', 'public'), { fixture: true });
    await setDoc(doc(admin.db, 'shopItems', 'fixture-item'), { fixture: true });
  } finally {
    await Promise.all([deleteApp(admin.app), deleteApp(user.app)]);
  }
});

test('un ruolo scritto dal client non deve aprire i dati di altri utenti', async () => {
  await withUsers(async (a, b) => {
    try {
      await setDoc(doc(a.db, 'users', a.uid), { role: 'admin' }, { merge: true });
    } catch (error) {
      if (String(error?.code).endsWith('permission-denied')) return;
      throw error;
    }
    await denied(() => getDoc(doc(a.db, 'users', b.uid)));
  });
});

test('un client non puo assegnarsi un saldo arbitrario', async () => {
  await withUsers(async (a) => denied(() => setDoc(doc(a.db, 'users', a.uid, 'private', 'progress'), { coins: 999999, gems: 999999 })));
});

test('il proprietario puo salvare e rileggere il proprio progress corrente', async () => {
  await withUsers(async (a) => {
    const ref = doc(a.db, 'users', a.uid, 'private', 'progress');
    await setDoc(ref, { coins: 42, gems: 3, level: 2 });
    const snapshot = await getDoc(ref);
    assert.equal(snapshot.data()?.coins, 42);
    await setDoc(ref, { coins: 0 });
    const reset = await getDoc(ref);
    assert.equal(reset.data()?.coins, 0);
    assert.equal(reset.data()?.level, undefined);
  });
});

test('un client anonimo non legge profili privati ma legge la configurazione pubblica', async () => {
  const app = initializeApp({ apiKey: 'demo-key', authDomain: `${projectId}.firebaseapp.com`, projectId }, `rules-test-anon-${++counter}`);
  const db = getFirestore(app);
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  try {
    await denied(() => getDoc(doc(db, 'users', 'another-user')));
    await getDoc(doc(db, 'gameConfigs', 'public'));
  } finally {
    await deleteApp(app);
  }
});

test('un utente non legge una sessione altrui', async () => {
  await withUsers(async (a, b) => denied(() => getDoc(doc(a.db, 'sessions', b.uid))));
});

test('un utente non scrive una sessione altrui', async () => {
  await withUsers(async (a, b) => denied(() => setDoc(doc(a.db, 'sessions', b.uid), { userId: b.uid })));
});

test('un client non crea liberamente record di acquisto', async () => {
  await withUsers(async (a) => denied(() => setDoc(doc(a.db, 'users', a.uid, 'purchases', 'forged-purchase'), { itemId: 'example', price: 0 })));
});

test('un client non crea un acquisto nel percorso usato da ShopService', async () => {
  await withUsers(async (a) => denied(() => setDoc(doc(a.db, 'users', a.uid, 'private', 'progress', 'purchases', 'forged-purchase'), { itemId: 'example', price: 0 })));
});

test('un client non scrive meta/time', async () => {
  await withUsers(async (a) => denied(() => setDoc(doc(a.db, 'meta', 'time'), { timestamp: 0 })));
});

test('la sincronizzazione tempo esistente puo scrivere e leggere serverTimestamp', async () => {
  await withUsers(async (a) => {
    const ref = doc(a.db, 'meta', 'time');
    await setDoc(ref, { now: serverTimestamp() });
    const snapshot = await getDoc(ref);
    assert.equal(typeof snapshot.data()?.now?.toMillis(), 'number');
  });
});

test('i cataloghi e la configurazione pubblica restano leggibili, ma non scrivibili da un utente', async () => {
  await withUsers(async (a) => {
    await getDoc(doc(a.db, 'catalogAwards', 'example'));
    await getDoc(doc(a.db, 'gameConfigs', 'public'));
    await denied(() => setDoc(doc(a.db, 'gameConfigs', 'public'), { test: true }));
  });
});

