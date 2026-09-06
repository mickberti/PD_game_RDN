import { CommonModule } from "@angular/common";
import { Component, computed, inject, OnInit, signal } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { IonCheckbox, IonContent, IonFooter, IonSelect, IonSelectOption, IonToolbar } from "@ionic/angular/standalone";
import { EffectScope, ResolvedEffect } from "../../../core/game/phaser/effects/effects.models";
import { PuzzleOperator } from "../../../core/game/phaser/puzzle.types";
import { effectAssetAtlasSource, effectAssetFrame } from "../../../core/game/phaser/effects/effect-presentation.config";
import { RDN_MAX_LEVEL } from "../../../core/game/phaser/config/levels.config";
import { RdnCatalogueService } from "../../../core/services/gameplay/rdn-catalogue.service";
import { UiSpriteComponent } from "../../../shared/basic/ui-sprite.component";
import { UIBottomUtilsComponent } from "../../../shared/components/ui-bottom-utils.component";
import { UiUtilsPageHeaderComponent } from "../../../shared/components/ui-utils-page-header.component";

type SummaryVariant = "adventure" | "time-attack";
const SUMMARY_COLUMNS = [
  { id: "level", label: "Livello" }, { id: "gems", label: "Gemme" }, { id: "specials", label: "Speciali" },
  { id: "gemEffects", label: "Effetti gemma" }, { id: "linkEffects", label: "Effetti link" }, { id: "areaEffects", label: "Effetti area" },
  { id: "generation", label: "Generazione" }, { id: "impulses", label: "Impulsi" }, { id: "complexity", label: "Complessità" },
  { id: "attempts", label: "Tentativi" }, { id: "diagnostics", label: "Diagnostica" },
] as const;
type SummaryColumn = typeof SUMMARY_COLUMNS[number]["id"];

