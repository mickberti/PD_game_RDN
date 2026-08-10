import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { IonContent, IonFooter, IonToolbar } from "@ionic/angular/standalone";
import { HeroProgressService } from "../../../core/services/progression/hero-progress.service";
import { GameStateService } from "../../../core/services/state/game-state.service";
import { MinigameResult } from "../../../core/game/minigames/minigame.model";
import { UIButtonComponent } from "../../../shared/basic/ui-button.component";
import { UIBottomUtilsComponent } from "../../../shared/components/ui-bottom-utils.component";
import { UiUtilsPageHeaderComponent } from "../../../shared/components/ui-utils-page-header.component";
import { EmbeddedPhaserMinigameComponent } from "../../gameplay/embedded-phaser-minigame.component";

@Component({
  selector: "app-slot-machine-test-page",
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonFooter, IonToolbar, UIButtonComponent, UIBottomUtilsComponent, UiUtilsPageHeaderComponent, EmbeddedPhaserMinigameComponent],
  template: `
    <ion-content>
      <main class="slot-test-screen">
        <ui-utils-page-header group="game" title="Slot Machine Test" description="Sandbox dedicata alle slot: non appartengono agli eventi tesoro." />
        <section class="slot-test-layout">
          <article class="slot-test-controls">
            <label>Eroe
              <select [ngModel]="selectedHeroId()" (ngModelChange)="setHero($event)">
                <option *ngFor="let hero of heroes()" [ngValue]="hero.id">{{ hero.title }} · Lv {{ hero.level }}</option>
              </select>
            </label>
            <label>Difficoltà
              <input type="number" min="1" max="10" [ngModel]="difficulty()" (ngModelChange)="setDifficulty($event)" />
            </label>
            <ui-button variant="primary" (pressed)="restart()">Riavvia slot</ui-button>
            <p *ngIf="lastResult() as result">Esito: <strong>{{ result.grade }}</strong> · Punteggio {{ result.score }}</p>
          </article>
          <app-embedded-phaser-minigame
            *ngIf="selectedHero() as hero"
            [hero]="hero"
            minigameType="slot"
            preferredMinigameType="slotMachine"
            [difficulty]="difficulty()"
            [launchId]="launchId()"
            (minigameResolved)="lastResult.set($event)" />
        </section>
      </main>
    </ion-content>
    <ion-footer><ion-toolbar><ui-bottom-utils /></ion-toolbar></ion-footer>
  `,
  styles: [`
    .slot-test-screen { min-height: 100%; padding: 24px 16px 120px; background: linear-gradient(180deg, #080b1d, #17112e); }
    .slot-test-layout { display: grid; grid-template-columns: minmax(220px, 320px) minmax(0, 1fr); gap: 18px; align-items: start; margin-top: 18px; }
    .slot-test-controls { display: grid; gap: 14px; padding: 18px; border: 1px solid rgba(196,181,253,.3); border-radius: 16px; background: rgba(15,23,42,.82); color: #e9d5ff; }
    label { display: grid; gap: 6px; font-weight: 700; } input, select { min-height: 40px; border-radius: 8px; border: 1px solid #6d5ba6; background: #111827; color: #f8fafc; padding: 0 10px; }
    @media (max-width: 840px) { .slot-test-layout { grid-template-columns: 1fr; } }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SlotMachineTestPage {
  private readonly state = inject(GameStateService);
  private readonly heroProgress = inject(HeroProgressService);
  readonly heroes = computed(() => [...this.state.inventoryHeroes()].sort((a, b) => a.title.localeCompare(b.title)));
  readonly selectedHeroId = signal(this.state.currentHero()?.id ?? "");
  readonly difficulty = signal(4);
  readonly launchId = signal(1);
  readonly lastResult = signal<MinigameResult | null>(null);
  readonly selectedHero = computed(() => this.heroes().find((hero) => hero.id === this.selectedHeroId()) ?? this.heroes()[0] ?? null);

  setHero(heroId: string): void {
    const hero = this.heroes().find((item) => item.id === heroId);
    if (hero) {
      this.selectedHeroId.set(hero.id);
      this.heroProgress.setSelectedHero(hero);
      this.restart();
    }
  }

  setDifficulty(value: number): void {
    this.difficulty.set(Math.max(1, Math.min(10, Number(value) || 4)));
    this.restart();
  }

  restart(): void {
    this.lastResult.set(null);
    this.launchId.update((value) => value + 1);
  }
}
