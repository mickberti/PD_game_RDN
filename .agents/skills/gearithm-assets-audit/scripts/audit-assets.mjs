import { readFile, readdir, access } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../');
const assetRoot = process.argv.includes('--assets-root') ? resolve(process.argv[process.argv.indexOf('--assets-root') + 1]) : resolve(root, 'src/assets');
const atlasIndex = process.argv.indexOf('--atlas');
const selectedAtlas = atlasIndex >= 0 ? resolve(process.argv[atlasIndex + 1]) : undefined;
const errors = [], warnings = [];
const walk = async (dir) => (await Promise.all((await readdir(dir, { withFileTypes: true })).map(async (entry) => entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]))).flat();
const exists = async (path) => { try { await access(path); return true; } catch { return false; } };
const parseAtlas = (source) => {
  const start = source.indexOf('export const atlasData =');
  if (start < 0) throw new Error('atlasData export missing');
  const first = source.indexOf('{', start), last = source.lastIndexOf('}');
  if (first < 0 || last < first) throw new Error('atlas object missing');
  return JSON.parse(source.slice(first, last + 1));
};
try {
  const files = await walk(assetRoot);
  const atlases = files.filter((path) => /[\\/]atlas-[^\\/]+\.ts$/.test(path) && (!selectedAtlas || resolve(path) === selectedAtlas));
  if (selectedAtlas && !atlases.length) throw new Error(`Atlas not found: ${selectedAtlas}`);
  for (const path of atlases) {
    try {
      const atlas = parseAtlas(await readFile(path, 'utf8'));
      const image = String(atlas.meta?.image ?? '').replace(/^\//, '').replace(/^assets\//, '');
      const imagePath = resolve(assetRoot, image);
      const imageExists = !!image && await exists(imagePath);
      if (!imageExists) errors.push(`${path}: missing atlas image ${image}`);
      const { w, h } = atlas.meta?.size ?? {};
      if (!Number.isInteger(w) || !Number.isInteger(h) || w <= 0 || h <= 0) errors.push(`${path}: invalid atlas size`);
      if (imageExists && imagePath.toLowerCase().endsWith('.png')) {
        const bytes = await readFile(imagePath);
        if (bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') errors.push(`${path}: invalid PNG signature`);
        else if (bytes.readUInt32BE(16) !== w || bytes.readUInt32BE(20) !== h) errors.push(`${path}: declared atlas size differs from PNG`);
      }
      for (const [name, entry] of Object.entries(atlas.frames ?? {})) {
        const f = entry.frame ?? {};
        if (![f.x, f.y, f.w, f.h].every(Number.isInteger) || f.x < 0 || f.y < 0 || f.w <= 0 || f.h <= 0 || f.x + f.w > w || f.y + f.h > h) errors.push(`${path}: frame ${name} out of bounds`);
      }
    } catch (error) { errors.push(`${path}: ${error.message}`); }
  }
  const config = selectedAtlas ? '' : await readFile(resolve(root, 'src/app/core/audio/audio.config.ts'), 'utf8');
  const paths = [...new Set(config.match(/assets\/audio\/[A-Za-z0-9_./-]+\.(?:wav|mp3|ogg)/g) ?? [])];
  for (const path of paths) if (!await exists(resolve(assetRoot, path.replace(/^assets\//, '')))) warnings.push(`missing audio reference: ${path}`);
  console.log(JSON.stringify({ atlases: atlases.length, audioReferences: paths.length, errors: errors.slice(0, 50), errorCount: errors.length, warnings: warnings.slice(0, 30), warningCount: warnings.length }, null, 2));
  if (errors.length) process.exitCode = 1;
} catch (error) { console.error(error.message); process.exitCode = 2; }
