import { CommonModule } from "@angular/common";
import { Component, computed, inject } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { IonContent, IonFooter, IonToolbar } from "@ionic/angular/standalone";
import { EffectScope, ResolvedEffect } from "../../../core/game/rnd/effects/effects.models";
import { effectAssetFrame } from "../../../core/game/rnd/effects/effect-presentation.config";
import { getRdnSolutionTable, RDN_LEVELS, RDN_MAX_LEVEL } from "../../../core/game/rnd/levels.config";
import { UiSpriteComponent } from "../../../shared/basic/ui-sprite.component";
import { UIBottomUtilsComponent } from "../../../shared/components/ui-bottom-utils.component";
import { UiUtilsPageHeaderComponent } from "../../../shared/components/ui-utils-page-header.component";

type SummaryVariant = "adventure" | "time-attack";

@Component({
  selector: "app-rnd-effects-summary",
  standalone: true,
  imports: [CommonModule, IonContent, IonFooter, IonToolbar, UIBottomUtilsComponent, UiUtilsPageHeaderComponent, UiSpriteComponent],
  template: `
    <ion-content>
      <div class="screen effects-summary-page">
        <ui-utils-page-header group="game" [title]="title()" [description]="description()" />

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Livello</th>
                <th scope="col">Gemme</th>
                <th scope="col">Effetti gemma</th>
                <th scope="col">Effetti link</th>
                <th scope="col">Effetti area</th>
                <th scope="col">Generazione</th>
                <th scope="col">Tentativi</th>
                <th scope="col">Complessita</th>
                <th scope="col">Diagnostica</th>
              </tr>
            </thead>
            <tbody>
              @for (row of rows(); track row.level) {
                <tr>
                  <th scope="row">{{ row.level }}</th>
                  <td>{{ row.slots.length }}</td>
                  <td><span class="effect-icons">@for (effect of gemEffects(row.effects); track effect.id) { <ui-sprite [frame]="effectFrame(effect)" atlasSource="effects" [showScale]="false" [title]="effectTooltip(effect)" /> } @empty { <span class="empty">—</span> }</span></td>
                  <td><span class="effect-icons">@for (effect of linkEffects(row.effects); track effect.id) { <ui-sprite [frame]="effectFrame(effect)" atlasSource="effects" [showScale]="false" [title]="effectTooltip(effect)" /> } @empty { <span class="empty">—</span> }</span></td>
                  <td><span class="effect-icons">@for (effect of areaEffects(row.effects); track effect.id) { <ui-sprite [frame]="effectFrame(effect)" atlasSource="effects" [showScale]="false" [title]="effectTooltip(effect)" /> } @empty { <span class="empty">—</span> }</span></td>
                  <td>{{ generationStats(row.level)?.elapsedMs?.toFixed(1) ?? '-' }} ms</td>
                  <td>{{ generationStats(row.level)?.structureAttempts ?? 0 }} strutt. / {{ generationStats(row.level)?.calibrationAttempts ?? 0 }} val.</td>
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
    .table-wrap { overflow-x: auto; border: 1px solid rgba(255,255,255,.15); border-radius: 16px; background: rgba(15,23,42,.72); }
    table { width: 100%; min-width: 1120px; border-collapse: collapse; color: #e2e8f0; }
    th, td { padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,.1); text-align: left; vertical-align: middle; }
    thead th { position: sticky; top: 0; z-index: 1; color: #fef3c7; background: #1e293b; font-size: 12px; letter-spacing: .04em; text-transform: uppercase; }
    tbody tr:nth-child(even) { background: rgba(148,163,184,.06); }
    tbody tr:hover { background: rgba(125,211,252,.12); }
    .effect-icons { display: flex; min-height: 28px; align-items: center; gap: 5px; }
    .effect-icons ui-sprite { display: inline-block; width: 28px; height: 28px; flex: 0 0 28px; cursor: help; }
    .empty { color: #64748b; }
  `],
})
export class RdnEffectsSummaryPage {
  private readonly route = inject(ActivatedRoute);
  readonly variant = (this.route.snapshot.data["variant"] === "time-attack" ? "time-attack" : "adventure") as SummaryVariant;
  readonly rows = computed(() => getRdnSolutionTable(this.variant));
  readonly title = computed(() => this.variant === "adventure" ? "Effetti RDN · Avventura" : "Effetti RDN · Time Attack");
  readonly description = computed(() => `Panoramica compatta dei ${RDN_MAX_LEVEL} livelli. Passa sulle icone per nome e intensita dell'effetto.`);

  gemEffects(effects: readonly ResolvedEffect[]): readonly ResolvedEffect[] { return effects.filter((effect) => effect.config.scope === EffectScope.GEM); }
  linkEffects(effects: readonly ResolvedEffect[]): readonly ResolvedEffect[] { return effects.filter((effect) => effect.config.scope === EffectScope.LINK); }
  areaEffects(effects: readonly ResolvedEffect[]): readonly ResolvedEffect[] { return effects.filter((effect) => effect.config.scope === EffectScope.AREA); }
  generationStats(level: number) { return RDN_LEVELS.find((item) => item.number === level && item.variant === (this.variant === "adventure" ? "persistent" : "loader"))?.generation?.generationStats; }
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
