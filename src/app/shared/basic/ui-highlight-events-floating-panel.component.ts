import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { UiSpriteComponent } from './ui-sprite.component';
import { GameEvent } from 'src/app/core/models/remote/event.model';
import { FrameItem } from 'src/app/core/models/game.models';


@Component({
  selector: 'ui-highlight-events-floating-panel',
  standalone: true,
  imports: [CommonModule, UiSpriteComponent],
  template: `

	<button
	  type="button"
	  class="context-bubble"
	  (click)="open.emit()"
	  aria-label="Apri evento"
	>
	  <ui-sprite [frame]="getFrameEvent()" [fit]="'cover'" [anchor]="'top-center'"/>
	</button>
	
  `,
  styles: [`
	:host {
	  position: absolute;
	  right: 20px;
	  top: 110px;
	  z-index: 20;
	}
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UIHighlightEventsFloatingPanelComponent {
  @Input() events: GameEvent[] = [];
  @Output() open = new EventEmitter<void>();
  
  
  getFrameEvent(): FrameItem{
	if(this.events && this.events.length > 0 && this.events[0].framePanel){
		return this.events[0].framePanel;
	}else{
		return {name:'none', effect:'none'};
	} 
  }
}
