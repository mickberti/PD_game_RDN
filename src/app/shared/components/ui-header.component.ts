import {
  ChangeDetectionStrategy,
  Component,
  Input,
  inject,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { AppNavigationService } from "../../core/services/app/navigation/app-navigation.service";
import { UIPillComponent } from "../basic/ui-pill.component";
import { GameStateService } from "../../core/services/state/game-state.service";
import { RouterLink, RouterLinkActive } from "@angular/router";
import { ComponentSize, IconItem, IconType } from "../../core/models/game.models";
import { UiSpriteComponent } from "../basic/ui-sprite.component";

@Component({
  selector: "ui-header",
  standalone: true,
  imports: [RouterLink, RouterLinkActive, UIPillComponent, CommonModule, UiSpriteComponent],
  template: `
  <div class="header" [ngClass]="styleClass">
  <div class="header-background" >
  	<ui-sprite [frame]="{ name: styleClassBg, effect: 'none' }" />
  </div>
  <div class="header-nav">
    <a routerLink="/profile" routerLinkActive="active">
	  <ui-sprite [frame]="{name:'icon-profile-s2', effect:'none'}" />
    </a>
  </div>
  <button *ngIf="showBackButton" class="back-chip" type="button" (click)="goBack()">‹</button>
  <span class="header-title">{{ title }}</span>
  <div class="settings">
    <a routerLink="/settings" routerLinkActive="active">
	  <ui-sprite [frame]="{name:'icon-settings-s2', effect:'none'}" />
    </a>
  </div>
  <div class="resources-wrapper">
	  <div class="resources">
	    <ui-pill [frame]="{name:'coin_single', effect:'none'}" size="sm" [value]="state.coins()"/>
	    <ui-pill [frame]="{name:'crystal_single', effect:'none'}" size="sm" [value]="state.gems()" />
		<ui-pill [frame]="{name:'magic_dust_single', effect:'none'}" size="sm" [value]="state.dusts()" />
	    <ng-content></ng-content>
		</div>
  </div>
  </div>
  `,

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UIHeaderComponent {
  @Input() title = "";
  @Input() backRoute?: string;
  @Input() backPath?: string;
  @Input() back?: string | boolean;
  @Input() styleClass =  "";
  @Input() styleClassBg =  "complementary-top";//"dark-band";

  readonly nav = inject(AppNavigationService);
  readonly state = inject(GameStateService);
  
  iconProfile: IconItem = {effect:'none', type:'profile', size:'sm'};
  iconSetting: IconItem = {effect:'none', type:'gear', size:'sm'};

  get showBackButton(): boolean {
    //return this.back === true || !!this.resolveBackRoute();
	return false
  }

  goBack(): void {
    this.nav.go(this.resolveBackRoute() ?? "/hub");
  }

  private resolveBackRoute(): string | undefined {
    if (typeof this.back === "string") {
      return this.back;
    }
    return this.backRoute ?? this.backPath;
  }
  
  getIcon(icon : IconType, size:ComponentSize) : IconItem{
  	return {
  		effect: "none",
  		type: icon,
  		size: size,
  	};
  }
}