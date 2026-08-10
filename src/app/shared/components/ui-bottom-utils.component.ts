import { Component, inject } from "@angular/core";
import {  RouterLink, RouterLinkActive } from "@angular/router";
import { ThemeService } from "../../core/services/app/theme/theme.service";
import { CommonModule } from "@angular/common";
import { AppNavigationService } from "../../core/services/app/navigation/app-navigation.service";
import { UiSpriteComponent } from "../basic/ui-sprite.component";

@Component({
  selector: "ui-bottom-utils",
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule, UiSpriteComponent],
  template: `<nav class="bottom-nav">
  @for (nav of theme.bottomUtils(); track nav.id) {
	
    <a [routerLink]="nav.route" [routerLinkActive]="nav.active">
	  <span class="badge" *ngIf="nav.badge">!</span>
	  <div class="nav-sprite">
	  	<ui-sprite [frame]="nav.frame" />
	  </div>
	  <span>{{nav.title}}</span>
	</a>
	}
  </nav>`,
})
export class UIBottomUtilsComponent {
	readonly theme = inject(ThemeService);
	readonly nav = inject(AppNavigationService);
	
}
