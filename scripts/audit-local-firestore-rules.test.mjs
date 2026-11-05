import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { auditLocalRules } from './audit-local-firestore-rules.mjs';

test('flags the four known broad permissions in the local snapshot', () => {
  const source = readFileSync('docs/firebase/firestore.rules.current.txt', 'utf8');
  assert.deepEqual(auditLocalRules(source).map(({ id }) => id), ['ROLE', 'PROGRESS', 'TIME', 'SESSIONS']);
});

test('does not flag constrained synthetic rules as the known broad patterns', () => {
  const source = `
    function isAdmin() { return request.auth.token.admin == true; }
    match /users/{userId} { allow read: if isOwner(userId); }
    match /private/{document=**} { allow read: if isOwner(userId); }
    match /meta/time { allow read: if isSignedIn(); }
    match /sessions/{document=**} { allow read: if isOwner(userId); }
  `;
  assert.deepEqual(auditLocalRules(source), []);
});

test('recognizes equivalent separate read and write statements', () => {
  const source = `
    function isAdmin() { return get(/databases/x/documents/users/$(request.auth.uid)).data.role == 'admin'; }
    match /users/{userId} {
      allow read: if isOwner(userId);
      allow write: if isOwner(userId);
      match /private/{document=**} { allow write: if isOwner(userId); }
    }
    match /meta/time { allow read: if isSignedIn(); allow write: if isSignedIn(); }
    match /sessions/{document=**} { allow read: if isSignedIn(); }
  `;
  assert.deepEqual(auditLocalRules(source).map(({ id }) => id), ['ROLE', 'PROGRESS', 'TIME', 'SESSIONS']);
});

test('ignores rules appearing only in comments', () => {
  const source = `// match /meta/time { allow read, write: if isSignedIn(); }
    /* match /sessions/{document=**} { allow read, write: if isSignedIn(); } */`;
  assert.deepEqual(auditLocalRules(source), []);
});