@Component({
  selector: "app-rnd-effects-summary",
  standalone: true,
  imports: [CommonModule, IonCheckbox, IonContent, IonFooter, IonSelect, IonSelectOption, IonToolbar, UIBottomUtilsComponent, UiUtilsPageHeaderComponent, UiSpriteComponent],
  template: `
    <ion-content>
      <div class="screen effects-summary-page">
        <ui-utils-page-header group="game" [title]="title()" [description]="description()" />
        <ion-select class="catalogue-selector" label="Versione catalogo" label-placement="stacked" interface="popover" [value]="selectedVersion()" (ionChange)="selectVersion($event.detail.value)">
          @for (version of versions(); track version) { <ion-select-option [value]="version">{{ version }}</ion-select-option> }
        </ion-select>
        <section class="column-controls" aria-label="Colonne visibili">
          <span>Colonne</span>
          @for (column of columns; track column.id) { <ion-checkbox [checked]="isColumnVisible(column.id)" (ionChange)="setColumnVisible(column.id, $event.detail.checked)">{{ column.label }}</ion-checkbox> }
        </section>

        <div class="table-wrap">
          <table [class.hide-level]="!isColumnVisible('level')" [class.hide-gems]="!isColumnVisible('gems')" [class.hide-specials]="!isColumnVisible('specials')" [class.hide-gem-effects]="!isColumnVisible('gemEffects')" [class.hide-link-effects]="!isColumnVisible('linkEffects')" [class.hide-area-effects]="!isColumnVisible('areaEffects')" [class.hide-generation]="!isColumnVisible('generation')" [class.hide-impulses]="!isColumnVisible('impulses')" [class.hide-complexity]="!isColumnVisible('complexity')" [class.hide-diagnostics]="!isColumnVisible('diagnostics')" [class.hide-attempts]="!isColumnVisible('attempts')">
            <thead>
              <tr>
                <th scope="col">Livello</th>
                <th scope="col">Gemme</th>
                <th scope="col">Speciali</th>
                <th scope="col">Effetti gemma</th>
                <th scope="col">Effetti link</th>
                <th scope="col">Effetti area</th>
                <th scope="col">Generazione</th>
                <th scope="col">Impulsi ★★★</th>
                <th scope="col">Complessita</th>
                <th scope="col">Diagnostica</th>
                <th scope="col">Tentativi</th>
              </tr>
            </thead>
            <tbody>
              @for (row of rows(); track row.level) {
                <tr>
                  <th scope="row">{{ row.level }}</th>
                  <td>{{ row.slots.length }}</td>
                  <td><span class="effect-icons">@for (special of specialOperators(row.level); track special) { <ui-sprite [frame]="specialOperatorFrame(special)" [atlasSource]="specialOperatorAtlas(special)" [showScale]="false" [title]="specialOperatorTitle(special)" /> } @empty { <span class="empty">—</span> }</span></td>
                  <td><span class="effect-icons">@for (effect of gemEffects(row.effects); track effect.id) { <ui-sprite [frame]="effectFrame(effect)" atlasSource="effects" [showScale]="false" [title]="effectTooltip(effect)" /> } @empty { <span class="empty">—</span> }</span></td>
                  <td><span class="effect-icons">@for (effect of linkEffects(row.effects); track effect.id) { <ui-sprite [frame]="effectFrame(effect)" atlasSource="effects" [showScale]="false" [title]="effectTooltip(effect)" /> } @empty { <span class="empty">—</span> }</span></td>
                  <td><span class="effect-icons">@for (effect of areaEffects(row.effects); track effect.id) { <ui-sprite [frame]="effectFrame(effect)" atlasSource="effects" [showScale]="false" [title]="effectTooltip(effect)" /> } @empty { <span class="empty">—</span> }</span></td>
                  <td>{{ generationStats(row.level)?.elapsedMs?.toFixed(1) ?? '-' }} ms</td>
                  <td>{{ officialSolutionImpulses(row.level) ?? '-' }}</td>
                  <td>{{ generationStats(row.level)?.totalComplexity ?? '-' }}</td>
                  <td class="diagnostics" [title]="diagnosticSummary(row.level)">{{ diagnosticSummary(row.level) }}</td>
                  <td class="generation-trace">{{ generationSummary(row.level) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </ion-content>
    <ion-footer><ion-toolbar><ui-bottom-utils /></ion-toolbar></ion-footer>
  `,
  styles: [`
    .effects-summary-page { padding-bottom: 22px; width: 100%}
    .catalogue-selector { display: block; max-width: 240px; margin: 16px 0; border: 1px solid rgba(103, 232, 249, .35); border-radius: 12px; padding: 0 12px; color: #dff9ff; background: rgba(8, 35, 46, .72); }
    .column-controls { display:flex; flex-wrap:wrap; align-items:center; gap:6px 14px; margin:0 0 16px; padding:10px 12px; border:1px solid rgba(103,232,249,.28); border-radius:12px; background:rgba(8,35,46,.58); color:#dff9ff; font-size:12px; }
    .column-controls > span { color:#fef3c7; font-weight:800; text-transform:uppercase; letter-spacing:.06em; }
    .column-controls ion-checkbox { --checkbox-background:transparent; --border-color:rgba(186,230,253,.65); --border-color-checked:#67e8f9; --checkbox-background-checked:#0e7490; font-size:12px; }
    .table-wrap { overflow-x: auto; border: 1px solid rgba(255,255,255,.15); border-radius: 16px; background: rgba(15,23,42,.72); }
    table { width: 100%; min-width: 1480px; border-collapse: collapse; color: #e2e8f0; }
    th, td { padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,.1); text-align: left; vertical-align: middle; }
    thead th { position: sticky; top: 0; z-index: 1; color: #fef3c7; background: #1e293b; font-size: 12px; letter-spacing: .04em; text-transform: uppercase; }
    tbody tr:nth-child(even) { background: rgba(148,163,184,.06); }
    tbody tr:hover { background: rgba(125,211,252,.12); }
    .effect-icons { display: flex; min-height: 28px; align-items: center; gap: 5px; }
    .effect-icons ui-sprite { display: inline-block; width: 28px; height: 28px; flex: 0 0 28px; cursor: help; }
    .generation-trace, .diagnostics { white-space: pre-line; font-size: 12px; line-height: 1.45; min-width: 240px; }
    .diagnostics { min-width: 380px; color: #fde68a; }
    table.hide-level :is(th,td):nth-child(1), table.hide-gems :is(th,td):nth-child(2), table.hide-specials :is(th,td):nth-child(3), table.hide-gem-effects :is(th,td):nth-child(4), table.hide-link-effects :is(th,td):nth-child(5), table.hide-area-effects :is(th,td):nth-child(6), table.hide-generation :is(th,td):nth-child(7), table.hide-impulses :is(th,td):nth-child(8), table.hide-complexity :is(th,td):nth-child(9), table.hide-diagnostics :is(th,td):nth-child(10), table.hide-attempts :is(th,td):nth-child(11) { display:none; }
    .empty { color: #64748b; }
  `],
})
export class RdnEffectsSummaryPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly catalogue = inject(RdnCatalogueService);
  readonly variant = (this.route.snapshot.data["variant"] === "time-attack" ? "time-attack" : "adventure") as SummaryVariant;
  readonly rows = signal<readonly import("../../../core/game/phaser/catalog.builder").PuzzleSolutionAudit[]>([]);
  readonly levels = signal<readonly import("../../../core/game/phaser/puzzle.types").LevelDefinition[]>([]);
  readonly versions = signal<readonly string[]>([]);
  readonly selectedVersion = signal("");
  readonly columns = SUMMARY_COLUMNS;
  readonly visibleColumns = signal<Record<SummaryColumn, boolean>>({ level: true, gems: true, specials: true, gemEffects: true, linkEffects: true, areaEffects: true, generation: true, impulses: true, complexity: true, attempts: false, diagnostics: false });
  readonly title = computed(() => this.variant === "adventure" ? "Effetti RDN · Avventura" : "Effetti RDN · Time Attack");
  readonly description = computed(() => `Panoramica compatta dei ${RDN_MAX_LEVEL} livelli. Passa sulle icone per nome e intensita dell'effetto.`);

  gemEffects(effects: readonly ResolvedEffect[]): readonly ResolvedEffect[] { return effects.filter((effect) => effect.config.scope === EffectScope.GEM); }
  linkEffects(effects: readonly ResolvedEffect[]): readonly ResolvedEffect[] { return effects.filter((effect) => effect.config.scope === EffectScope.LINK); }
  areaEffects(effects: readonly ResolvedEffect[]): readonly ResolvedEffect[] { return effects.filter((effect) => effect.config.scope === EffectScope.AREA); }
  isColumnVisible(column: SummaryColumn): boolean { return this.visibleColumns()[column]; }
  setColumnVisible(column: SummaryColumn, visible: boolean): void { this.visibleColumns.update((current) => ({ ...current, [column]: visible })); }
  ngOnInit(): void { void this.catalogue.versions().then((catalogues) => { const versions = catalogues.map((catalogue) => catalogue.version); this.versions.set(versions); if (versions[0]) this.selectVersion(versions[0]); }); }
  selectVersion(version: string): void { if (!version || version === this.selectedVersion()) return; this.selectedVersion.set(version); void Promise.all([this.catalogue.audit(this.variant, version), this.catalogue.levels(version)]).then(([rows, levels]) => { this.rows.set(rows); this.levels.set(levels); }); }
  generationStats(level: number) { return this.levels().find((item) => item.number === level && item.variant === (this.variant === "adventure" ? "persistent" : "loader"))?.generation?.generationStats; }
  specialOperators(level: number): readonly Exclude<PuzzleOperator, number>[] { const item = this.levels().find((candidate) => candidate.number === level && candidate.variant === (this.variant === "adventure" ? "persistent" : "loader")); if (!item) return []; return item.generation?.specialOperators ?? [...new Set((item.solutionMoves ?? []).map((move) => move.operator).filter((operator): operator is Exclude<PuzzleOperator, number> => typeof operator !== "number"))]; }
  specialOperatorFrame(operator: Exclude<PuzzleOperator, number>): { name: string; effect: "none" } { return { name: operator === "divide2" ? "divide-2" : operator === "divide3" ? "divide-3" : operator === "zero" ? "reset-zero" : operator === "skip" ? "skip-flow" : "effect-inverter", effect: "none" }; }
  specialOperatorAtlas(operator: Exclude<PuzzleOperator, number>): "effects" | "effect-actions" { return operator === "invert" ? "effects" : "effect-actions"; }
  specialOperatorTitle(operator: Exclude<PuzzleOperator, number>): string { return operator === "divide2" ? "Divisione per 2" : operator === "divide3" ? "Divisione per 3" : operator === "zero" ? "Azzeramento" : operator === "skip" ? "Salta flusso" : "Inverti segno"; }
  attemptsText(level: number): string { const stats = this.generationStats(level); if (!stats) return "—"; const solutionAttempts = stats.solutionAttempts ?? stats.calibrationAttempts; return `strutt. ${stats.structureAttempts} (lim. ${stats.structureAttemptsBeforeScaling ?? "—"}/stadio) · sol. ${solutionAttempts} (lim. ${stats.solutionAttemptsBeforeScaling ?? "—"}/candidato)`; }
  generationSummary(level: number): string {
    const stats = this.generationStats(level);
    if (!stats) return "—";
    const calibrations = stats.solutionAttempts ?? stats.calibrationAttempts;
    const trace = stats.trace;
    if (!trace) return `Strutture valutate: ${stats.structureAttempts}\nCalibrazioni: ${calibrations}`;
    const filtered = trace.stages.reduce((total, stage) => total + stage.policyRejectedCandidates, 0);
    const average = stats.structureAttempts ? (calibrations / stats.structureAttempts).toFixed(2) : "0";
    const resolved = trace.resolvedAt ? `Stadio risolutivo: ${trace.resolvedAt.stage}/${trace.stageCount} · conf. ${trace.resolvedAt.configuration} · pos. ${trace.resolvedAt.placement} · var. ${trace.resolvedAt.variation}` : `Stadi completati: ${trace.stageCount}`;
    const stages = trace.stages.map((stage) => `S${stage.stage}: conf. ${stage.configurations}, pos. ${stage.placementVariants}, candidati ${stage.candidateVariants}, filtrati ${stage.policyRejectedCandidates}, strutture ${stage.evaluatedStructures}, calibrazioni ${stage.calibrationAttempts}`).join("\n");
    return `${resolved}\nStrutture valutate: ${stats.structureAttempts}\nBudget: ${stats.structureAttemptsBeforeScaling ?? "—"} / configurazione-posizione\nCalibrazioni: ${calibrations} (media ${average}/struttura)\nBudget: ${stats.solutionAttemptsBeforeScaling ?? "—"} / struttura\nFiltrate dalla policy: ${filtered}\n${stages}`;
  }
  officialSolutionImpulses(level: number): number | undefined { const item = this.levels().find((candidate) => candidate.number === level && candidate.variant === (this.variant === "adventure" ? "persistent" : "loader")); return item?.generation?.officialSolutionImpulses ?? item?.starCost?.impulses ?? item?.optimalCost?.impulses; }
  failureText(level: number): string { const reasons = this.generationStats(level)?.failureReasons ?? []; return reasons.length ? reasons.join(", ") : "OK"; }
  diagnosticSummary(level: number): string {
    const stats = this.generationStats(level);
    if (!stats) return "—";
    if (!stats.trace) return this.failureText(level);
    if (!stats.trace.diagnostics.length) return "OK";
    const context = (value: { phase: string; stage: number; configuration: number; placement: number; variation: number; presets: readonly string[] }) => `${value.phase === "combination-filter" ? "filtro" : "calibrazione"} S${value.stage}/C${value.configuration}/P${value.placement}/V${value.variation}${value.presets.length ? ` [${value.presets.join(", ")}]` : ""}`;
    return stats.trace.diagnostics.map((diagnostic) => `${diagnostic.code} ×${diagnostic.count}\n  prima: ${context(diagnostic.first)}\n  ultima: ${context(diagnostic.last)}`).join("\n");
  }
  effectFrame(effect: ResolvedEffect) { return { name: effectAssetFrame(effect), effect: "none" as const }; }
  effectAtlas(effect: ResolvedEffect) { return effectAssetAtlasSource(effect); }

  effectTooltip(effect: ResolvedEffect): string {
    const config = effect.config;
    if ("strength" in config && config.strength !== undefined) return `${config.type} · Forza ${config.strength}`;
    if ("multiplier" in config && config.multiplier !== undefined) return `${config.type} · ×${config.multiplier}`;
    if ("turns" in config && config.turns !== undefined) return `${config.type} · ${config.turns} impulsi`;
    if ("amount" in config && config.amount !== undefined) return `${config.type} · Intensita ${config.amount}`;
    if ("value" in config && config.value !== undefined) return `${config.type} · Forza ${config.value > 0 ? "+" : ""}${config.value}`;
    return config.type;
  }
}
