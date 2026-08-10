import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, inject, Input, Output } from '@angular/core';

import { ChestItem, RewardItem } from '../../../core/models/game.models';
import { GameUtilsService } from '../../../core/services/ui/formatting/game-utils.service';
import { UIButtonComponent } from 'src/app/shared/basic/ui-button.component';
import { UIButtonSpriteComponent } from 'src/app/shared/basic/ui-button-sprite.component';
import { UiSpriteComponent } from 'src/app/shared/basic/ui-sprite.component';
import { UIPanelComponent } from 'src/app/shared/basic/ui-panel.component';
import { rewardFrame, rewardLabel, rewardRange } from '../../../core/services/inventory/rewards/reward-display-policy';

@Component({
  selector: 'ui-box-opening-popup',
  standalone: true,
  imports: [CommonModule, UIButtonComponent, UIButtonSpriteComponent, UiSpriteComponent, UIPanelComponent],
  template: `
    @if (open && box) {
      <div class="modal-backdrop box-detail-backdrop" role="dialog" aria-modal="true" [attr.aria-label]="ariaLabel">
        <article class="modal box-detail-modal">
          <ui-panel variant="light" styleClass="box-detail-panel">
            <header class="box-detail-header">
              <div class="box-detail-sprite" [class.fx-box-open]="boxOpening">
                <ui-sprite [frame]="box.frame" fit="contain" anchor="center" />
              </div>
              <div class="box-detail-title">
                <div class="box-detail-title-row">
                  <div>
                    <p class="inventory-eyebrow">Statistiche box</p>
                    <h2>{{ box.name }}</h2>
                  </div>
                  <ui-button-sprite
                    class="popup-close-button"
                    styleClass="popup-close-button"
                    size="sm"
                    [frame]="{ name: 'icon-close-large', effect: 'none' }"
                    (pressed)="close.emit()"
                    ariaLabel="Chiudi popup"
                  />
                </div>
                <strong>Stock x{{ formattedNumber(stock) }}</strong>
              </div>
            </header>

            <p class="box-detail-description">{{ box.description }}</p>
            <section class="box-reward-preview" aria-label="Statistiche di estrazione box">
              <h3>Statistiche di estrazione</h3>
              <div class="box-reward-grid">
                @for (reward of box.reward; track reward.type + '-' + $index) {
                  <div class="box-reward-card">
                    <div class="box-reward-icon">
                      <ui-sprite [frame]="rewardFrame(reward)" fit="contain" anchor="center" />
                    </div>
                    <span>{{ rewardLabel(reward) }}</span>
                    <strong>{{ rewardRange(reward) }}</strong>
                  </div>
                }
              </div>
            </section>

            <footer class="modal-action box-detail-actions">
              <ui-button variant="secondary" [disabled]="boxOpening || stock <= 0" (pressed)="openChest.emit(box)">Apri box</ui-button>
            </footer>
          </ui-panel>
        </article>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UIChestOpeningPopupComponent {
  private readonly utils = inject(GameUtilsService);

  @Input() open = false;
  @Input() box: ChestItem | null = null;
  @Input() stock = 0;
  @Input() boxOpening = false;
  @Input() ariaLabel = 'Dettaglio box inventario';
  @Output() close = new EventEmitter<void>();
  @Output() openChest = new EventEmitter<ChestItem>();

  formattedNumber(value: number): string {
    return this.utils.formatCompactNumber(value);
  }

  rewardRange(reward: RewardItem): string {
    return rewardRange(reward, (value) => this.formattedNumber(value));
  }

  rewardLabel(reward: RewardItem): string {
    return rewardLabel(reward.type);
  }

  rewardFrame(reward: RewardItem) {
    return rewardFrame(reward.type);
  }
}
