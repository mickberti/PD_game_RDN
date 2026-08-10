import { CommonModule } from "@angular/common";
import { Component, EventEmitter, inject, Input, Output } from "@angular/core";
import { FrameItem, HeroAttribute, HeroItem, IconItem, PriceItem } from "../../../core/models/game.models";
import { HeroProgressService } from "../../../core/services/progression/hero-progress.service";
import { defaultFrame, defaultHeroAttribute, defaultIcon } from "../../../core/models/mock/fantasy/utils-data";
import { UIButtonComponent } from "../../basic/ui-button.component";
import { UIPillComponent } from "../../basic/ui-pill.component";
import { UIProgressbarComponent } from "../../basic/ui-progress-bar.component";
import { UiSpriteComponent } from "../../basic/ui-sprite.component";

@Component({
  selector: "ui-upgrade-box",
  standalone: true,
  imports: [CommonModule, UIButtonComponent, UIPillComponent, UiSpriteComponent, UIProgressbarComponent],
  template: `  <article class="upgrade-row" role="button" tabindex="0" [attr.aria-label]="'Apri dettaglio statistica '+ attribute.title" (click)="pressed.emit()" (keydown.enter)="pressed.emit()" (keydown.space)="pressed.emit()" >
  
  
  
  	<div class="u-desc">

	  		<div class="u-desc-icon">
	  			<ui-sprite [frame]="attribute.frame ?? defaultFrame" />
	  		</div>
			
			<div>
		  		<div class="u-desc-title  stat-progress-with-modifiers">
		  			<div class="u-title-text">
		  				{{ attribute.title }}
		  			</div>
					<div class="stat-modifiers" aria-label="Bonus e malus statistica">
						<span class="stat-modifier stat-bonus">+{{ attribute.bonus | number:'1.0-0' }}</span>
						<span class="stat-modifier stat-malus">-{{ attribute.malus | number:'1.0-0' }}</span>
					</div>
		  		</div>
		
		  		<div class="u-progress">
		  			<ui-progress-bar [progress]="attribute.progress" />

		  		</div>
			</div>
			
			<div class="u-desc-action" style="pointer-events: none;">
				<ui-button variant="secondary" [disabled]="!canUpgrade" size="md">
					<ui-pill [frame]="upgradePrice?.frame ?? defaultFrame" size="sm" [value]="upgradePrice?.amount"/>
				</ui-button>
			</div>

  	</div>




  </article>`,
  styles: [`
    .stat-progress-with-modifiers {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .stat-progress-with-modifiers ui-progress-bar {
      flex: 1 1 auto;
      min-width: 0;
    }

    .stat-modifiers {
      display: inline-flex;
      gap: 4px;
      flex: 0 0 auto;
      font-size: 0.72rem;
      font-weight: 800;
      line-height: 1;
    }

    .stat-modifier {
      border-radius: 999px;
      padding: 3px 6px;
      background: rgba(15, 23, 42, 0.62);
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.18);
    }

    .stat-bonus { color: var(--color-green); }
    .stat-malus { color: var(--color-red); }
  `],

})
export class UIUpgradeBoxComponent {
	private readonly heroProgress = inject(HeroProgressService);
	
  @Input() item: HeroAttribute = defaultHeroAttribute;
  @Input() hero: HeroItem | null = null;
	
	@Output() pressed = new EventEmitter<void>();
	defaultFrame: FrameItem = defaultFrame;
	defaultIcon: IconItem = defaultIcon;
	defaultAttribute: HeroAttribute = defaultHeroAttribute;
							

	get attribute(): HeroAttribute {
		return this.item ?? this.defaultAttribute;
	}

	get currentHero(): HeroItem | null {
		return this.hero ?? this.heroProgress.getSelectedHero() ?? null;
	}

	get upgradePrice(): PriceItem | undefined {
		if (!this.currentHero) return undefined;
		const cost = this.heroProgress.heroStatUpgradeCost(this.currentHero, this.attribute.id);
		return cost?.coin ?? (cost?.resource ? {
			frame: cost.resource.item.frame,
			type: cost.resource.item.price?.type ?? "dust",
			amount: cost.resource.amount,
		} : undefined);
	}

	get canUpgrade(): boolean {
		return !!this.currentHero && this.heroProgress.canUpgradeHeroStat(this.currentHero, this.attribute.id);
	}

}
export { UIUpgradeBoxComponent as UIUpgradeChestComponent };
