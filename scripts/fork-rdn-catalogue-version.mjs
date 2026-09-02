import { access, cp, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const argument = (name) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const positionalVersions = process.argv.slice(2).filter((value) => /^v\d{3,}$/.test(value));
const from = argument("--from") ?? positionalVersions[0];
const to = argument("--to") ?? positionalVersions[1];
if (!from || !to || !/^v\d{3,}$/.test(from) || !/^v\d{3,}$/.test(to) || from === to) throw new Error("Usa --from v004 --to v005.");

const source = resolve(root, "src/app/core/game/phaser/catalogues", from);
const destination = resolve(root, "src/app/core/game/phaser/catalogues", to);
try { await access(source, constants.R_OK); } catch { throw new Error(`Motore sorgente ${from} non trovato.`); }
try { await access(destination, constants.F_OK); throw new Error(`Motore ${to} esiste gia.`); } catch (error) { if (String(error).includes("esiste gia")) throw error; }

await cp(source, destination, { recursive: true, errorOnExist: true });
for (const file of ["catalogue.contract.ts", "rdn-release.config.ts"]) {
  const path = resolve(destination, file);
  const content = await readFile(path, "utf8");
  await writeFile(path, content.replaceAll(from, to), "utf8");
}

const registryPath = resolve(root, "src/app/core/game/phaser/catalogues/catalogue.registry.ts");
const registry = await readFile(registryPath, "utf8");
const registryImports = `import { RDN_CATALOGUE_CONTRACT as ${to}Contract } from "./${to}/catalogue.contract";\nimport * as ${to}Builder from "./${to}/catalog.builder";\n`;
const registryEntry = `  ${to}: {\n    contract: ${to}Contract,\n    generateRdnPuzzle: ${to}Builder.generateRdnPuzzle,\n    prepareRdnCatalogueLevel: ${to}Builder.prepareRdnCatalogueLevel,\n  },\n`;
if (registry.includes(`./${to}/catalogue.contract`)) throw new Error(`${to} e gia registrato.`);
await writeFile(registryPath, registry.replace("\nconst catalogueRuntimes", `\n${registryImports}\nconst catalogueRuntimes`).replace("} as const;", `${registryEntry}} as const;`), "utf8");

const runnerPath = resolve(root, "tools/rnd-catalogue/rnd-catalogue-runner.mjs");
const runner = await readFile(runnerPath, "utf8");
const runnerEntry = `  ${to}: {\n    levels: await import("../../src/app/core/game/phaser/catalogues/${to}/catalog.builder.ts"),\n    contract: await import("../../src/app/core/game/phaser/catalogues/${to}/catalogue.contract.ts"),\n  },\n`;
await writeFile(runnerPath, runner.replace("};\nconst implementation", `${runnerEntry}};\nconst implementation`), "utf8");

console.info(`[RDN] Creato e registrato il motore ${to} da ${from}. Per attivarlo, imposta ACTIVE_RDN_CATALOGUE_VERSION a ${to}, poi pubblica con npm run rdn:catalogue -- --version ${to}.`);
