import { CommonModule } from "@angular/common";
import { Component, computed, inject, OnInit, signal } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { IonContent, IonFooter, IonSelect, IonSelectOption, IonToolbar } from "@ionic/angular/standalone";
import { PuzzleOperator } from "../../../core/game/phaser/puzzle.types";
import { EffectScope, ResolvedEffect } from "../../../core/game/phaser/effects/effects.models";
import { effectAssetFrame } from "../../../core/game/phaser/effects/effect-presentation.config";
import { UiSpriteComponent } from "../../../shared/basic/ui-sprite.component";
import { RDN_MAX_LEVEL } from "../../../core/game/phaser/config/levels.config";
import { RdnCatalogueService } from "../../../core/services/gameplay/rdn-catalogue.service";
import { UIBottomUtilsComponent } from "../../../shared/components/ui-bottom-utils.component";
import { UiUtilsPageHeaderComponent } from "../../../shared/components/ui-utils-page-header.component";

type SolutionVariant = "adventure" | "time-attack";

@Component({
  selector: "app-rnd-solution-table",
  standalone: true,
  imports: [CommonModule, IonContent, IonFooter, IonSelect, IonSelectOption, IonToolbar, UIBottomUtilsComponent, UiUtilsPageHeaderComponent, UiSpriteComponent],
  template: `
    <ion-content>
      <div class="screen solution-page">
        <ui-utils-page-header group="game" [title]="title()" [description]="description()" />
        <ion-select class="catalogue-selector" label="Versione catalogo" label-placement="stacked" interface="popover" [value]="selectedVersion()" (ionChange)="selectVersion($event.detail.value)">
          @for (version of versions(); track version) { <ion-select-option [value]="version">{{ version }}</ion-select-option> }
        </ion-select>

        <section class="summary">
          <strong>{{ rows().length }} livelli</strong>
          <span>·</span>
          <strong [class.invalid]="!allVerified()">{{ allVerified() ? 'Tutte le soluzioni verificate' : 'Verifica fallita' }}</strong>
          <span>·</span>
          <span>Apri un livello per vedere valori, operatori e rotazioni ottimali.</span>
        </section>

        @for (row of rows(); track row.level) {
          <details class="level-card">
            <summary>
              <span>Livello {{ row.level }}</span>
              <span>{{ row.slots.length }} castoni · {{ row.moves.length }} impulsi</span>
              <b [class.invalid]="!row.verified">{{ row.verified ? '✓ verificato' : '✕ non valido' }}</b>
              @if (hasEffectsInPlay(row.effects, row.providedOperators)) {
                <span class="effects-in-play" aria-label="Effetti in gioco">
                  @if (gemEffects(row.effects).length) {
                    <span class="effects-in-play__row">
                      <strong>Gemma</strong>
                      <span class="effect-chip" *ngFor="let effect of gemEffects(row.effects); trackBy: trackEffect">
                        <ui-sprite class="effect-icon effect-icon--summary" [frame]="effectFrame(effect)" atlasSource="effects" [showScale]="false" [title]="effect.config.type"></ui-sprite>
                        <span>{{ effect.config.type }}</span><small>{{ effectTarget(effect) }}</small>
                      </span>
                    </span>
                  }
                  @if (linkEffects(row.effects).length) {
                    <span class="effects-in-play__row">
                      <strong>Link</strong>
                      <span class="effect-chip" *ngFor="let effect of linkEffects(row.effects); trackBy: trackEffect">
                        <ui-sprite class="effect-icon effect-icon--summary" [frame]="effectFrame(effect)" atlasSource="effects" [showScale]="false" [title]="effect.config.type"></ui-sprite>
                        <span>{{ effect.config.type }}</span><small>{{ effectTarget(effect) }}</small>
                      </span>
                    </span>
                  }
                  @if (specialOperators(row.providedOperators).length) {
                    <span class="effects-in-play__row">
                      <strong>Operatore</strong>
                      @for (special of specialOperators(row.providedOperators); track special) {
                        <span class="effect-chip effect-chip--operator"><span>{{ operator(special) }}</span><small>Speciale nel gear</small></span>
                      }
                    </span>
                  }
                </span>
              }
            </summary>
            <div class="card-content">
              <section class="provided"><h2>Operatori disponibili nel gear</h2><p>{{ operators(row.providedOperators) }}</p></section>
              <section class="effects">
                <h2>Effetti applicati</h2>
                @if (row.effects.length) {
                  <p class="effect-intro">Durante ogni impulso gli effetti possono modificare il flusso prima dell'operazione, trasformare il risultato oppure intervenire al termine dell'impulso sulle gemme coinvolte.</p>
                  <ul>
                    @for (effect of row.effects; track effect.id) {
                      <li><ui-sprite class="effect-icon" [frame]="effectFrame(effect)" atlasSource="effects" [showScale]="false" [title]="effect.config.type"></ui-sprite><div><b>{{ effect.config.type }}</b><span>{{ effectTarget(effect) }}</span><small>{{ effectExplanation(effect) }}</small></div></li>
                    }
                  </ul>
                } @else {
                  <p>Nessun effetto applicato.</p>
                }
                <small>Simulazione motore: {{ values(row.finalValues) }}</small>
              </section>
              <section class="slot-details">
                <h2>Valori esterni e sequenza per castone</h2>
                <ol class="slots">
                  @for (slot of row.slots; track $index) {
                    <li>
                      <div class="slot-gem">
                        <b>Gemma C{{ $index + 1 }}</b>
                        <span class="slot-start-value">Valore iniziale: {{ slot.startValue }}</span>
                        @if (effectsForGem(row.effects, $index).length) {
                          <span class="inline-effects">
                            @for (effect of effectsForGem(row.effects, $index); track effect.id) {
                              <ui-sprite class="effect-icon effect-icon--inline" [frame]="effectFrame(effect)" atlasSource="effects" [showScale]="false" [title]="effect.config.type"></ui-sprite>
                            }
                          </span>
                        }
                      </div>
                      <div class="slot-sequence">
                        <span class="slot-sequence__label">Sequenza</span>
                        <span class="slot-sequence__steps">
                          @for (step of slot.operators; track $index) {
                            <span class="slot-sequence__step"><span class="slot-sequence__operator">{{ operator(step) }}</span><span aria-hidden="true">→</span></span>
                          }
                          <span class="slot-sequence__result">0</span>
                        </span>
                      </div>
                    </li>
                  }
                </ol>
              </section>
              <section>
                <h2>Sequenza globale</h2>
                <ol class="moves">
                  @for (step of row.execution; track $index) {
                    <li>
                      <span class="move-main">
                        @for (effect of effectsForGem(row.effects, step.move.outerIndex); track effect.id) {
                          <ui-sprite class="effect-icon effect-icon--inline" [frame]="effectFrame(effect)" atlasSource="effects" [showScale]="false" [title]="effect.config.type"></ui-sprite>
                        }
                        #{{ $index + 1 }} · C{{ step.move.outerIndex + 1 }} · rotazione {{ step.move.rotation }} · {{ operator(step.move.operator) }}
                      </span>
                      @for (update of step.updates; track update.outerIndex) {
                        <span class="move-update" [class.move-update--link]="update.viaLink">
                          @if (update.viaLink) {
                            @for (effect of linkEffectsForGem(row.effects, update.outerIndex); track effect.id) {
                              <ui-sprite class="effect-icon effect-icon--inline" [frame]="effectFrame(effect)" atlasSource="effects" [showScale]="false" [title]="effect.config.type"></ui-sprite>
                            }
                          }
                          C{{ update.outerIndex + 1 }} = {{ update.value }}{{ update.viaLink ? ' (link)' : '' }}
                        </span>
                      }
                    </li>
                  }
                </ol>
              </section>
            </div>
          </details>
        }
      </div>
    </ion-content>
    <ion-footer><ion-toolbar><ui-bottom-utils /></ion-toolbar></ion-footer>
  `,
  styles: [`
    .solution-page { padding-bottom: 96px; }
    .catalogue-selector { max-width: 240px; margin: 16px 0 0; border: 1px solid rgba(103, 232, 249, .35); border-radius: 12px; padding: 0 12px; color: #dff9ff; background: rgba(8, 35, 46, .72); }
    .summary { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 16px 0; padding: 14px; border: 1px solid rgba(103, 232, 249, .35); border-radius: 14px; color: #dff9ff; background: rgba(8, 35, 46, .72); }
    .level-card { margin: 10px 0; overflow: hidden; border: 1px solid rgba(255, 255, 255, .18); border-radius: 14px; color: #ecfeff; background: rgba(15, 23, 42, .9); }
    summary { display: grid; grid-template-columns: minmax(110px, 1fr) minmax(130px, 1fr) auto; gap: 12px; padding: 15px; cursor: pointer; font-weight: 700; }
    summary b { color: #7cf0ae; } .invalid { color: #fb7185 !important; }
    .card-content { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 18px; padding: 0 16px 16px; border-top: 1px solid rgba(255, 255, 255, .12); }
    .slot-details { grid-column: 1 / -1; }
    h2 { margin: 16px 0 8px; color: #f8d77c; font-size: 15px; }
    .slots, .moves { display: grid; gap: 6px; margin: 0; padding-left: 22px; }
    .slots { grid-template-columns: minmax(0, 1fr); grid-auto-flow: row; width: 100%; padding-left: 0; list-style: none; gap: 10px; }
    .slots li { display: grid; width: 100%; gap: 7px; min-width: 0; border: 1px solid rgba(125, 211, 252, .18); border-radius: 10px; padding: 10px; background: rgba(14, 116, 144, .12); }
    .slot-gem { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; } .slot-gem b { color: #7dd3fc; } .slot-start-value { color: #dbeafe; font-weight: 700; }
    .slot-sequence { display: flex; align-items: flex-start; gap: 8px; min-width: 0; } .slot-sequence__label { flex: 0 0 64px; color: #94a3b8; font-size: .76rem; font-weight: 800; text-transform: uppercase; }
    .slot-sequence__steps { display: flex; flex: 1 1 auto; flex-wrap: wrap; align-items: center; gap: 5px; min-width: 0; color: #cbd5e1; }
    .slot-sequence__step { display: inline-flex; align-items: center; gap: 5px; } .slot-sequence__operator, .slot-sequence__result { border-radius: 6px; padding: 2px 6px; color: #ecfeff; background: rgba(30, 41, 59, .86); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-weight: 800; } .slot-sequence__result { color: #7cf0ae; background: rgba(22, 101, 52, .48); }
    .provided p { margin: 0; color: #a7f3d0; font-weight: 800; letter-spacing: .04em; }
    .effects-in-play { display: grid; grid-column: 1 / -1; gap: 7px; padding-top: 10px; border-top: 1px solid rgba(255, 255, 255, .12); }
    .effects-in-play__row { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
    .effects-in-play__row > strong { width: 76px; color: #f8d77c; font-size: .72rem; letter-spacing: .08em; text-transform: uppercase; }
    .effect-chip { display: inline-flex; align-items: center; gap: 4px; min-height: 27px; border: 1px solid rgba(196, 181, 253, .42); border-radius: 999px; padding: 2px 8px 2px 3px; color: #e9ddff; background: rgba(91, 59, 146, .2); font-size: .72rem; }
    .effect-chip small { color: #a5b4fc; font-size: .68rem; } .effect-chip--operator { border-color: rgba(125, 211, 252, .42); color: #d9f5ff; background: rgba(14, 116, 144, .2); padding-left: 8px; }
    ui-sprite.effect-icon { display: inline-block; width: 32px; height: 32px; flex: 0 0 32px; } ui-sprite.effect-icon--summary { width: 22px; height: 22px; flex-basis: 22px; } ui-sprite.effect-icon--inline { width: 20px; height: 20px; flex-basis: 20px; vertical-align: middle; }
    .inline-effects, .move-main { display: inline-flex; align-items: center; gap: 3px; } .inline-effects { flex: 0 0 auto; }
    .effects ul { display: grid; gap: 10px; margin: 0; padding: 0; list-style: none; } .effects li { display: flex; gap: 9px; align-items: flex-start; } .effects li > div { display: grid; gap: 2px; } .effects b { color: #c4b5fd; } .effects span, .effects small { display: block; color: #cbd5e1; } .effects li small { color: #a5b4fc; line-height: 1.35; } .effects p, .effects > small { display: block; margin: 0; color: #cbd5e1; } .effects .effect-intro { margin: 0 0 10px; color: #dbeafe; line-height: 1.4; } .effects > small { margin-top: 10px; color: #7cf0ae; }
    .moves { max-height: 260px; overflow: auto; color: #cbd5e1; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; } .moves li { display: flex; flex-wrap: wrap; align-items: center; gap: 5px 8px; } .move-update { display: inline-flex; align-items: center; gap: 3px; color: #a7f3d0; } .move-update--link { color: #c4b5fd; }
    @media (max-width: 500px) { summary { grid-template-columns: 1fr auto; } .effects-in-play__row > strong { width: 100%; } }
  `],
})
export class RdnSolutionTablePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly catalogue = inject(RdnCatalogueService);
  readonly variant = (this.route.snapshot.data["variant"] === "time-attack" ? "time-attack" : "adventure") as SolutionVariant;
  readonly rows = signal<readonly import("../../../core/game/phaser/catalog.builder").PuzzleSolutionAudit[]>([]);
  readonly versions = signal<readonly string[]>([]);
  readonly selectedVersion = signal("");
  ngOnInit(): void { void this.catalogue.versions().then((catalogues) => { const versions = catalogues.map((catalogue) => catalogue.version); this.versions.set(versions); if (versions[0]) this.selectVersion(versions[0]); }); }
  selectVersion(version: string): void { if (!version || version === this.selectedVersion()) return; this.selectedVersion.set(version); void this.catalogue.audit(this.variant, version).then((rows) => this.rows.set(rows)); }
  readonly allVerified = computed(() => this.rows().every((row) => row.verified));
  readonly title = computed(() => this.variant === "adventure" ? "Soluzioni RDN · Avventura" : "Soluzioni RDN · Time Attack");
  readonly description = computed(() => `Catalogo dei ${RDN_MAX_LEVEL} livelli, con sequenze per castone, rotazioni richieste e controllo di risolvibilità.`);

  operator(value: PuzzleOperator): string { return value === "divide2" ? "÷2" : value === "divide3" ? "÷3" : value === "zero" ? "0" : value === "invert" ? "±" : value === "skip" ? "≫" : value > 0 ? `+${value}` : String(value); }
  operators(values: readonly PuzzleOperator[]): string { return values.map((value) => this.operator(value)).join(" · "); }
  values(values: readonly number[]): string { return values.join(" · "); }
  effectTarget(effect: ResolvedEffect): string {
    if (effect.target.type === EffectScope.GEM) return `Gemma C${effect.target.gem.index + 1}`;
    if (effect.target.type === EffectScope.LINK) return `Link C${effect.target.fromGem.index + 1} → C${effect.target.toGem.index + 1}`;
    return `Area da C${effect.target.sourceGem.index + 1}`;
  }
  effectFrame(effect: ResolvedEffect) { return { name: effectAssetFrame(effect), effect: "none" as const }; }
  gemEffects(effects: readonly ResolvedEffect[]): readonly ResolvedEffect[] { return effects.filter((effect) => effect.config.scope === EffectScope.GEM || effect.config.scope === EffectScope.AREA); }
  linkEffects(effects: readonly ResolvedEffect[]): readonly ResolvedEffect[] { return effects.filter((effect) => effect.config.scope === EffectScope.LINK); }
  specialOperators(operators: readonly PuzzleOperator[]): readonly Exclude<PuzzleOperator, number>[] { return operators.filter((operator): operator is Exclude<PuzzleOperator, number> => typeof operator !== "number"); }
  hasEffectsInPlay(effects: readonly ResolvedEffect[], operators: readonly PuzzleOperator[]): boolean { return effects.length > 0 || this.specialOperators(operators).length > 0; }
  trackEffect(_: number, effect: ResolvedEffect): string { return effect.id; }
  effectsForGem(effects: readonly ResolvedEffect[], gemIndex: number): readonly ResolvedEffect[] {
    return effects.filter((effect) => effect.target.type === EffectScope.GEM ? effect.target.gem.index === gemIndex : effect.target.type === EffectScope.LINK ? effect.target.fromGem.index === gemIndex || effect.target.toGem.index === gemIndex : effect.target.sourceGem.index === gemIndex);
  }
  linkEffectsForGem(effects: readonly ResolvedEffect[], gemIndex: number): readonly ResolvedEffect[] {
    return effects.filter((effect) => effect.target.type === EffectScope.LINK && (effect.target.fromGem.index === gemIndex || effect.target.toGem.index === gemIndex));
  }
  effectExplanation(effect: ResolvedEffect): string {
    const config = effect.config;
    if (config.type === "SHIELD") return `Prima dell'operazione assorbe fino a ${config.strength} punti del flusso in arrivo.`;
    if (config.type === "ICE") return `Fuoco attraversa la barriera senza consumarla, ghiaccio viene bloccato; gli altri impatti consumano i ${config.strength} colpi.`;
    if (config.type === "FIRE") return `Ghiaccio attraversa la barriera senza consumarla, fuoco viene bloccato; gli altri impatti consumano i ${config.strength} colpi.`;
    if (config.type === "WALL") return `I primi ${config.strength} impulsi in arrivo vengono bloccati; solo dopo il valore può cambiare.`;
    if (config.type === "MIRROR") return "Prima dell'operazione inverte il segno del flusso ricevuto dalla gemma.";
    if (config.type === "AMPLIFIER") return `Prima dell'operazione moltiplica il flusso ricevuto per ${config.multiplier}.`;
    if (config.type === "INVERTER") return "Dopo l'operazione inverte il segno del valore ottenuto dalla gemma.";
    if (config.type === "TIMER") return `Hai ${config.turns} impulsi diretti su questa gemma per portarla a zero; allo scadere il livello fallisce.`;
    if (config.type === "CORRUPTION") return `Alla fine dell'impulso aumenta il valore assoluto della gemma di ${config.amount}.`;
    if (config.type === "ECHO") return "Dopo l'arrivo del flusso lo propaga anche alla gemma collegata.";
    if (config.type === "AMPLIFY") return `Dopo l'arrivo del flusso lo propaga al link moltiplicato per ${config.multiplier ?? 1}.`;
    if (config.type === "CHAIN") return "La gemma di destinazione non riceve impulsi finché la gemma di origine del link non è risolta.";
    if (config.type === "INVERT") return "Dopo l'arrivo del flusso lo propaga al link con segno invertito.";
    const strength = config.scope === EffectScope.AREA ? config.strength ?? 1 : 1;
    return `Quando ${this.effectTarget(effect)} arriva a zero, colpisce le gemme vicine con forza ${strength}.`;
  }
}
