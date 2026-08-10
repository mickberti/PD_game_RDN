import { AfterViewInit, Component, ElementRef, EventEmitter, inject, Input, Output, ViewChild } from "@angular/core";

import { EquipItem, FrameItem, HeroItem, IconItem } from "../../core/models/game.models";
import { CommonModule } from "@angular/common";
import { UiSpriteComponent } from "../basic/ui-sprite.component";
import { AppNavigationService } from "../../core/services/app/navigation/app-navigation.service";
import { defaulthero } from "../../core/models/mock/fantasy/hero-data";
import { UIEquipHeroChestComponent } from "./box/ui-equip-hero-box.component";
import { UIButtonSpriteComponent } from "../basic/ui-button-sprite.component";
import { defaultFrame } from "../../core/models/mock/fantasy/utils-data";
import { calculateHeroTotalPower } from "../../core/services/progression/hero-power.service";
import { calculateHeroAttack, calculateHeroDefense, calculateHeroSpeed, createHeroExperienceProgress, createHeroFatigueProgress, createHeroHealProgress, createHeroManaProgress, LevelProgressionService } from "../../core/services/progression/level-progression.service";
import { UIProgressStatItem, UIProgressStatsComponent } from "../basic/ui-progress-stats.component";
import { defaultEquip } from "../../core/models/mock/fantasy/equip-data";
import { UIProgressStarsComponent } from "../basic/ui-progress-stars.component";
import { UIPreviewAttributesComponent } from "./ui-preview-attributes.component";
import { HeroUpgradeContentView } from "src/app/pages/hero/hero.page";

@Component({
	selector: "ui-hero-preview",
	standalone: true,
	imports: [
    CommonModule,
    UiSpriteComponent,
    UIEquipHeroChestComponent,
    UIButtonSpriteComponent,
    UIProgressStatsComponent,
    UIProgressStarsComponent,
    UIPreviewAttributesComponent,
],
	template: `
	<div class="hero-content">
		<div class="hero-wrap">
			<ui-sprite [frame]="hero.frame" />
		</div>
		<section class="hero-preview-level hero-total-power fx-new" aria-label="Livello eroe">
			<span class="hero-preview-badge-label">LV</span>
			<strong class="hero-total-power-value">{{ hero.level | number:'1.0-0' }}</strong>
		</section>
		<section class="hero-preview-attributes">
			<ui-preview-attributes
				[level]="hero.level"
				[attack]="heroAttack"
				[defense]="heroDefense"
				[speed]="heroSpeed"
				ariaLabel="Attributi eroe"
			/>
		</section>
		<section class="hero-preview-name hero-name-tag" aria-label="Nome eroe">
			{{ hero.title }}
		</section>
		<section class="hero-preview-mastery" aria-label="Variante eroe">
				<ui-progress-stars [mastery]="hero.mastery" direction="vertical" />
		</section>
		<section class="hero-total-power fx-new" aria-label="Potenza totale eroe">
				<strong class="hero-total-power-value">{{ calculateHeroTotalPower(hero) | number:'1.0-0' }}</strong>
			</section>
		<ui-progress-stats
			[items]="heroProgressStats"
			ariaLabel="Progressi eroe"
			styleClass="hero-preview-progress"
		/>
		<section class="hero-preview-upgrade" *ngIf="canLevelUp() || canHeal() || canRecoverFatigue()">
			<ui-button-sprite
			  *ngIf="canLevelUp()"
			  variant="primary"
			  [frame]="{ name: 'icon-arrow-up', effect: 'fx-power-glow' }"
			  (pressed)="upgradeHero()" [size]="'xs'" />
			<ui-button-sprite
			  *ngIf="canHeal()"
			  variant="secondary"
			  [frame]="{ name: 'icon-heart', effect: 'fx-power-glow' }"
			  (pressed)="healHero()" [size]="'xs'" />
			<ui-button-sprite
			  *ngIf="canRecoverFatigue()"
			  variant="secondary"
			  [frame]="{ name: 'weight', effect: 'fx-shadow' }"
			  (pressed)="recoverFatigueHero()" [size]="'xs'" />
		</section>

		<div class="hero-equip-box-container" >
			<ui-equip-hero-box [item]="findEquip('weapon')" (pressed)="openEquipSelection('weapon')"/>
			<ui-equip-hero-box [item]="findEquip('shield')" (pressed)="openEquipSelection('shield')"/>
			<ui-equip-hero-box [item]="findEquip('armor')" (pressed)="openEquipSelection('armor')"/>
			<ui-equip-hero-box [item]="findEquip('helmet')" (pressed)="openEquipSelection('helmet')"/>
			<ui-equip-hero-box [item]="findEquip('ring')" (pressed)="openEquipSelection('ring')"/>
			<ui-equip-hero-box [item]="findEquip('artifact')" (pressed)="openEquipSelection('artifact')"/>
		</div>
		<div class="hero-arrows" *ngIf="changehero">
			<button class="hero-arrow" (click)="previousHero()">
				<ui-sprite [frame]="{ name: 'icon-back', effect: 'none' }"/>
			</button>
			<button class="hero-arrow" (click)="nextHero()">
				<ui-sprite [frame]="{ name: 'icon-play', effect: 'none' }"/>
			</button>
		</div>

	</div>
`,
	styles: [`

	`],
})
export class UIHeroPreviewComponent {
	readonly nav = inject(AppNavigationService);

