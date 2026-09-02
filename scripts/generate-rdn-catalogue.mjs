import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(import.meta.dirname, "..");
const runner = resolve(root, "tools/rnd-catalogue/rnd-catalogue-runner.mjs");
const bundle = resolve(root, "scripts/.rnd-catalogue-runner.mjs");
const catalogueRoot = resolve(root, "src/assets/rnd/catalogues");
const manifestPath = resolve(catalogueRoot, "manifest.json");
const catalogueIndexPath = resolve(catalogueRoot, "index.json");
const checkOnly = process.argv.includes("--check");
const activateOnly = process.argv.includes("--activate");
const migrateOnly = process.argv.includes("--migrate-legacy");
const versionArgument = process.argv.indexOf("--version");
const requestedVersion = versionArgument >= 0 ? process.argv[versionArgument + 1] : undefined;
if (requestedVersion !== undefined && !/^v\d{3,}$/.test(requestedVersion)) throw new Error("Versione catalogo non valida. Usa, ad esempio, v004.");

const legacyVersion = async () => "v004";
const activeManifest = async () => { try { return JSON.parse(await readFile(manifestPath, "utf8")); } catch { return undefined; } };
const version = requestedVersion ?? (await activeManifest())?.version ?? await legacyVersion() ?? "v001";
const directory = resolve(catalogueRoot, version);
const levelsPath = resolve(directory, "levels.json");
const auditPath = resolve(directory, "audit.json");
const activeCatalogueConfigPath = resolve(root, "src/app/core/game/phaser/catalogues/active-catalogue.config.ts");
const activeFacadePaths = [
  resolve(root, "src/app/core/game/phaser/catalog.builder.ts"),
  resolve(root, "src/app/core/game/phaser/config/levels.config.ts"),
  resolve(root, "src/app/core/game/phaser/config/progression-rules.config.ts"),
  resolve(root, "src/app/core/game/phaser/config/rdn-release.config.ts"),
  resolve(root, "src/app/core/game/phaser/effects/effect-progression.config.ts"),
];
const manifest = (fingerprint, contract) => ({ version, levels: `assets/rnd/catalogues/${version}/levels.json`, audit: `assets/rnd/catalogues/${version}/audit.json`, levelSchemaVersion: contract?.levelSchemaVersion ?? 1, generatorVersion: contract?.generatorVersion, sourceFingerprint: fingerprint, generatedAt: new Date().toISOString(), validationPassed: true });
const updateCatalogueIndex = async (entry) => {
  let current = [];
  try { current = JSON.parse(await readFile(catalogueIndexPath, "utf8")); } catch { /* first published catalogue */ }
  const next = [...current.filter((item) => item.version !== entry.version), entry].sort((left, right) => left.version.localeCompare(right.version, undefined, { numeric: true }));
  await writeFile(catalogueIndexPath, JSON.stringify(next, null, 2) + "\n", "utf8");
};
const catalogueIndexEntry = async (catalogueVersion) => {
  try { return JSON.parse(await readFile(catalogueIndexPath, "utf8")).find((entry) => entry.version === catalogueVersion); } catch { return undefined; }
};
const activateRuntimeVersion = async () => {
  const activeConfig = await readFile(activeCatalogueConfigPath, "utf8");
  await writeFile(activeCatalogueConfigPath, activeConfig.replace(/"v\d{3,}"/, `"${version}"`), "utf8");
  await Promise.all(activeFacadePaths.map(async (path) => {
    const content = await readFile(path, "utf8");
    await writeFile(path, content.replace(/catalogues\/v\d{3,}\//, `catalogues/${version}/`), "utf8");
  }));
};

const publish = async (catalogue) => {
  const levels = JSON.stringify(catalogue.levels); const audit = JSON.stringify(catalogue.audit);
  const fingerprint = createHash("sha256").update(levels).update(audit).digest("hex").slice(0, 16);
  await mkdir(directory, { recursive: true });
  await writeFile(levelsPath, levels, "utf8"); await writeFile(auditPath, audit, "utf8");
  const entry = manifest(fingerprint, catalogue.contract);
  await updateCatalogueIndex(entry);
  const active = await activeManifest();
  if (!active || active.version === version) await writeFile(manifestPath, JSON.stringify(entry, null, 2) + "\n", "utf8");
  console.info(`[RDN] Catalogo ${version} pubblicato: ${catalogue.levels.length} livelli, fingerprint ${fingerprint}.`);
};
const loadLegacy = async () => {
  const source = await readFile(resolve(root, "tools/rnd-catalogue/legacy", `rnd-catalogue-${version}.generated.ts`), "utf8");
  const levels = source.match(/GENERATED_RDN_LEVELS = (.+?) as unknown as readonly LevelDefinition\[\];/s)?.[1];
  const audit = source.match(/GENERATED_RDN_SOLUTION_AUDIT = (.+?) as unknown as readonly unknown\[\];/s)?.[1];
  if (!levels || !audit) throw new Error("Catalogo TypeScript legacy non leggibile.");
  return { levels: JSON.parse(levels), audit: JSON.parse(audit) };
};
try {
  if (activateOnly) {
    const levels = await readFile(levelsPath, "utf8"); const audit = await readFile(auditPath, "utf8");
    const fingerprint = createHash("sha256").update(levels).update(audit).digest("hex").slice(0, 16);
    await writeFile(manifestPath, JSON.stringify((await catalogueIndexEntry(version)) ?? manifest(fingerprint), null, 2) + "\n", "utf8");
    await activateRuntimeVersion();
    console.info(`[RDN] Catalogo attivo: ${version}.`);
  } else if (migrateOnly) await publish(await loadLegacy());
  else {
    process.env.RDN_CATALOGUE_VERSION = version;
    await build({ entryPoints: [runner], bundle: true, format: "esm", platform: "node", target: "node20", outfile: bundle, logLevel: "info" });
    const { catalogue } = await import(`${pathToFileURL(bundle).href}?generatedAt=${Date.now()}`);
    if (checkOnly) {
      const fingerprint = createHash("sha256").update(JSON.stringify(catalogue.levels)).update(JSON.stringify(catalogue.audit)).digest("hex").slice(0, 16);
      if ((await activeManifest())?.sourceFingerprint !== fingerprint) throw new Error("Il catalogo RDN pubblicato non Ã¨ aggiornato. Esegui npm run rdn:catalogue.");
      console.info("[RDN] Catalogo pubblicato aggiornato.");
    } else await publish(catalogue);
  }
} finally { await rm(bundle, { force: true }); }
