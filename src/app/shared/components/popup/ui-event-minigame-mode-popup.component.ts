import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from "@angular/core";

import { PhaserEventMinigameModeId } from "../../../core/models/phaser-game-state.model";
import { UIButtonComponent } from "../../basic/ui-button.component";
import { UIPanelComponent } from "../../basic/ui-panel.component";
import { UiSpriteComponent } from "../../basic/ui-sprite.component";
import { EventMinigameModePreview } from "../../../core/game/phaser/config/event-minigame-mode.config";

@Component({
  selector: "ui-event-minigame-mode-popup",
  standalone: true,
  imports: [CommonModule, UIButtonComponent, UIPanelComponent, UiSpriteComponent],
  template: `
    @if (open) {
      <div class="modal-backdrop event-minigame-mode-backdrop" role="dialog" aria-modal="true" aria-label="Selezione modalita' arcade">
        <section class="modal event-minigame-mode-modal">
          <ui-panel variant="light" styleClass="box-detail-panel">
            <div class="event-minigame-mode">
              <header class="event-minigame-mode__header">
                <span class="event-minigame-mode__eyebrow">Modalita' arcade</span>
                <h2>Scegli il ritmo della run</h2>
                <p>
                  Questa scelta decide con quale probabilita' comparira' un minigioco su combattimenti,
                  trappole e tesori.
                </p>
              </header>

              <div class="event-minigame-mode__grid">
                <button
                  *ngFor="let option of options"
                  type="button"
                  class="event-minigame-card"
                  [class.event-minigame-card--active]="option.modeId === selectedModeId"
                  (click)="choose.emit(option.modeId)"
                >
                  <div class="event-minigame-card__frame">
                    <ui-sprite [frame]="option.frame" fit="contain" anchor="center" />
                  </div>
                  <div class="event-minigame-card__body">
                    <strong>{{ option.label }}</strong>
                    <small>{{ option.description }}</small>
                    <span *ngIf="option.statId; else neutralInfluence">
                      {{ option.statId }} {{ formatPercent(option.statInfluencePercent) }} / {{ formatPercent(option.maxStatInfluencePercent) }}
                    </span>
                    <ng-template #neutralInfluence>
                      <span>Nessuna influenza statistica</span>
                    </ng-template>
                  </div>
                  <dl class="event-minigame-card__stats">
                    <div>
                      <dt>Combat</dt>
                      <dd>{{ formatPercent(option.resolvedProbabilities.combat) }}</dd>
                    </div>
                    <div>
                      <dt>Trap</dt>
                      <dd>{{ formatPercent(option.resolvedProbabilities.trap) }}</dd>
                    </div>
                    <div>
                      <dt>Treasure</dt>
                      <dd>{{ formatPercent(option.resolvedProbabilities.treasure) }}</dd>
                    </div>
                  </dl>
                </button>
              </div>

              <footer class="event-minigame-mode__footer">
                <ui-button variant="secondary" [disabled]="!selectedModeId" (pressed)="confirmSelection()">
                  Conferma modalita'
                </ui-button>
              </footer>
            </div>
          </ui-panel>
        </section>
      </div>
    }
  `,
  styles: [`
    .event-minigame-mode-backdrop {
      backdrop-filter: blur(6px);
      background:
        radial-gradient(circle at top, rgba(125, 60, 180, 0.18), transparent 40%),
        rgba(7, 4, 14, 0.86);
    }

    .event-minigame-mode-modal {
      width: min(960px, calc(100vw - 28px));
      max-height: calc(100vh - 32px);
      overflow: auto;
    }

    .event-minigame-mode {
      display: grid;
      gap: 20px;
      padding: 28px;
    }

    .event-minigame-mode__header {
      text-align: center;
      display: grid;
      gap: 8px;
    }

    .event-minigame-mode__header h2,
    .event-minigame-mode__header p {
      margin: 0;
    }

    .event-minigame-mode__eyebrow {
      font-size: 12px;
      letter-spacing: 0.24em;
      text-transform: uppercase;
      color: #d5c18b;
    }

    .event-minigame-mode__grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }

    .event-minigame-card {
      border: 1px solid rgba(227, 191, 113, 0.32);
      border-radius: 22px;
      background:
        linear-gradient(180deg, rgba(54, 26, 72, 0.92), rgba(15, 10, 24, 0.96)),
        #120d1a;
      color: #f7edd7;
      display: grid;
      gap: 14px;
      padding: 18px;
      text-align: left;
      transition: transform 140ms ease, border-color 140ms ease, box-shadow 140ms ease;
      box-shadow: 0 18px 36px rgba(0, 0, 0, 0.24);
    }

    .event-minigame-card--active {
      border-color: rgba(255, 214, 125, 0.92);
      box-shadow: 0 0 0 1px rgba(255, 214, 125, 0.35), 0 22px 42px rgba(0, 0, 0, 0.32);
      transform: translateY(-2px);
    }

    .event-minigame-card__frame {
      width: 72px;
      height: 72px;
      border-radius: 18px;
      background: radial-gradient(circle at top, rgba(255, 216, 126, 0.18), rgba(0, 0, 0, 0.12));
      display: grid;
      place-items: center;
    }

    .event-minigame-card__body {
      display: grid;
      gap: 6px;
    }

    .event-minigame-card__body strong {
      font-size: 22px;
    }

    .event-minigame-card__body small,
    .event-minigame-card__body span {
      color: rgba(247, 237, 215, 0.8);
    }

    .event-minigame-card__stats {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
      margin: 0;
    }

    .event-minigame-card__stats div {
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.05);
      padding: 10px 8px;
    }

    .event-minigame-card__stats dt {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: rgba(213, 193, 139, 0.92);
    }

    .event-minigame-card__stats dd {
      margin: 6px 0 0;
      font-size: 20px;
      font-weight: 700;
    }

    .event-minigame-mode__footer {
      display: flex;
      justify-content: center;
    }

    @media (max-width: 720px) {
      .event-minigame-mode {
        padding: 20px;
      }

      .event-minigame-mode__grid {
        grid-template-columns: 1fr;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UIEventMinigameModePopupComponent {
  @Input() open = false;
  @Input() options: EventMinigameModePreview[] = [];
  @Input() selectedModeId: PhaserEventMinigameModeId | null = null;

  @Output() choose = new EventEmitter<PhaserEventMinigameModeId>();
  @Output() confirm = new EventEmitter<void>();

  confirmSelection(): void {
    this.confirm.emit();
  }

  formatPercent(value: number): string {
    return `${Math.round(value * 100)}%`;
  }
}
