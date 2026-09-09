import { Component, computed, inject } from "@angular/core";
import { RouterLink, RouterLinkActive } from "@angular/router";
import { ThemeService } from "../../core/services/app/theme/theme.service";
import { CommonModule } from "@angular/common";
import { AppNavigationService } from "../../core/services/app/navigation/app-navigation.service";
import { UiSpriteComponent } from "../basic/ui-sprite.component";
import { GameStateService } from "../../core/services/state/game-state.service";
import { AwardProgressionService } from "../../core/services/progression/award-progression.service";

@Component({
  selector: "ui-bottom-nav",
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule, UiSpriteComponent],
  template: `<nav class="bottom-nav">
  @for (nav of theme.bottomNav(); track nav.id) {
	
    <a [routerLink]="nav.route" [routerLinkActive]="nav.active">
	  <span class="badge" *ngIf="nav.id === 'reward' ? hasClaimableAwards() : nav.badge">!</span>
	  <div class="nav-sprite">
	  	<ui-sprite [frame]="nav.frame" />
	  </div>
	  <span>{{nav.title}}</span>
	</a>
	}
  </nav>`,
})
export class UIBottomNavComponent {
	readonly theme = inject(ThemeService);
	readonly nav = inject(AppNavigationService);
	private readonly state = inject(GameStateService);
	private readonly awardProgression = inject(AwardProgressionService);
	readonly hasClaimableAwards = computed(() => this.awardProgression
	  .resolveVisibleAwards(this.state.catalog().awards, this.state.progress())
	  .some((award) => award.state === "collect"));
	
}
