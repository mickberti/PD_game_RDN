import { Component, EventEmitter, Input, Output, computed, inject } from "@angular/core";

import { ComponentMode, HeroItem } from "../../core/models/game.models";
import { CommonModule } from "@angular/common";
import { UiSpriteComponent } from "../basic/ui-sprite.component";
import { AppNavigationService } from "../../core/services/app/navigation/app-navigation.service";
import { GameStateService } from "../../core/services/state/game-state.service";

@Component({
	selector: "ui-hero-banner",
	standalone: true,
	imports: [
    CommonModule,
    UiSpriteComponent
],
	template: `
	<div class="hero-banner" [ngClass]="[getClasses()]">

				
				<div class="hero-banner-descr">
					<button class="hero-arrow" (click)="previousHero()" *ngIf="navigation">
						<ui-sprite [frame]="{ name: 'icon-back', effect: 'none' }"/>
					</button>
					<div class="hero-banner-wrap">
						<ui-sprite [frame]="currentHero().frame" [fit]="'cover'" [anchor]="'top-center'"/>
					</div>
					<div class="hero-banner-name" >
						<div class="hero-banner-name-tag">{{ currentHero().title }}</div>
					</div>
					<button class="hero-arrow" (click)="nextHero()" *ngIf="navigation">
						<ui-sprite [frame]="{ name: 'icon-play', effect: 'none' }"/>
					</button>
				<div>
	</div>
`,
})
export class UIHeroBAnnerComponent {
	readonly nav = inject(AppNavigationService);
	private readonly gameState = inject(GameStateService);
	
	
	@Input() navigation: boolean = true;
	@Input() variant: ComponentMode = "primary";
	@Input() hero: HeroItem | null = null;
	@Output() phero = new EventEmitter<void>();
	@Output() nhero = new EventEmitter<void>();
	
	readonly currentHero = computed(() => this.hero ?? this.gameState.currentHero());
	
	previousHero() {
		this.phero.emit();
	}

	nextHero() {
		this.nhero.emit();
	}
	
	getClasses() {
	  return this.variant + "-band";
	}
}
