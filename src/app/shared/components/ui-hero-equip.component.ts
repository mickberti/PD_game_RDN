import { Component, inject, Input } from "@angular/core";

import { ComponentMode, EquipItem, FrameItem } from "../../core/models/game.models";
import { CommonModule } from "@angular/common";
import { UiSpriteComponent } from "../basic/ui-sprite.component";
import { AppNavigationService } from "../../core/services/app/navigation/app-navigation.service";
import { defaultEquip } from "../../core/models/mock/fantasy/equip-data";
import { UIPanelComponent } from "../basic/ui-panel.component";
import { defaultFrame } from "../../core/models/mock/fantasy/utils-data";
import { UIProgressStatItem, UIProgressStatsComponent } from "../basic/ui-progress-stats.component";

@Component({
	selector: "ui-hero-equip",
	standalone: true,
	imports: [
    CommonModule,
    UiSpriteComponent,
    UIPanelComponent,
    UIProgressStatsComponent
],
	template: `
	
	<ui-panel [variant]="variant" [title]="title">
	  <div class="equip-current-grid" >
	    <div class="equip-current-sprite">
	      <ui-sprite [frame]="equip?.frame ?? defaultFrame"></ui-sprite>
	    </div>

	    <div class="equip-current-descr">
	      <strong>{{ equip?.name }}</strong>

	      <div>Livello: {{ equip?.level }}</div>
	      <div>Attacco: {{ equip?.attack }}</div>
	      <div>Difesa: {{ equip?.defense }}</div>
	      <div>Effetti: {{ equip?.effect }}</div>
		  <div>Bonus eroe: {{ equipBonusLabel }}</div>
		  <ui-progress-stats [items]="equipProgressStats" ariaLabel="Progressi equip" />
	      
	    </div>
	  </div>
	</ui-panel>
`,
})
export class UIHeroEquipComponent {
	readonly nav = inject(AppNavigationService);
	@Input() equip: EquipItem | null = defaultEquip;
	@Input() navigation: boolean = true;
	@Input() variant: ComponentMode = "primary";
	@Input() title: string = "Equip attuale";

	defaultFrame: FrameItem = defaultFrame;
	
	readonly defaultEquip = defaultEquip;

	get equipProgressStats(): UIProgressStatItem[] {
		return [
			{ label: "Exp", progress: this.equip?.experience ?? defaultEquip.experience, kind: "experience" },
			{ label: "Dur", progress: this.equip?.duration ?? defaultEquip.duration, kind: "duration" },
		];
	}
	get equipBonusLabel(): string {
		const bonuses = this.equip?.bonuses?.length ? this.equip.bonuses : (this.equip?.bonus ? [this.equip.bonus] : []);
		const activeBonuses = bonuses.filter((bonus) => bonus.type !== "none" && bonus.value);
		if (!activeBonuses.length) return "Nessuno";

		return activeBonuses.map((bonus) => {
			const sign = bonus.malus ? "-" : "+";
			return `${bonus.type} ${sign}${bonus.value}`;
		}).join(" · ");
	}

}
