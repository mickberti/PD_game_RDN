import { readFile } from 'node:fs/promises';
import { resolve, dirname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../');
const option = (name) => { const i = process.argv.indexOf(name); return i < 0 ? undefined : process.argv[i + 1]; };
const problems = [];
const fail = (message) => problems.push(message);
const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));

try {
  const manifest = await readJson(resolve(root, 'src/assets/rnd/catalogues/manifest.json'));
  const version = option('--version') ?? manifest.version;
  if (!/^v\d{3,}$/.test(version)) throw new Error(`Invalid version: ${version}`);
  const file = option('--file') ? resolve(option('--file')) : resolve(root, `src/assets/rnd/catalogues/${version}/levels.json`);
  const levels = await readJson(file);
  const presetSource = await readFile(resolve(root, 'src/app/core/game/phaser/effects/effect-presets.config.ts'), 'utf8');
  const presets = new Map([...presetSource.matchAll(/^\s*([A-Z][A-Z0-9_]+):\s*\{\s*scope:\s*EffectScope\.(GEM|LINK|AREA)/gm)].map((match) => [match[1], match[2]]));
  if (!Array.isArray(levels) || !levels.length) fail('Catalogue must be a nonempty array');
  const seen = new Set();
  for (const [n, level] of (Array.isArray(levels) ? levels : []).entries()) {
    const label = `${n}:${level?.id ?? '?'}`;
    if (!level || typeof level !== 'object') { fail(`${label} invalid level`); continue; }
    if (typeof level.id !== 'string' || seen.has(level.id)) fail(`${label} missing/duplicate id`);
    seen.add(level.id);
    const size = level.positions;
    if (!Number.isInteger(size) || size < 4 || size > 9) fail(`${label} invalid positions`);
    const fields = level.variant === 'persistent' ? ['innerValues', 'outerValues', 'loaderQueues'] : ['outerValues'];
    for (const field of fields) {
      if (!Array.isArray(level[field]) || level[field].length !== size) fail(`${label} ${field} length != positions`);
    }
    if (!Array.isArray(level.slotPhases) || !level.slotPhases.length) fail(`${label} empty slotPhases`);
    if (!Array.isArray(level.solutionMoves) || !level.solutionMoves.length) fail(`${label} empty solutionMoves`);
    if (level.variant !== 'persistent' && level.variant !== 'loader') fail(`${label} unknown published variant`);
    for (const [i, move] of (level.solutionMoves ?? []).entries()) {
      if (!Number.isInteger(move.outerIndex) || move.outerIndex < 0 || move.outerIndex >= size || !Number.isInteger(move.rotation) || move.rotation < 0 || move.rotation >= size) fail(`${label} invalid solutionMoves[${i}]`);
    }
    for (const [i, assignment] of (level.effectConfiguration?.effects ?? []).entries()) {
      const target = assignment.target ?? {};
      if (!presets.has(assignment.preset)) fail(`${label} unknown effect preset[${i}]: ${assignment.preset}`);
      else if (presets.get(assignment.preset) !== target.type) fail(`${label} effect preset/target scope mismatch[${i}]`);
      const indexes = target.type === 'GEM' ? [target.gemIndex] : target.type === 'LINK' ? [target.fromGemIndex, target.toGemIndex] : target.type === 'AREA' ? [target.sourceGemIndex] : [];
      if (!indexes.length || indexes.some((x) => !Number.isInteger(x) || x < 0 || x >= size)) fail(`${label} invalid effect target[${i}]`);
    }
  }
  if (!option('--file') && version === manifest.version) {
    const expected = `assets/rnd/catalogues/${version}/levels.json`;
    if (manifest.levels !== expected || manifest.validationPassed !== true) fail('Active manifest does not match validated catalogue');
  }
  console.log(JSON.stringify({ version, file, levels: Array.isArray(levels) ? levels.length : 0, errors: problems.slice(0, 30), errorCount: problems.length }, null, 2));
  if (problems.length) process.exitCode = 1;
} catch (error) { console.error(error.message); process.exitCode = 2; }
