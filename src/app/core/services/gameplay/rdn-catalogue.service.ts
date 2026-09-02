import { Injectable } from "@angular/core";
import { LevelDefinition } from "../../game/phaser/puzzle.types";
import { PuzzleSolutionAudit } from "../../game/phaser/catalog.builder";
import { getRdnCatalogueRuntime } from "../../game/phaser/catalogues/catalogue.registry";

interface RdnCatalogueManifest {
  readonly version: string;
  readonly levels: string;
  readonly audit: string;
  readonly sourceFingerprint?: string;
  readonly levelSchemaVersion?: number;
  readonly generatorVersion?: string;
}

/** Loads published RDN data on demand. Catalogue data is intentionally not part of the JS bundle. */
@Injectable({ providedIn: "root" })
export class RdnCatalogueService {
  private manifestPromise?: Promise<RdnCatalogueManifest>;
  private versionsPromise?: Promise<readonly RdnCatalogueManifest[]>;
  private readonly levelsPromises = new Map<string, Promise<readonly LevelDefinition[]>>();
  private readonly auditPromises = new Map<string, Promise<readonly PuzzleSolutionAudit[]>>();

  async getLevel(variant: "adventure" | "time-attack", number = 1): Promise<LevelDefinition> {
    const levels = await this.levels();
    const expectedVariant = variant === "adventure" ? "persistent" : "loader";
    const level = levels.find((item) => item.variant === expectedVariant && item.number === number) ?? levels.find((item) => item.variant === expectedVariant);
    if (!level) throw new Error(`Catalogo RDN incompleto: livello ${variant} ${number} non disponibile.`);
    return level;
  }

  async versions(): Promise<readonly RdnCatalogueManifest[]> {
    this.versionsPromise ??= this.loadJson<readonly RdnCatalogueManifest[]>("assets/rnd/catalogues/index.json")
      .then((versions) => [...versions].sort((left, right) => right.version.localeCompare(left.version, undefined, { numeric: true })))
      .catch(async () => [await this.loadManifest()]);
    return this.versionsPromise;
  }

  async levels(version?: string): Promise<readonly LevelDefinition[]> {
    const manifest = await this.manifestFor(version);
    this.levelsPromises.get(manifest.version) ?? this.levelsPromises.set(manifest.version, (async () => {
      const runtime = getRdnCatalogueRuntime(manifest.version);
      if (manifest.levelSchemaVersion !== undefined && manifest.levelSchemaVersion !== runtime.contract.levelSchemaVersion) throw new Error(`Catalogo RDN ${manifest.version} incompatibile: schema livelli ${manifest.levelSchemaVersion}.`);
      if (manifest.generatorVersion !== undefined && manifest.generatorVersion !== runtime.contract.generatorVersion) throw new Error(`Catalogo RDN ${manifest.version} incompatibile: motore ${manifest.generatorVersion}.`);
      const raw = await this.loadJson<readonly LevelDefinition[]>(manifest.levels);
      return raw.map((level) => runtime.prepareRdnCatalogueLevel(level));
    })());
    return this.levelsPromises.get(manifest.version)!;
  }

  async audit(variant?: "adventure" | "time-attack", version?: string): Promise<readonly PuzzleSolutionAudit[]> {
    const manifest = await this.manifestFor(version);
    this.auditPromises.get(manifest.version) ?? this.auditPromises.set(manifest.version, this.loadJson<readonly PuzzleSolutionAudit[]>(manifest.audit));
    const audit = await this.auditPromises.get(manifest.version)!;
    return variant ? audit.filter((row) => row.variant === variant) : audit;
  }

  private async manifestFor(version?: string): Promise<RdnCatalogueManifest> {
    if (!version) return this.loadManifest();
    const manifest = (await this.versions()).find((candidate) => candidate.version === version);
    if (!manifest) throw new Error(`Catalogo RDN ${version} non disponibile.`);
    return manifest;
  }

  private loadManifest(): Promise<RdnCatalogueManifest> {
    this.manifestPromise ??= this.loadJson<RdnCatalogueManifest>("assets/rnd/catalogues/manifest.json");
    return this.manifestPromise;
  }

  private async loadJson<T>(path: string): Promise<T> {
    // Catalogues may be published while the development application is open.
    // Do not let a stale index hide newly generated versions from Utils pages.
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) throw new Error(`Impossibile caricare ${path} (${response.status}).`);
    return response.json() as Promise<T>;
  }
}
