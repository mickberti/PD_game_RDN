import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, ParamMap, Router } from "@angular/router";
import { IonContent, IonFooter, IonToolbar } from "@ionic/angular/standalone";
import { buildStandaloneMinigamePayload } from "../../../core/game/minigames/minigame-launch.factory";
import {
  getDefaultMinigamePlugins,
  getMinigamePluginByEventType,
  getMinigamePluginByType,
  getMinigamePlugins,
  getMinigamePluginsByEventType,
  isRegisteredMinigameEventType,
  isRegisteredMinigameType,
} from "../../../core/game/minigames/minigame-plugin.registry";
import {
  buildEventMinigameModePreview,
  EVENT_MINIGAME_MODE_ORDER,
} from "../../../core/game/phaser/config/event-minigame-mode.config";
import { MinigameResult, MinigameType } from "../../../core/game/minigames/minigame.model";
import { GameEventType } from "../../../core/game/minigames/game-event.model";
import { PhaserEventMinigameModeId } from "../../../core/models/phaser-game-state.model";
import { HeroProgressService } from "../../../core/services/progression/hero-progress.service";
import { GameStateService } from "../../../core/services/state/game-state.service";
import { UIButtonComponent } from "../../../shared/basic/ui-button.component";
import { UiSpriteComponent } from "../../../shared/basic/ui-sprite.component";
import { UIBottomUtilsComponent } from "../../../shared/components/ui-bottom-utils.component";
import { UiUtilsPageHeaderComponent } from "../../../shared/components/ui-utils-page-header.component";
import { EmbeddedPhaserMinigameComponent } from "../../gameplay/embedded-phaser-minigame.component";
import { LoggerService } from "src/app/core/services/infrastructure/logging/logger.service";

