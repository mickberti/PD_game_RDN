import { CommonModule } from "@angular/common";
import { Component, computed, inject, OnInit, signal } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { IonContent, IonFooter, IonSelect, IonSelectOption, IonToolbar } from "@ionic/angular/standalone";
import { EffectScope, ResolvedEffect } from "../../../core/game/phaser/effects/effects.models";
import { PuzzleOperator } from "../../../core/game/phaser/puzzle.types";
import { effectAssetFrame } from "../../../core/game/phaser/effects/effect-presentation.config";
import { RDN_MAX_LEVEL } from "../../../core/game/phaser/config/levels.config";
import { RdnCatalogueService } from "../../../core/services/gameplay/rdn-catalogue.service";
import { UiSpriteComponent } from "../../../shared/basic/ui-sprite.component";
import { UIBottomUtilsComponent } from "../../../shared/components/ui-bottom-utils.component";
import { UiUtilsPageHeaderComponent } from "../../../shared/components/ui-utils-page-header.component";

type SummaryVariant = "adventure" | "time-attack";

@Component({
  selector: "app-rnd-effects-summary",
  standalone: true,
  imports: [CommonModule, IonContent, IonFooter, IonSelect, IonSelectOption, IonToolbar, UIBottomUtilsComponent, UiUtilsPageHeaderComponent, UiSpriteComponent],
  template: `
    <ion-content>
      <div class="screen effects-summary-page">
        <ui-utils-page-header group="game" [title]="title()" [description]="description()" />
        <ion-select class="catalogue-selector" label="Versione catalogo" label-placement="stacked" interface="popover" [value]="selectedVersion()" (ionChange)="selectVersion($event.detail.value)">
          @for (version of versions(); track version) { <ion-select-option [value]="version">{{ version }}</ion-select-option> }
        </ion-select>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Livello</th>
                <th scope="col">Gemme</th>
                <th scope="col">Speciali</th>
                <th scope="col">Effetti gemma</th>
                <th scope="col">Effetti link</th>
                <th scope="col">Effetti area</th>
                <th scope="col">Generazione</th>
                <th scope="col">Tentativi</th>
                <th scope="col">Impulsi ★★★</th>
                <th scope="col">Complessita</th>
                <th scope="col">Diagnostica</th>
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
                  <td>{{ attemptsText(row.level) }}</td>
                  <td>{{ officialSolutionImpulses(row.level) ?? '-' }}</td>
                  <td>{{ generationStats(row.level)?.totalComplexity ?? '-' }}</td>
                  <td [title]="failureText(row.level)">{{ failureText(row.level) }}</td>
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
    .table-wrap { overflow-x: auto; border: 1px solid rgba(255,255,255,.15); border-radius: 16px; background: rgba(15,23,42,.72); }
    table { width: 100%; min-width: 1260px; border-collapse: collapse; color: #e2e8f0; }
    th, td { padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,.1); text-align: left; vertical-align: middle; }
    thead th { position: sticky; top: 0; z-index: 1; color: #fef3c7; background: #1e293b; font-size: 12px; letter-spacing: .04em; text-transform: uppercase; }
    tbody tr:nth-child(even) { background: rgba(148,163,184,.06); }
    tbody tr:hover { background: rgba(125,211,252,.12); }
    .effect-icons { display: flex; min-height: 28px; align-items: center; gap: 5px; }
    .effect-icons ui-sprite { display: inline-block; width: 28px; height: 28px; flex: 0 0 28px; cursor: help; }
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
  readonly title = computed(() => this.variant === "adventure" ? "Effetti RDN · Avventura" : "Effetti RDN · Time Attack");
  readonly description = computed(() => `Panoramica compatta dei ${RDN_MAX_LEVEL} livelli. Passa sulle icone per nome e intensita dell'effetto.`);

  gemEffects(effects: readonly ResolvedEffect[]): readonly ResolvedEffect[] { return effects.filter((effect) => effect.config.scope === EffectScope.GEM); }
  linkEffects(effects: readonly ResolvedEffect[]): readonly ResolvedEffect[] { return effects.filter((effect) => effect.config.scope === EffectScope.LINK); }
  areaEffects(effects: readonly ResolvedEffect[]): readonly ResolvedEffect[] { return effects.filter((effect) => effect.config.scope === EffectScope.AREA); }
  ngOnInit(): void { void this.catalogue.versions().then((catalogues) => { const versions = catalogues.map((catalogue) => catalogue.version); this.versions.set(versions); if (versions[0]) this.selectVersion(versions[0]); }); }
  selectVersion(version: string): void { if (!version || version === this.selectedVersion()) return; this.selectedVersion.set(version); void Promise.all([this.catalogue.audit(this.variant, version), this.catalogue.levels(version)]).then(([rows, levels]) => { this.rows.set(rows); this.levels.set(levels); }); }
  generationStats(level: number) { return this.levels().find((item) => item.number === level && item.variant === (this.variant === "adventure" ? "persistent" : "loader"))?.generation?.generationStats; }
  specialOperators(level: number): readonly Exclude<PuzzleOperator, number>[] { const item = this.levels().find((candidate) => candidate.number === level && candidate.variant === (this.variant === "adventure" ? "persistent" : "loader")); if (!item) return []; return item.generation?.specialOperators ?? [...new Set((item.solutionMoves ?? []).map((move) => move.operator).filter((operator): operator is Exclude<PuzzleOperator, number> => typeof operator !== "number"))]; }
  specialOperatorFrame(operator: Exclude<PuzzleOperator, number>): { name: string; effect: "none" } { return { name: operator === "divide2" ? "divide-2" : operator === "divide3" ? "divide-3" : operator === "zero" ? "reset-zero" : operator === "skip" ? "skip-flow" : "effect-inverter", effect: "none" }; }
  specialOperatorAtlas(operator: Exclude<PuzzleOperator, number>): "effects" | "effect-actions" { return operator === "invert" ? "effects" : "effect-actions"; }
  specialOperatorTitle(operator: Exclude<PuzzleOperator, number>): string { return operator === "divide2" ? "Divisione per 2" : operator === "divide3" ? "Divisione per 3" : operator === "zero" ? "Azzeramento" : operator === "skip" ? "Salta flusso" : "Inverti segno"; }
  attemptsText(level: number): string { const stats = this.generationStats(level); if (!stats) return "—"; const solutionAttempts = stats.solutionAttempts ?? stats.calibrationAttempts; return `strutt. ${stats.structureAttempts} (lim. ${stats.structureAttemptsBeforeScaling ?? "—"}/stadio) · sol. ${solutionAttempts} (lim. ${stats.solutionAttemptsBeforeScaling ?? "—"}/candidato)`; }
  officialSolutionImpulses(level: number): number | undefined { const item = this.levels().find((candidate) => candidate.number === level && candidate.variant === (this.variant === "adventure" ? "persistent" : "loader")); return item?.generation?.officialSolutionImpulses ?? item?.starCost?.impulses ?? item?.optimalCost?.impulses; }
  failureText(level: number): string { const reasons = this.generationStats(level)?.failureReasons ?? []; return reasons.length ? reasons.join(", ") : "OK"; }
  effectFrame(effect: ResolvedEffect) { return { name: effectAssetFrame(effect), effect: "none" as const }; }

  effectTooltip(effect: ResolvedEffect): string {
    const config = effect.config;
    if ("strength" in config && config.strength !== undefined) return `${config.type} · Forza ${config.strength}`;
    if ("multiplier" in config && config.multiplier !== undefined) return `${config.type} · ×${config.multiplier}`;
    if ("turns" in config && config.turns !== undefined) return `${config.type} · ${config.turns} impulsi`;
    if ("amount" in config && config.amount !== undefined) return `${config.type} · Intensita ${config.amount}`;
    return config.type;
  }
}
