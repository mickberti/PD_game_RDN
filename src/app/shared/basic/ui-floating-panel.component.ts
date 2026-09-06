import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiSpriteComponent } from "./ui-sprite.component";
import { UIPanelComponent } from "./ui-panel.component";
import { UIButtonSpriteComponent } from "./ui-button-sprite.component";

export interface FloatingAction {
  label: string;
  frameName: string;
  action: () => void;
}

@Component({
  selector: 'ui-floating-panel',
  imports: [CommonModule, UiSpriteComponent, UIPanelComponent, UIButtonSpriteComponent],
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
	    <ui-sprite [frame]="{ name: 'settings', effect: 'none' }" [fit]="'cover'" [anchor]="'top-center'"/>
	  </button>
	  

	  <ui-panel [variant]="'light'" *ngIf="isOpen">
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
  @Input() title = 'Contesto attivo';
  @Input() subtitle?: string;
  @Input() initials = '?';
  @Input() status: 'active' | 'warning' | 'error' = 'active';
  @Input() actions: FloatingAction[] = [];
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