	private isRepositioning = false;
	private readonly levelProgression = inject(LevelProgressionService);
	@Input() color = "#ffc400";
	@Input() icon: IconItem = { effect: "none", type: "coin", size: "sm" }
	@Input() hero: HeroItem  = 	defaulthero;
	@Input() changehero: boolean = true;
	@Output() phero = new EventEmitter<void>();
	@Output() nhero = new EventEmitter<void>();
	@Output() upgrade = new EventEmitter<void>();
	@Output() heal = new EventEmitter<void>();
	@Output() recoverFatigue = new EventEmitter<void>();
	@Output() contentViewChange = new EventEmitter<HeroUpgradeContentView>();

	defaultFrame: FrameItem = defaultFrame;
	readonly calculateHeroTotalPower = calculateHeroTotalPower;

	get heroHeal() {
		return this.hero.heal ?? createHeroHealProgress(this.hero.level, this.hero.mastery, this.hero.variant);
	}

	get heroMana() {
		return this.hero.mana ?? createHeroManaProgress(this.hero.level, this.hero.mastery, this.hero.variant);
	}

	get heroExperience() {
		return this.hero.experience ?? createHeroExperienceProgress(this.hero.level);
	}

	get heroFatigue() {
		return this.hero.fatigue ?? createHeroFatigueProgress(this.hero.level, this.hero.mastery, this.hero.variant);
	}

	get heroAttack(): number {
		return calculateHeroAttack(this.hero);
	}

	get heroDefense(): number {
		return calculateHeroDefense(this.hero);
	}

	get heroSpeed(): number {
		return calculateHeroSpeed(this.hero);
	}

	get heroProgressStats(): UIProgressStatItem[] {
		return [
			{ label: "Heal", progress: this.heroHeal, kind: "heal" },
			{ label: "Mana", progress: this.heroMana, kind: "mana" },
			{ label: "Fat", progress: this.heroFatigue, kind: "fatigue" },
			{ label: "Exp", progress: this.heroExperience, kind: "experience" },
		];
	}


	findEquip(type: string): EquipItem{
		const equip = this.hero.equip.find((e) => e.type.id === type);
		//console.log('Finding equip of type:', type, 'Found:', equip);
		return equip ?? defaultEquip;
	}


	canLevelUp(): boolean {
		return this.levelProgression.hasHeroExperienceForUpgrade(this.hero);
	}

	heroNeedsReset(): boolean {
		return this.heroHeal.current <= 0 || this.heroFatigue.current >= this.heroFatigue.total;
	}

	canHeal(): boolean {
		return this.heroHeal.current < this.heroHeal.total;
	}

	canRecoverFatigue(): boolean {
		return this.heroFatigue.current > 0;
	}
	
	previousHero() {
		this.phero.emit();
	}

	nextHero() {
		this.nhero.emit();
	}

	openEquipSelection(type: string): void {
		this.contentViewChange.emit({page: 'equip', type} as any);
	}

	upgradeHero() {
		this.upgrade.emit();
	}

	healHero() {
		this.heal.emit();
	}

	recoverFatigueHero() {
		this.recoverFatigue.emit();
	}
}