@Component({
  selector: "app-minigame-player-page",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonFooter,
    IonToolbar,
    UIButtonComponent,
    UiSpriteComponent,
    UIBottomUtilsComponent,
    UiUtilsPageHeaderComponent,
    EmbeddedPhaserMinigameComponent,
  ],
  template: `
    <ion-content>
      <main class="minigame-player-screen">
        <ui-utils-page-header
          group="game"
          title="Minigame Player"
          description="Apre un solo minigioco per volta su una route dedicata, con implementazione caricata dal registry plugin esterno al core." />

        <section class="player-layout">
          <article class="player-panel">
            <div class="player-panel__header">
              <div>
                <h2>{{ activePlugin()?.label ?? "Minigame" }}</h2>
                <p>{{ activePlugin()?.description }}</p>
              </div>
              <ui-button variant="secondary" size="sm" (pressed)="goBack()">Torna al tester</ui-button>
            </div>

            <div class="player-actions">
              <ui-button
                *ngFor="let plugin of eventTypePlugins"
                [variant]="plugin.eventType === selectedType() ? 'primary' : 'secondary'"
                (pressed)="openType(plugin.eventType)">
                {{ plugin.label }}
              </ui-button>
            </div>

            <div class="plugin-variants" *ngIf="pluginsForSelectedType().length > 1">
              <div class="plugin-variants__header">
                <strong>Implementazione</strong>
                <p>Puoi forzare una variante precisa oppure lasciare che il resolver scelga automaticamente dal pool compatibile.</p>
              </div>

              <div class="plugin-variants__grid">
                <button
                  type="button"
                  class="plugin-variant-card"
                  [class.plugin-variant-card--active]="selectedMinigameType() === null"
                  (click)="setMinigameType(null)">
                  <strong>Automatico</strong>
                  <small>Usa \`event.minigameType\` solo se impostato, altrimenti selezione deterministica pesata per difficoltà.</small>
                </button>

                <button
                  *ngFor="let plugin of pluginsForSelectedType()"
                  type="button"
                  class="plugin-variant-card"
                  [class.plugin-variant-card--active]="plugin.minigameType === selectedMinigameType()"
                  (click)="setMinigameType(plugin.minigameType)">
                  <strong>{{ plugin.label }}</strong>
                  <small>{{ plugin.description }}</small>
                </button>
              </div>
            </div>

            <div class="player-form">
              <label>
                Eroe
                <select [ngModel]="selectedHeroId()" (ngModelChange)="setHero($event)">
                  <option *ngFor="let hero of heroes()" [ngValue]="hero.id">
                    {{ hero.title }} · Lv {{ hero.level }} · M{{ hero.mastery }}
                  </option>
                </select>
              </label>

              <label>
                Difficoltà
                <input type="number" min="1" max="10" [ngModel]="difficulty()" (ngModelChange)="setDifficulty($event)" />
              </label>
            </div>

            <div class="run-mode-picker" *ngIf="runModeOptions().length">
              <div class="run-mode-picker__header">
                <strong>Ritmo run</strong>
                <p>Stesso selettore usato in adventure per testare il contesto del minigioco.</p>
              </div>

              <div class="run-mode-picker__grid">
                <button
                  *ngFor="let option of runModeOptions()"
                  type="button"
                  class="run-mode-card"
                  [class.run-mode-card--active]="option.modeId === selectedRunModeId()"
                  (click)="setRunMode(option.modeId)">
                  <div class="run-mode-card__icon">
                    <ui-sprite [frame]="option.iconFrame" [showScale]="false" [allowUpscale]="true" fit="contain" anchor="center" />
                  </div>

                  <div class="run-mode-card__body">
                    <strong>{{ option.label }}</strong>
                    <small>{{ option.description }}</small>
                  </div>

                  <div class="run-mode-card__stats">
                    <span>C {{ option.resolvedProbabilities.combat * 100 | number: '1.0-0' }}%</span>
                    <span>T {{ option.resolvedProbabilities.trap * 100 | number: '1.0-0' }}%</span>
                    <span>R {{ option.resolvedProbabilities.treasure * 100 | number: '1.0-0' }}%</span>
                  </div>
                </button>
              </div>
            </div>
          </article>
          </section>
          
        <section class="game-layout">
          <article class="player-panel" *ngIf="false"> 
            <div class="player-panel__header">
              <div>
                <h2>Debug input</h2>
                <p>Parametri di ingresso del minigioco.</p>
              </div>
            </div>
            <pre class="debug-json">{{ minigameDebugInput() | json }}</pre>
          </article>

          <article class="player-panel player-panel--game" *ngIf="selectedHero() as hero">
            <app-embedded-phaser-minigame
              [hero]="hero"
              [minigameType]="selectedType()"
              [preferredMinigameType]="selectedMinigameType() ?? undefined"
              [difficulty]="difficulty()"
              [launchId]="launchId()"
              (minigameResolved)="handleMinigameResolved($event)" />
          </article>



          <article class="player-panel" *ngIf="false">
            <div class="player-panel__header">
              <div>
                <h2>Debug output</h2>
                <p>Risultato finale per calibrazione reward, fatigue e danno.</p>
              </div>
            </div>
            <pre class="debug-json">{{ (lastMinigameResult() ?? { status: 'pending', message: 'Nessun output disponibile' }) | json }}</pre>
          </article>
        </section>
      </main>
    </ion-content>

    <ion-footer>
      <ion-toolbar>
        <ui-bottom-utils />
      </ion-toolbar>
    </ion-footer>
  `,
  styles: [`
    :host {
      display: block;
    }

    .minigame-player-screen {
      min-height: 100%;
      padding: 24px 16px 120px;
      background:
        radial-gradient(circle at top, rgba(56, 189, 248, 0.16), transparent 26rem),
        linear-gradient(180deg, rgba(3, 7, 18, 0.96), rgba(15, 23, 42, 0.92));
    }

    .player-layout,
    .player-actions,
    .player-form,
    .plugin-variants,
    .plugin-variants__header,
    .plugin-variants__grid,
    .run-mode-picker,
    .run-mode-picker__header,
    .run-mode-picker__grid,
    .run-mode-card,
    .run-mode-card__body,
    .run-mode-card__stats {
      display: grid;
      gap: 16px;
    }

    .player-layout {
      margin-top: 18px;
    }

    .game-layout {
      display: grid;
      gap: 16px;
      margin-top: 32px;
      grid-template-columns: repeat(3, 1fr);
    }


    .player-panel {
      padding: 18px;
      border: 1px solid rgba(148, 163, 184, 0.22);
      border-radius: 20px;
      background: rgba(15, 23, 42, 0.74);
      box-shadow: 0 18px 40px rgba(0, 0, 0, 0.2);
      color: #e2e8f0;
    }

    .player-panel--game {
      overflow: hidden;
    }

    .player-panel__header {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: flex-start;
      flex-wrap: wrap;
    }

    .player-panel__header h2,
    .player-panel__header p {
      margin: 0;
    }

    .player-panel__header p {
      margin-top: 6px;
      color: #94a3b8;
    }

    .player-actions {
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    }

    .player-form {
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    }

    .plugin-variants__header strong {
      font-size: 16px;
      color: #fef3c7;
    }

    .plugin-variants__header p {
      margin: 0;
      color: #94a3b8;
      font-size: 13px;
    }

    .plugin-variants__grid {
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
    }

    .plugin-variant-card {
      border: 1px solid rgba(250, 204, 21, 0.18);
      border-radius: 16px;
      padding: 12px;
      background: linear-gradient(180deg, rgba(30, 41, 59, 0.88), rgba(15, 23, 42, 0.96));
      color: #e2e8f0;
      text-align: left;
      display: grid;
      gap: 6px;
      transition: transform 140ms ease, border-color 140ms ease, box-shadow 140ms ease;
    }

    .plugin-variant-card strong {
      font-size: 14px;
      color: #fef3c7;
    }

    .plugin-variant-card small {
      color: #cbd5e1;
      line-height: 1.35;
    }

    .plugin-variant-card--active {
      border-color: rgba(250, 204, 21, 0.86);
      box-shadow: 0 0 0 1px rgba(250, 204, 21, 0.22), 0 14px 28px rgba(0, 0, 0, 0.22);
      transform: translateY(-2px);
    }

    .run-mode-picker__header strong {
      font-size: 16px;
      color: #fef3c7;
    }

    .run-mode-picker__header p {
      margin: 0;
      color: #94a3b8;
      font-size: 13px;
    }

    .run-mode-picker__grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
    }

    .run-mode-card {
      border: 1px solid rgba(250, 204, 21, 0.18);
      border-radius: 18px;
      padding: 12px 10px;
      background: linear-gradient(180deg, rgba(30, 41, 59, 0.88), rgba(15, 23, 42, 0.96));
      color: #e2e8f0;
      text-align: left;
      transition: transform 140ms ease, border-color 140ms ease, box-shadow 140ms ease;
    }

    .run-mode-card--active {
      border-color: rgba(250, 204, 21, 0.86);
      box-shadow: 0 0 0 1px rgba(250, 204, 21, 0.22), 0 14px 28px rgba(0, 0, 0, 0.22);
      transform: translateY(-2px);
    }

    .run-mode-card__icon {
      width: 52px;
      height: 52px;
      padding: 6px;
      border-radius: 14px;
      background: radial-gradient(circle at top, rgba(250, 204, 21, 0.16), rgba(15, 23, 42, 0.12));
    }

    .run-mode-card__body strong {
      font-size: 15px;
    }

    .run-mode-card__body small {
      color: #cbd5e1;
      font-size: 11px;
      line-height: 1.35;
    }

    .run-mode-card__stats {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 6px;
    }

    .run-mode-card__stats span {
      padding: 6px 4px;
      border-radius: 10px;
      background: rgba(15, 23, 42, 0.82);
      text-align: center;
      font-size: 11px;
      color: #fde68a;
    }

    .player-form label {
      display: grid;
      gap: 8px;
      font-weight: 700;
      color: #cbd5e1;
    }

    .player-form input,
    .player-form select {
      width: 100%;
      border: 1px solid rgba(125, 211, 252, 0.3);
      border-radius: 12px;
      padding: 10px 12px;
      background: rgba(15, 23, 42, 0.9);
      color: #f8fafc;
    }

    .debug-json {
      margin: 0;
      padding: 14px;
      border-radius: 14px;
      background: rgba(2, 6, 23, 0.92);
      border: 1px solid rgba(125, 211, 252, 0.2);
      color: #bfdbfe;
      font-size: 12px;
      line-height: 1.45;
      white-space: pre-wrap;
      word-break: break-word;
      overflow: auto;
    }

    @media (max-width: 960px) {
      .run-mode-picker__grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .game-layout {
        grid-template-columns: 1fr;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MinigamePlayerPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly state = inject(GameStateService);
  private readonly heroProgress = inject(HeroProgressService);
  private readonly logger = inject(LoggerService);

  readonly plugins = getMinigamePlugins();
  readonly eventTypePlugins = getDefaultMinigamePlugins();
  readonly heroes = computed(() =>
    [...this.state.inventoryHeroes()].sort((left, right) => left.title.localeCompare(right.title)),
  );
  readonly selectedType = signal<GameEventType>("monster");
  readonly selectedMinigameType = signal<MinigameType | null>(null);
  readonly selectedHeroId = signal(this.state.currentHero()?.id ?? "");
  readonly difficulty = signal(4);
  readonly selectedRunModeId = signal<PhaserEventMinigameModeId>("luck");
  readonly launchId = signal(1);
  readonly lastMinigameResult = signal<MinigameResult | null>(null);
  readonly selectedHero = computed(
    () => this.heroes().find((hero) => hero.id === this.selectedHeroId()) ?? this.heroes()[0] ?? null,
  );
  readonly activePlugin = computed(() => {
    const selectedMinigameType = this.selectedMinigameType();
    return (selectedMinigameType ? getMinigamePluginByType(selectedMinigameType) : undefined)
      ?? getMinigamePluginByEventType(this.selectedType());
  });
  readonly pluginsForSelectedType = computed(() => getMinigamePluginsByEventType(this.selectedType()));
  readonly runModeOptions = computed(() => {
    const hero = this.selectedHero();
    if (!hero) {
      return [];
    }

    return EVENT_MINIGAME_MODE_ORDER.map((modeId) =>
      buildEventMinigameModePreview(modeId, hero),
    );
  });
  readonly selectedRunMode = computed(
    () =>
      this.runModeOptions().find((option) => option.modeId === this.selectedRunModeId()) ??
      this.runModeOptions()[0] ??
      null,
  );
  readonly minigameDebugInput = computed(() => {
    const hero = this.selectedHero();
    const plugin = this.activePlugin();
    if (!hero) {
      return { status: "missing-hero" };
    }

    const payload = buildStandaloneMinigamePayload({
      type: this.selectedType(),
      hero,
      difficulty: this.difficulty(),
      preferredMinigameType: this.selectedMinigameType() ?? undefined,
    });

    return {
      plugin: plugin
        ? {
          pluginId: plugin.pluginId,
          label: plugin.label,
          eventType: plugin.eventType,
          minigameType: plugin.minigameType,
        }
        : null,
      hero: {
        id: hero.id,
        title: hero.title,
        level: hero.level,
        mastery: hero.mastery,
        variant: hero.variant,
      },
      launch: {
        difficulty: this.difficulty(),
        runMode: this.selectedRunMode(),
        event: payload.event,
        heroStats: payload.heroStats,
        config: payload.config,
      },
    };
  });

  constructor() {
    this.route.paramMap.subscribe((params) => {
      this.selectedType.set(this.resolveRouteType(params));
      this.ensureSelectedMinigameType();
      this.bumpLaunch();
    });

    this.route.queryParamMap.subscribe((params) => {
      const heroId = params.get("heroId");
      const hero = this.heroes().find((item) => item.id === heroId) ?? this.state.currentHero() ?? this.heroes()[0] ?? null;
      const nextDifficulty = Math.max(1, Math.min(10, Number(params.get("difficulty") ?? 4) || 4));
      const nextRunModeId = normalizeEventMinigameModeId(params.get("modeId"));
      const requestedMinigameType = params.get("minigameType");

      if (hero) {
        this.selectedHeroId.set(hero.id);
        this.heroProgress.setSelectedHero(hero);
      }

      this.difficulty.set(nextDifficulty);
      this.selectedRunModeId.set(nextRunModeId);
      if (requestedMinigameType === "auto" || !requestedMinigameType) {
        this.selectedMinigameType.set(null);
      } else if (isRegisteredMinigameType(requestedMinigameType) && this.pluginsForType(this.selectedType()).some((plugin) => plugin.minigameType === requestedMinigameType)) {
        this.selectedMinigameType.set(requestedMinigameType);
      } else {
        this.ensureSelectedMinigameType();
      }
      this.lastMinigameResult.set(null);
      this.bumpLaunch();
    });
  }

  openType(type: GameEventType): void {
    void this.router.navigate(["/utils/game/minigame", type], {
      queryParams: {
        heroId: this.selectedHeroId(),
        difficulty: this.difficulty(),
        modeId: this.selectedRunModeId(),
        minigameType: this.selectedMinigameType() ?? "auto",
      },
    });
  }

  setHero(heroId: string): void {
    const hero = this.heroes().find((item) => item.id === heroId);
    if (!hero) {
      return;
    }

    this.selectedHeroId.set(hero.id);
    this.heroProgress.setSelectedHero(hero);
    this.syncQueryParams();
  }

  setDifficulty(value: number): void {
    this.difficulty.set(Math.max(1, Math.min(10, Number(value) || 4)));
    this.syncQueryParams();
  }

  setRunMode(modeId: PhaserEventMinigameModeId): void {
    this.selectedRunModeId.set(modeId);
    this.syncQueryParams();
  }

  setMinigameType(type: MinigameType | null): void {
    this.selectedMinigameType.set(type);
    this.syncQueryParams();
  }

  goBack(): void {
    void this.router.navigate(["/utils/game"]);
  }

  handleMinigameResolved(result: MinigameResult): void {
    this.lastMinigameResult.set(result);
  }

  private syncQueryParams(): void {
    this.bumpLaunch();
    this.logger.logDebug("[MINIGAME-PLAYER-PAGE] syncQueryParams", this.selectedType(), this.selectedHeroId(), this.difficulty(), this.selectedRunModeId(), this.selectedMinigameType());
    void this.router.navigate(["/utils/game/minigame", this.selectedType()], {
      queryParams: {
        heroId: this.selectedHeroId(),
        difficulty: this.difficulty(),
        modeId: this.selectedRunModeId(),
        minigameType: this.selectedMinigameType() ?? "auto",
      },
      queryParamsHandling: "merge",
      replaceUrl: true,
    });
  }

  private bumpLaunch(): void {
    this.launchId.update((value) => value + 1);
  }

  private ensureSelectedMinigameType(): void {
    const selectedMinigameType = this.selectedMinigameType();
    if (selectedMinigameType && !this.pluginsForType(this.selectedType()).some((plugin) => plugin.minigameType === selectedMinigameType)) {
      this.selectedMinigameType.set(null);
    }
  }

  private pluginsForType(type: GameEventType) {
    return getMinigamePluginsByEventType(type);
  }

  private resolveRouteType(params?: ParamMap): GameEventType {
    const directType = params?.get("type");
    this.logger.logDebug("[MINIGAME-PLAYER-PAGE] resolveRouteType", directType, this.router.url);
    if (isRegisteredMinigameEventType(directType)) {
      return directType;
    }

    const urlMatch = this.router.url.match(/\/utils\/game\/minigame\/(monster|trap|treasure|slot)(?:[/?#]|$)/);
    const urlType = urlMatch?.[1] ?? null;
    return isRegisteredMinigameEventType(urlType) ? urlType : "monster";
  }
}

function normalizeEventMinigameModeId(value: string | null): PhaserEventMinigameModeId {
  if (value === "strength" || value === "dexterity" || value === "intelligence" || value === "luck") {
    return value;
  }

  return "luck";
}
