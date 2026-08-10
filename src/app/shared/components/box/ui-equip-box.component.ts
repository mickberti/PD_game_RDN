import { ChangeDetectionStrategy, Component, EventEmitter, inject, Input, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ComponentMode, EquipItem, IconItem } from "../../../core/models/game.models";
import { UiSpriteComponent } from "../../basic/ui-sprite.component";
import { defaultEquip } from "../../../core/models/mock/fantasy/equip-data";
import { defaultIcon } from "../../../core/models/mock/fantasy/utils-data";
import { UIProgressStatItem, UIProgressStatsComponent } from "../../basic/ui-progress-stats.component";
import { UIProgressStarsComponent } from "../../basic/ui-progress-stars.component";
import { UIPreviewAttributesComponent } from "../ui-preview-attributes.component";
import { LoggerService } from "../../../core/services/infrastructure/logging/logger.service";

@Component({
	selector: "ui-equip-box",
	standalone: true,
	imports: [CommonModule, UiSpriteComponent, UIProgressStatsComponent, UIProgressStarsComponent, UIPreviewAttributesComponent],
	template: `<div class="ui-equip-box-wrapper" (click)="emitBalance()">
				<div class="equip-list-item" [class.delete-mode]="isDeleteMode" [ngClass]="[isLocked()]">
				<button *ngIf="isDeleteMode && !isSelectedEquip" type="button" class="delete-equip-action" (click)="emitDelete()" >Elimina</button>
				<div class="ui-equip-box" [ngClass]="[styleClass,variant]">
				  <div class="sprite">
				    <ui-sprite [frame]="{ name: calculateFrame(), effect: 'none' }" fit="contain" anchor="center" />
				  </div>
  
				  <div class="level">
					  <small>Lv {{ item.level }}</small>
				  </div>
				  
				  <div class="icon">
				    <ui-sprite [frame]="item.frame" fit="contain" anchor="center" />
				  </div>
				  
				  <div class="descr" *ngIf="false">
					  <small>{{ item.name }}</small>
				  </div>
				  
				  <div class="equip-box-level">
				  	<ui-preview-attributes [level]="item.level" [attack]="item.attack" [defense]="item.defense" [speed]="item.velocita" direction="vertical"/>
				  </div>
				  <div class="equip-box-maestria">
				  	<ui-progress-stars [mastery]="item.mastery" direction="vertical"/>
				  </div>
				  
				  <div class="stats">
				    <ui-progress-stats [items]="equipProgressStats" labelDisplay="none" ariaLabel="Progressi equip" />
				  </div>
			  

				<div class="equip-action" >
					<ui-sprite [frame]="{ name: 'icon-badge-star', effect: 'none' }" *ngIf="isSelectedEquip"/>
				</div>
				<div class="level-up-indicator" aria-label="Upgrade livello equip disponibile">
				@if (levelUpAvailable()) {
					<ui-sprite [frame]="{ name: 'icon-arrow-up', effect: 'fx-power-glow' }" />
					}
				</div>

			  </div>
			  </div>
			  <div *ngIf="'locked' === isLocked()" class="lock">
			  	<ui-sprite [frame]="{ name:'icon-broken-sword-shield', effect:'none'}" />
			  </div>
			  </div>
`,

	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UIEquipBoxComponent {
	@Input() item: EquipItem = defaultEquip;
	@Input() variant: ComponentMode = "light";
	@Input() styleClass = "";
	@Input() isDeleteMode = false;
	@Input() isSelectedEquip = false;
	@Output() balance = new EventEmitter<void>();
	@Output() assign = new EventEmitter<void>();
	@Output() delete = new EventEmitter<void>();

	defaultIcon: IconItem = defaultIcon;

	emitBalance() {
		this.balance.emit();
	}

	emitAssign() {
		this.assign.emit();
	}

	emitDelete() {
		this.delete.emit();
	}

	get equipProgressStats(): UIProgressStatItem[] {
		return [
			{ label: "Exp", progress: this.item.experience, kind: "experience" },
			{ label: "Dur", progress: this.item.duration ?? defaultEquip.duration, kind: "duration" },
		];
	}

	levelUpAvailable(): boolean {
		return this.item.experience.current >= this.item.experience.total;
	}

	calculateFrame(): string {
		if (this.item.level <= 3) {
			return 'card-parchment-small';
		} else if (this.item.level <= 6) {
			return 'card-blue-small';
		} else if (this.item.level <= 9) {
			return 'card-purple-small';
		} else {
			return 'card-parchment-red-banner';
		}
	}
	
	isLocked(){
		if(!this.item.duration){
			return 'collect';
		}else if(this.item.duration.current == 0){
			return 'locked';
		}
		return 'collect';
	}
}
export { UIEquipBoxComponent as UIEquipChestComponent };
