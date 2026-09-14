import { Component, computed, inject } from "@angular/core";
import {  RouterLink, RouterLinkActive } from "@angular/router";
import { ThemeService } from "../../core/services/app/theme/theme.service";
import { CommonModule } from "@angular/common";
import { AppNavigationService } from "../../core/services/app/navigation/app-navigation.service";
import { UiSpriteComponent } from "../basic/ui-sprite.component";
import { environment } from "../../../environments/environment";

@Component({
  selector: "ui-bottom-utils",
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule, UiSpriteComponent],
  template: `<nav class="bottom-nav">
	@for (nav of visibleItems(); track nav.id) {
	
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
	readonly visibleItems = computed(() => environment.production
		? this.theme.bottomUtils().filter((item) => item.id !== "audio-debug")
		: this.theme.bottomUtils());
	
}
