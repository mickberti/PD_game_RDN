import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { IonContent, IonFooter, IonHeader, IonToolbar } from "@ionic/angular/standalone";
import { ThemeService, GameTheme } from "../../core/services/app/theme/theme.service";
import { UIButtonComponent } from "src/app/shared/basic/ui-button.component";
import { UISettingChestComponent } from "src/app/shared/components/box/ui-setting-box.component";
import { UIPanelComponent } from "src/app/shared/basic/ui-panel.component";
import { LanguageService } from "../../core/services/app/i18n/language.service";
import { AppNavigationService } from "../../core/services/app/navigation/app-navigation.service";
import { UIHeaderComponent } from "src/app/shared/components/ui-header.component";
import { UIBottomNavComponent } from "src/app/shared/components/ui-bottom-nav.component";
import { StatisticProgressService } from "../../core/services/progression/statistic-progress.service";
import { STATISTIC_TYPES, StatisticType } from "../../core/models/remote/progress.models";
import { GameStateService } from "../../core/services/state/game-state.service";
import { UIButtonSpriteComponent } from "src/app/shared/basic/ui-button-sprite.component";
import { DirectRouteAccessService } from "../../core/services/app/navigation/direct-route-access.service";
import { RDN_MAX_LEVEL } from "../../core/game/phaser/config/levels.config";
import { environment } from "../../../environments/environment";
import { GameplaySessionService } from "../../core/services/gameplay/gameplay-session.service";
import { EffectTutorialService } from "../../core/services/gameplay/effect-tutorial.service";
import { AudioService } from "../../core/audio/audio.service";

const THEMES: GameTheme[] = ["fantasy_bg"];

