import { CommonModule } from "@angular/common";
import { Component, Input } from "@angular/core";
import { FrameItem, HeroItem } from "../../core/models/game.models";
import { UIPanelComponent } from "../basic/ui-panel.component";
import { UIAttributeChestComponent } from "./box/ui-attribute-box.component";
import { defaultFrame } from "../../core/models/mock/fantasy/utils-data";
import { createHeroExperienceProgress, createHeroFatigueProgress, createHeroHealProgress, createHeroManaProgress } from "../../core/services/progression/level-progression.service";
import { UIProgressStatItem, UIProgressStatsComponent } from "../basic/ui-progress-stats.component";

@Component({
  selector: "ui-hero-stats",
  standalone: true,
  imports: [CommonModule, UIPanelComponent, UIAttributeChestComponent, UIProgressStatsComponent],
  template: `
  <ui-panel [variant]="'primary'" [title]="hero?.title" [ngClass]="['panel-grid', styleClass]">

  @if (hero) {
    <ui-progress-stats [items]="heroProgressStats" ariaLabel="Progressi eroe" />
  }

  @for (stats of hero?.stats; track stats.title) {
	<ui-attribute-box direction="horizontal" [progress]="stats.progress" [frame]="stats.frame ?? defaultFrame" [title]="stats.title"/>
  }	
      
	<div class="color-dots">
	      <span class="color-dot" style="background:#ffc400"></span
	      ><span class="color-dot" style="background:#78d7ec"></span
	      ><span class="color-dot" style="background:#4ab0a7"></span
	      ><span class="color-dot" style="background:#96786e"></span>
	    </div>
  </ui-panel>
`,
  styles: [`

  `],
})
export class UIHeroStatsComponent {
	@Input() hero: HeroItem | null = null;
	@Input() styleClass: string = "";
	@Input() titleVisible: boolean = false;
	
	readonly defaultFrame: FrameItem = defaultFrame;
	readonly healFrame: FrameItem = { name: "skill-heart", effect: "none" };
	readonly manaFrame: FrameItem = { name: "skill-magic-book", effect: "none" };
	readonly experienceFrame: FrameItem = { name: "icon-badge-star", effect: "none" };

	get heroHeal() {
		return this.hero?.heal ?? createHeroHealProgress(this.hero?.level ?? 1, this.hero?.mastery ?? 1, this.hero?.variant ?? 0);
	}

	get heroMana() {
		return this.hero?.mana ?? createHeroManaProgress(this.hero?.level ?? 1, this.hero?.mastery ?? 1, this.hero?.variant ?? 0);
	}

	get heroExperience() {
		return this.hero?.experience ?? createHeroExperienceProgress(this.hero?.level ?? 1);
	}

	get heroFatigue() {
		return this.hero?.fatigue ?? createHeroFatigueProgress(this.hero?.level ?? 1, this.hero?.mastery ?? 1, this.hero?.variant ?? 0);
	}

	get heroProgressStats(): UIProgressStatItem[] {
		return [
			{ label: "Heal", progress: this.heroHeal, kind: "heal" },
			{ label: "Mana", progress: this.heroMana, kind: "mana" },
			{ label: "Fat", progress: this.heroFatigue, kind: "fatigue" },
			{ label: "Exp", progress: this.heroExperience, kind: "experience" },
		];
	}
}
