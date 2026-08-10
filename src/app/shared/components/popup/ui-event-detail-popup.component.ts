import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { GameEvent, resolveEventAvailability, RuleItem } from '../../../core/models/remote/event.model';
import { PriceItem, RewardItem } from '../../../core/models/game.models';
import { UIButtonComponent } from '../../basic/ui-button.component';
import { UIPillComponent } from '../../basic/ui-pill.component';
import { UIButtonSpriteComponent } from '../../basic/ui-button-sprite.component';
import { UIPanelComponent } from '../../basic/ui-panel.component';
import { UiSpriteComponent } from '../../basic/ui-sprite.component';
import { rewardFrame, rewardLabel, rewardRange, ruleFrame, ruleLabel as configuredRuleLabel } from '../../../core/services/inventory/rewards/reward-display-policy';

@Component({
  selector: 'ui-event-detail-popup',
  standalone: true,
  imports: [CommonModule, UIPanelComponent, UIButtonComponent, UIButtonSpriteComponent, UiSpriteComponent, UIPillComponent],
  template: `
    <div class="modal-backdrop" role="dialog" aria-modal="true" [attr.aria-label]="event?.title ?? 'Dettaglio evento'">
      <section class="modal event-detail-modal">
	  <ui-panel variant="dark">
        <div class="modal-title-row">
          <div class="event-title-content">
            <ui-sprite class="event-title-frame" [frame]="event?.frame ?? event?.framePanel ?? { name: 'none', effect: 'none' }" />
            <div>
              <span class="eyebrow">{{ typeLabel(event) }}</span>
              <h2>{{ event?.title }}</h2>
            </div>
          </div>
          <ui-button-sprite
            class="popup-close-button"
            styleClass="popup-close-button"
            size="sm"
            [frame]="{ name: 'icon-close-large', effect: 'none' }"
            (pressed)="onDismiss?.()"
            ariaLabel="Chiudi popup"
          />
        </div>

       
          <div class="event-summary">
            <strong>{{ event?.mode?.toUpperCase() ?? 'EVENTO' }}</strong>
            <span>{{ availabilityLabel(event) }}</span>
          </div>

          <div class="event-grid">
            <div *ngIf="event?.reward?.length" class="event-box event-icon-list">
              <strong>Ricompense immediate</strong>
              <span *ngFor="let reward of event?.reward; trackBy: trackReward"><ui-sprite [frame]="rewardFrame(reward)" /> {{ rewardLabel(reward) }} {{ rewardRange(reward) }}</span>
            </div>

            <div *ngIf="event?.rules as rules" class="event-box event-icon-list">
              <strong>Regole evento</strong>
              <span *ngFor="let rule of rules"><ui-sprite [frame]="ruleFrame(rule)" /> {{ ruleLabel(rule) }}</span>
            </div>
          </div>
        

	        <footer class="modal-action">
	          <ui-button variant="secondary" size="sm" *ngIf="showSecondaryAction" (pressed)="onSecondaryAction?.(event)">
	            Più tardi
	          </ui-button>
	          <ui-button variant="primary" size="sm" [disabled]="primaryDisabled" (pressed)="onPrimaryAction?.(event)">
                <span class="event-purchase-button-content" *ngIf="!primaryDisabled && priceItem; else primaryTextOnly">
                  <span>{{ primaryLabel }}</span>
                  <ui-pill [frame]="priceItem.frame" size="sm" [value]="priceItem.amount" />
                </span>
                <ng-template #primaryTextOnly>{{ primaryButtonLabel() }}</ng-template>
	          </ui-button>
        </footer>
		</ui-panel>
      </section>
    </div>
  `,
  styles: [`
    .event-detail-modal { max-width: 520px; }
	.event-detail-modal .panel-dark{ padding: 40px 15px; }
	.event-detail-modal .panel-light{ padding: 20px; }
    .modal-title-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .event-title-content { display: flex; align-items: center; gap: 12px; min-width: 0; }
    .event-title-frame { width: 52px; height: 52px; flex: 0 0 52px; display: inline-flex; }
    .event-title-content h2 { margin: 0; }
    .eyebrow { display: block; font-size: .75rem; font-weight: 800; letter-spacing: .08em; opacity: .75; text-transform: uppercase; }
    .event-summary, .event-box { display: flex; flex-direction: column; gap: 6px; }
    .event-grid { display: grid; gap: 12px; margin-top: 12px; }
    .event-box { padding: 12px; border-radius: 14px; background: rgba(255,255,255,.12); }
    .event-icon-list span { display: flex; align-items: center; gap: 8px; }
    .event-icon-list ui-sprite { width: 28px; height: 28px; display: inline-flex; }
    .event-purchase-button-content { display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UIEventDetailPopupComponent {
  @Input() event: GameEvent | null = null;
  @Input() primaryLabel = 'Vai';
  @Input() showSecondaryAction = false;
  @Input() priceItem?: PriceItem | null;
  @Input() primaryDisabled = false;
  @Input() onPrimaryAction?: (event: GameEvent | null) => void;
  @Input() onSecondaryAction?: (event: GameEvent | null) => void;
  @Input() onDismiss?: () => void;

  typeLabel(event: GameEvent | null | undefined): string {
    return event?.type === 'highlight' ? 'In evidenza' : event?.type ?? 'Evento';
  }

  availabilityLabel(event: GameEvent | null | undefined): string {
    if (!event) return '';
    const endAt = resolveEventAvailability(event).endAt;
    return endAt ? `Acquistabile fino al ${new Date(endAt).toLocaleDateString('it-IT')}` : '';
  }

  primaryButtonLabel(): string {
    if (!this.priceItem || this.primaryDisabled) return this.primaryLabel;
    return `${this.primaryLabel} · ${this.priceItem.amount} ${this.priceItem.type}`;
  }

  trackReward(index: number, reward: RewardItem): string {
    return `${reward.type}-${index}`;
  }

  rewardFrame(reward: RewardItem) {
    return rewardFrame(reward.type);
  }

  rewardLabel(reward: RewardItem): string {
    return rewardLabel(reward.type);
  }

  rewardRange(reward: RewardItem): string {
    return rewardRange(reward);
  }

  ruleFrame(rule: RuleItem) {
    return ruleFrame(rule.type);
  }

  ruleLabel(rule: RuleItem): string {
    return `${configuredRuleLabel(rule.type)}: x${rule.amount}`;
  }
}
