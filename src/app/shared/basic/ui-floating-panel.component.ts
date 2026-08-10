import { Component, Input, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiSpriteComponent } from "./ui-sprite.component";
import { GameStateService } from '../../core/services/state/game-state.service';
import { UIPanelComponent } from "./ui-panel.component";
import { UIAttributeChestComponent } from "../components/box/ui-attribute-box.component";
import { UIButtonSpriteComponent } from "./ui-button-sprite.component";
import { defaultFrame } from '../../core/models/mock/fantasy/utils-data';
import { FrameItem, HeroItem } from '../../core/models/game.models';
import { defaulthero } from '../../core/models/mock/fantasy/hero-data';

export interface FloatingAction {
  label: string;
  frameName: string;
  action: () => void;
}

@Component({
  selector: 'ui-floating-panel',
  imports: [CommonModule, UiSpriteComponent, UIPanelComponent, UIAttributeChestComponent, UIButtonSpriteComponent],
    template: `
	<div 
	  class="context-overlay" 
	  *ngIf="isOpen" 
	  (click)="closePanel()">
	</div>

	<div class="floating-context-panel" [class.open]="isOpen">

	  <button
	    type="button"
	    class="context-bubble"
	    (click)="togglePanel()"
	    aria-label="Apri pannello contesto"
	  >
	    <ui-sprite *ngIf="false" [frame]="{name: 'icon-circle-blue', effect:'none'}"/>
	    <ui-sprite [frame]="currentHero()!.frame" [fit]="'cover'" [anchor]="'top-center'"/>
	  </button>
	  

	  <ui-panel [variant]="'light'" *ngIf="isOpen">
	    <div class="context-stats">
			@for (stats of currentHero().stats; track stats.title) {
			<ui-attribute-box direction="horizontal" [progress]="stats.progress" [frame]="stats.frame ?? defaultFrame" [title]="stats.title"/>
			}	
	    </div>

	    <div class="context-actions" *ngIf="actions.length">
		<ui-button-sprite
		 *ngFor="let item of actions"
		  variant="primary"
		  [frame]="{ name: item.frameName, effect: 'none' }"
		  (pressed)="runAction(item)" />
	    </div>
	  </ui-panel>
	  
	</div>
  `,
  styles: `
  :host {
    position: absolute;
    right: 20px;
    top: 30px;
    z-index: 20;
  }
  `,
})
export class UIFloatingPanelComponent {
  private readonly gameState = inject(GameStateService);
	
  @Input() title = 'Contesto attivo';
  @Input() subtitle?: string;
  @Input() initials = '?';
  @Input() status: 'active' | 'warning' | 'error' = 'active';
  @Input() actions: FloatingAction[] = [];
  @Input() hero: HeroItem | null = null;
  readonly currentHero = computed(() => this.hero ?? defaulthero);
  readonly defaultFrame: FrameItem = defaultFrame;
  isOpen = false;

  togglePanel(): void {
    this.isOpen = !this.isOpen;
  }

  closePanel(): void {
    this.isOpen = false;
  }

  runAction(action: FloatingAction): void {
    action.action();
    this.closePanel();
  }
}