import { AsyncPipe, NgClass, NgFor, NgIf } from "@angular/common";
import { ChangeDetectionStrategy, Component } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { IonContent, IonFooter, IonHeader, IonToolbar } from "@ionic/angular/standalone";
import { JuiceDirective } from "../../core/directive/juice.directive";
import { GameplaySessionVariant } from "../../core/models/gameplay-session.model";
import { UIButtonComponent } from "../../shared/basic/ui-button.component";
import { UIButtonSpriteComponent } from "../../shared/basic/ui-button-sprite.component";
import { UIContentPanelComponent } from "../../shared/basic/ui-content-panel.component";
import { UIPillComponent } from "../../shared/basic/ui-pill.component";
import { UIProgressbarComponent } from "../../shared/basic/ui-progress-bar.component";
import { UiSpriteComponent } from "../../shared/basic/ui-sprite.component";
import { PhaserGamePageBase } from "./phaser-game-page.base";
import { buildGameplayVariantView } from "./gameplay-variant-defaults";

@Component({
  selector: "app-phaser-adventure-game-page",
  standalone: true,
  imports: [
    AsyncPipe,
    FormsModule,
    IonContent,
    IonFooter,
    IonHeader,
    IonToolbar,
    NgClass,
    NgFor,
    NgIf,
    UIButtonComponent,
    UIButtonSpriteComponent,
    UIContentPanelComponent,
    UIPillComponent,
    UIProgressbarComponent,
    UiSpriteComponent,
    JuiceDirective,
  ],
  templateUrl: "./phaser-game-page.component.html",
  styleUrl: "./phaser-game-page.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhaserAdventureGamePageComponent extends PhaserGamePageBase {
  protected get gameplayVariant(): GameplaySessionVariant {
    return "adventure";
  }

  protected buildGameplayView(modeTitle: string) {
    return buildGameplayVariantView("adventure", modeTitle);
  }
}