@Component({
  selector: "app-settings",
  standalone: true,
  imports: [IonHeader, IonToolbar, UIHeaderComponent, IonFooter, UIBottomNavComponent, IonContent, UIButtonComponent, UISettingChestComponent, UIPanelComponent, UIButtonSpriteComponent],
  template: `
    <ion-header>
  <ion-toolbar>
    <ui-header title="Settings" backPath="/hub"></ui-header>
  </ion-toolbar>
  </ion-header>
  
  <ion-content >
    <div class="screen settings-screen">
      <ui-panel [variant]="'primary'" [title]="t('language')" >
        <div class="settings-menu">
          <ui-button-sprite [frame]="{name: 'play', effect: 'none'}" (pressed)="language.previousLanguage()"></ui-button-sprite>
          <span class="s-desc-title">{{ language.activeLanguageLabel() }}</span>
          <ui-button-sprite [frame]="{name: 'play', effect: 'none'}" (pressed)="language.nextLanguage()"></ui-button-sprite>
        </div>
      </ui-panel>

      <ui-panel [variant]="'primary'" [title]="t('effects')" >
        <ui-setting-box type="music" [title]="t('music')" [checked]="!audio.musicMuted()" (toggle)="toggleMusic()"></ui-setting-box>
        <label style="display:grid;gap:5px;padding:0 12px 13px;color:#f7e9c7">Volume musica: {{ volumePercent(audio.musicVolume()) }}%<input type="range" min="0" max="100" [value]="volumePercent(audio.musicVolume())" (input)="setMusicVolume($any($event.target).value)" /></label>
        <ui-setting-box type="sfx" [title]="t('sfx')" [checked]="!audio.sfxMuted()" (toggle)="toggleSfx()"></ui-setting-box>
        <label style="display:grid;gap:5px;padding:0 12px 13px;color:#f7e9c7">Volume effetti: {{ volumePercent(audio.sfxVolume()) }}%<input type="range" min="0" max="100" [value]="volumePercent(audio.sfxVolume())" (input)="setSfxVolume($any($event.target).value)" /></label>
        <ui-setting-box type="service" [title]="t('gameService')" [subtitle]="gameServiceModeLabel()" [checked]="gameState.isMockMode()" (toggle)="toggleService()"></ui-setting-box>
        <ui-setting-box type="task" title="URL diretto senza boot" [subtitle]="directRouteAccessLabel()" [checked]="directRouteAccess.enabled()" (toggle)="toggleDirectRouteAccess()"></ui-setting-box>
        @if (audioDebugAvailable) { <div class="settings-links"><ui-button variant="complementary" (pressed)="openAudioDebug()">Audio Debug / Sound Test</ui-button></div> }
      </ui-panel>

      <ui-panel [variant]="'primary'" [title]="t('theme')" >
        <div class="settings-menu">
          <ui-button-sprite [frame]="{name: 'play', effect: 'none'}" (pressed)="previousTheme()"></ui-button-sprite>
          <span class="s-desc-title">{{ activeTheme() }}</span>
          <ui-button-sprite [frame]="{name: 'play', effect: 'none'}" (pressed)="nextTheme()"></ui-button-sprite>
        </div>
      </ui-panel>

      <ui-panel [variant]="'primary'" title="Ripristina tutorial">
        <p class="s-desc-title">Ripristina solo le spiegazioni: progressi, stelle, punteggi e salvataggi non vengono modificati.</p>
        <div class="settings-links">
          <ui-button variant="secondary" (pressed)="resetTutorialMode('adventure')">Ripristina Avventura</ui-button>
          <ui-button variant="secondary" (pressed)="resetTutorialMode('time-attack')">Ripristina Time Attack</ui-button>
          <ui-button variant="secondary" (pressed)="resetTutorialMode('free')">Ripristina Free</ui-button>
          <ui-button variant="complementary" (pressed)="resetAllTutorials()">Ripristina tutti i tutorial</ui-button>
        </div>
        <div class="settings-links">
          @for (tutorial of effectTutorial.tutorialEntries(); track tutorial.id) {
            <ui-button variant="secondary" [disabled]="!tutorial.seen" (pressed)="resetTutorial(tutorial.id)">
              {{ tutorial.seen ? 'Ripristina' : 'Da mostrare' }} · {{ tutorial.title }}<br /><small>{{ tutorial.levelLabel }}</small>
            </ui-button>
          }
        </div>
      </ui-panel>

      <ui-panel [variant]="'primary'" title="Traguardi">
        <div class="settings-links">
          <ui-button variant="complementary" [disabled]="resettingAwards()" (pressed)="resetClaimedAwards()">
            {{ resettingAwards() ? 'Ripristino premi...' : 'Ripristina premi ritirati' }}
          </ui-button>
          <ui-button variant="complementary" (pressed)="nav.go('utils/component-atlas-icon')" >{{ t('support') }}</ui-button>
        <ui-button variant="complementary" (pressed)="boostAllStatistics()">+50 statistiche</ui-button>
        <ui-button variant="complementary" (pressed)="boostPlayerResources()">+2000 coin +500 gem +500 dust</ui-button>
        <ui-button variant="complementary" [disabled]="resettingProgress()" (pressed)="resetUserProgress()">{{ resettingProgress() ? t('resettingProgress') : t('resetProgress') }}</ui-button>
        </div>
      </ui-panel>

      <ui-panel [variant]="'primary'" [title]="t('socialNetworks')" >
        <div class="settings-social">
          <ui-button-sprite [frame]="{name: 'social-fb', effect: 'none'}"></ui-button-sprite>
          <ui-button-sprite [frame]="{name: 'social-twitter', effect: 'none'}"></ui-button-sprite>
          <ui-button-sprite [frame]="{name: 'social-instagram', effect: 'none'}"></ui-button-sprite>
        </div>
      </ui-panel>

      <div class="settings-links">
        <ui-button variant="secondary">{{ t('gameInfo') }}</ui-button>
        <ui-button variant="secondary">{{ t('community') }}</ui-button>
        <ui-button variant="secondary">{{ t('aboutUs') }}</ui-button>
      </div>
      
      @if (isAdmin()) {
        <ui-panel [variant]="'primary'" title="Strumenti amministratore">
          <div class="settings-links">
            <ui-button variant="complementary" (pressed)="nav.go('/utils/rnd-solutions/adventure')">Soluzioni Avventura</ui-button>
            <ui-button variant="complementary" (pressed)="nav.go('/utils/rnd-solutions/time-attack')">Soluzioni Time Attack</ui-button>
            <ui-button variant="complementary" (pressed)="nav.go('/utils/rnd-effects/adventure')">Effetti livelli Avventura</ui-button>
            <ui-button variant="complementary" (pressed)="nav.go('/utils/rnd-effects/time-attack')">Effetti livelli Time Attack</ui-button>
            <ui-button variant="complementary" [disabled]="adminLevelActionPending()" (pressed)="resetRdnLevels()">Resetta livelli RDN</ui-button>
            <ui-button variant="complementary" [disabled]="adminLevelActionPending()" (pressed)="unlockAllRdnLevels()">Abilita tutti i livelli RDN</ui-button>
            @if (effectPlaygroundAvailable()) { <ui-button variant="complementary" (pressed)="openEffectPlayground()">🧪 Effect Playground</ui-button> }
          </div>
        </ui-panel>
      }
	  <div class="settings-links">
	  <small>Version: v1.00</small>
      <small>ID: 460003500F73289</small>
	  </div>
    </div>
  </ion-content>
  
  <ion-footer>
  <ion-toolbar>
    <ui-bottom-nav />
  </ion-toolbar>
  </ion-footer>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage {
  readonly theme = inject(ThemeService);
  readonly language = inject(LanguageService);
  readonly nav = inject(AppNavigationService);
  readonly gameState = inject(GameStateService);
  readonly directRouteAccess = inject(DirectRouteAccessService);
  private readonly statisticProgress = inject(StatisticProgressService);
  private readonly gameplaySession = inject(GameplaySessionService);
  readonly effectTutorial = inject(EffectTutorialService);
  readonly audio = inject(AudioService);

  readonly activeTheme = computed(() => this.theme.activeTheme());
  readonly isAdmin = computed(() => this.gameState.player()?.role === 'admin');
  readonly gameServiceModeLabel = computed(() => this.gameState.isMockMode() ? 'Mock' : 'Remote');
  readonly directRouteAccessLabel = computed(() => this.directRouteAccess.enabled() ? 'Accesso diretto attivo' : 'Passa da boot');
  readonly resettingProgress = signal(false);
  readonly resettingAwards = signal(false);
  readonly adminLevelActionPending = signal(false);
  readonly effectPlaygroundAvailable = computed(() => this.isAdmin());
  readonly audioDebugAvailable = !environment.production;

  t(key: string): string {
    return this.language.t(key);
  }

  toggleMusic(): void {
    this.audio.toggleMusicMute();
  }

  toggleSfx(): void {
    this.audio.toggleSfxMute();
  }
  volumePercent(value: number): number { return Math.round(value * 100); }
  setMusicVolume(value: string): void { this.audio.setMusicVolume(Number(value) / 100); }
  setSfxVolume(value: string): void { this.audio.setSfxVolume(Number(value) / 100); }
  openAudioDebug(): void { if (this.audioDebugAvailable) void this.nav.go("/utils/audio-debug"); }

  toggleService(): void {
    this.gameState.toggleDataSourceMode();
  }

  toggleDirectRouteAccess(): void {
    this.directRouteAccess.toggle();
  }

  previousTheme(): void {
    this.shiftTheme(-1);
  }

  nextTheme(): void {
    this.shiftTheme(1);
  }

  boostAllStatistics(): void {
    const statisticBoosts = STATISTIC_TYPES.reduce<Partial<Record<StatisticType, number>>>(
      (updates, type) => ({
        ...updates,
        [type]: 50,
      }),
      {}
    );

    this.statisticProgress.incrementMany(statisticBoosts);
  }

  boostPlayerResources(): void {
    const currentProgress = this.gameState.progress();

    this.gameState.updateProgress({
      ...currentProgress,
      coins: currentProgress.coins + 2000,
      gems: currentProgress.gems + 500,
      dust: currentProgress.dust + 500,
      lastUpdatedAt: new Date().toISOString(),
    });
  }

  async resetUserProgress(): Promise<void> {
    if (this.resettingProgress()) {
      return;
    }

    this.resettingProgress.set(true);

    try {
      await this.gameState.resetUserProgress();
    } finally {
      this.resettingProgress.set(false);
    }
  }

  async resetClaimedAwards(): Promise<void> {
    if (this.resettingAwards() || !window.confirm("Ripristinare tutti i premi ritirati? Potranno essere raccolti di nuovo se il relativo traguardo è già completato.")) {
      return;
    }

    this.resettingAwards.set(true);
    try {
      const progress = this.gameState.progress();
      this.gameState.updateProgress({
        ...progress,
        claimedStatisticAwardTiers: {},
        lastUpdatedAt: new Date().toISOString(),
      });
      await this.gameState.persistProgressNow();
    } finally {
      this.resettingAwards.set(false);
    }
  }

  /** Admin-only development tools: affect Adventure and Time Attack, never Free or Ranked. */
  resetRdnLevels(): void {
    this.updateRdnLevelAccess(0);
  }

  unlockAllRdnLevels(): void {
    this.updateRdnLevelAccess(RDN_MAX_LEVEL);
  }
  openEffectPlayground(): void {
    if (!this.effectPlaygroundAvailable()) return;
    this.gameplaySession.startEffectPlayground();
    void this.nav.go("/utils/effect-playground");
  }
  resetTutorial(id: string): void { this.effectTutorial.resetTutorial(id); }
  resetTutorialMode(mode: "adventure" | "time-attack" | "free"): void { this.effectTutorial.resetMode(mode); }
  resetAllTutorials(): void { if (window.confirm("Ripristinare tutti i tutorial? I progressi di gioco non verranno modificati.")) this.effectTutorial.resetAll(); }

  private updateRdnLevelAccess(level: number): void {
    if (!this.isAdmin() || this.adminLevelActionPending()) return;
    this.adminLevelActionPending.set(true);
    try {
      const progress = this.gameState.progress();
      this.gameState.updateProgress({
        ...progress,
        gameModeLevels: {
          ...(progress.gameModeLevels ?? {}),
          adventure: level,
          "time-attack": level,
        },
        gameModeLevelStars: level === 0
          ? {
              ...(progress.gameModeLevelStars ?? {}),
              adventure: {},
              "time-attack": {},
            }
          : progress.gameModeLevelStars,
        lastUpdatedAt: new Date().toISOString(),
      });
    } finally {
      this.adminLevelActionPending.set(false);
    }
  }

  private shiftTheme(direction: -1 | 1): void {
    const index = THEMES.indexOf(this.activeTheme());
    const nextIndex = (index + direction + THEMES.length) % THEMES.length;
    this.theme.setTheme(THEMES[nextIndex]);
  }
}
