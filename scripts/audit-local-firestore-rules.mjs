import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Diagnostic patterns for this repository's local snapshot, not a Firestore rules evaluator.
function matchBody(source, path) {
  const marker = `match ${path}`;
  const markerAt = source.indexOf(marker);
  if (markerAt < 0) return '';
  const opening = source.indexOf('{', markerAt + marker.length);
  if (opening < 0) return '';
  let depth = 0;
  for (let index = opening; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}' && --depth === 0) return source.slice(opening + 1, index);
  }
  return '';
}

function allows(block, action, condition) {
  const topLevel = block.split(/\bmatch\s+\//)[0];
  for (const declaration of topLevel.matchAll(/\ballow\s+([^:;]+):\s*if\s+([^;]+);/g)) {
    const actions = declaration[1].split(',').map((part) => part.trim());
    if (actions.includes(action) && declaration[2].trim() === condition) return true;
  }
  return false;
}

export function auditLocalRules(source) {
  const rules = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\r\n]*/g, '');
  const findings = [];
  const ownerProfileWrite = allows(matchBody(rules, '/users/{userId}'), 'write', 'isOwner(userId)');
  const profileRoleAdmin = /\.data\.role\s*==\s*['"]admin['"]/.test(rules);
  if (ownerProfileWrite && profileRoleAdmin) {
    findings.push({ id: 'ROLE', severity: 'P0', detail: 'Owner can write users/{uid}; admin check trusts role in that document.' });
  }
  if (allows(matchBody(rules, '/private/{document=**}'), 'write', 'isOwner(userId)')) {
    findings.push({ id: 'PROGRESS', severity: 'P0', detail: 'Owner has unrestricted write to private progress, including balances and rewards.' });
  }
  if (allows(matchBody(rules, '/meta/time'), 'write', 'isSignedIn()')) {
    findings.push({ id: 'TIME', severity: 'P1', detail: 'Any authenticated user can write meta/time.' });
  }
  const sessions = matchBody(rules, '/sessions/{document=**}');
  if (allows(sessions, 'read', 'isSignedIn()') || allows(sessions, 'write', 'isSignedIn()')) {
    findings.push({ id: 'SESSIONS', severity: 'P0', detail: 'Any authenticated user has broad access to sessions documents.' });
  }
  return findings;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const rulesPath = resolve(process.argv[2] ?? 'docs/firebase/firestore.rules.current.txt');
  try {
    const findings = auditLocalRules(readFileSync(rulesPath, 'utf8'));
    console.log(`Local rules diagnostic: ${rulesPath}`);
    for (const finding of findings) console.log(`${finding.severity} ${finding.id}: ${finding.detail}`);
    console.log(`${findings.length} known risk pattern(s). Static scan only; even zero findings is not a security PASS. Deployed rules and effective permissions remain unverified.`);
    process.exitCode = findings.length ? 1 : 0;
  } catch (error) {
    console.error(`Cannot read local rules: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 2;
  }
}
