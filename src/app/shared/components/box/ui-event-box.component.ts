import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { GameEvent, resolveEventAvailability } from '../../../core/models/remote/event.model';
import { RewardItem } from '../../../core/models/game.models';
import { rewardFrame, rewardLabel, rewardRange } from '../../../core/services/inventory/rewards/reward-display-policy';
import { GameProgress } from '../../../core/models/remote/progress.models';
import { EventActivationService } from '../../../core/services/progression/event-activation.service';
import { UiSpriteComponent } from "../../basic/ui-sprite.component";

@Component({
  selector: 'ui-event-box',
  standalone: true,
  imports: [CommonModule, UiSpriteComponent],
  template: `
    <article
      class="event-card"
      [class.event-card--highlight]="event.type === 'highlight'"
      [class.event-card--inverted]="event.invertText"
      [class.is-inactive]="isActive"
      [attr.aria-disabled]="isActive"
	  (click)="selectEvent()"
    >
	<div class="event-frame">
		<ui-sprite [frame]="event.framePanel ?? { name: 'none', effect: 'none' }" [allowUpscale]="true"/>
	</div>
      <div class="event-card__body">
        <span class="event-card__type">{{ typeLabel }}</span>
        <strong>{{ event.title }}</strong>
        <small>{{ event.mode?.toUpperCase() }} · {{ endLabel }}</small>
        <div class="event-card__rewards" *ngIf="event.reward?.length">
          <span *ngFor="let reward of event.reward; trackBy: trackReward">
            <ui-sprite [frame]="rewardFrame(reward)" /> {{ rewardLabel(reward) }}
          </span>
        </div>
      </div>
      <div class="event-card__visual">
        <div class="event-badge-frame" aria-hidden="true">
          <ui-sprite [frame]="event.frame ?? { name: 'none', effect: 'none' }"  />
        </div>
        <div *ngIf="activeRemainingLabel" class="event-card__countdown" aria-label="Tempo evento residuo">
          <span>Acquistato</span>
          <span>Termina tra</span>
          <strong>{{ activeRemainingLabel }}</strong>
        </div>
      </div>
    </article>
  `,
  styles: [`
	.event-card {position: relative; overflow: hidden; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px; margin-bottom: 12px; border-radius: 18px; background: rgba(255,255,255,.12); box-shadow: 0 10px 24px rgba(0,0,0,.16); cursor: pointer; }
	.event-card--highlight { border: 2px solid rgba(255, 213, 74, .85); }
	.event-card--inverted {flex-direction: row-reverse;}
	.event-card__body { display: flex; flex-direction: column; gap: 5px; 	
		background: rgba(255, 255, 255, 0.18);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16), 0 18px 38px rgba(0, 0, 0, 0.88);
		text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.44);
	  border-radius: 26px;
	  padding: 10px;}
	.event-card__type { font-size: .72rem; font-weight: 800; letter-spacing: .08em; opacity: .8; text-transform: uppercase; }
	.event-card__countdown { display: grid; justify-items: end; gap: 2px; margin-left: auto; padding: 8px 10px; border-radius: 14px; background: rgba(0,0,0,.45); color: #ffe082; text-align: right; }
	.event-card__countdown span { font-size: .68rem; text-transform: uppercase; opacity: .8; }
	.event-card__countdown strong { font-size: 1rem; }
	.event-card__rewards { display: flex; flex-wrap: wrap; gap: 8px; font-size: .85rem; }
	.event-card__rewards span { display: inline-flex; align-items: center; gap: 4px; }
	.event-card__rewards ui-sprite { width: 22px; height: 22px; display: inline-flex; }
	.event-card__visual {min-height: 130px; display: flex; flex-direction: column; align-items: end; justify-content: start; gap: 8px; }
	.event-frame{	position: absolute;
	  height: 260px;
	  width: 410px;
	  left: 0;
	  z-index: -1;}
    .event-badge-frame { width: 55px; height: 55px; box-shadow: 0 10px 22px rgba(0,0,0,.28); }
    .event-badge-frame ui-sprite { display: block; width: 100%; height: 100%; }

  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UIEventBoxComponent {
  private readonly eventActivation = inject(EventActivationService);

  @Input({ required: true }) event!: GameEvent;
  @Input() progress?: GameProgress | null;
  @Output() selected = new EventEmitter<GameEvent>();

  get typeLabel(): string {
    return this.event.type === 'highlight' ? 'In evidenza' : (this.event.type ?? 'Evento');
  }

  get endLabel(): string {
    const endAt = resolveEventAvailability(this.event).endAt;
    return endAt ? `fino al ${new Date(endAt).toLocaleDateString('it-IT')}` : '';
  }

  get isActive(): boolean {
    return !!this.progress && this.eventActivation.isActive(this.event, this.progress);
  }

  get activeRemainingLabel(): string {
    if (!this.isActive) return '';
    const remainingMs = this.eventActivation.remainingMs(this.event, this.progress!);
    const totalMinutes = Math.ceil(remainingMs / 60000);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;
    return days > 0 ? `${days}g ${hours}h` : hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  }

  selectEvent(): void {
    this.selected.emit(this.event);
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

}
export { UIEventBoxComponent as UIEventChestComponent };
