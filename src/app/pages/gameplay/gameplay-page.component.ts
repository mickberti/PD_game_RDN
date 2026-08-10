import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { IonContent } from "@ionic/angular/standalone";
import { GameplaySessionService } from "../../core/services/gameplay/gameplay-session.service";

/**
 * Stable Angular host for the new game engine. The Phaser 4 bootstrap will mount
 * here while keeping game selection and session state outside the renderer.
 */
@Component({
  selector: "app-gameplay",
  standalone: true,
  imports: [IonContent],
  template: `<ion-content><main id="gameplay-root" [attr.data-variant]="session.variant"></main></ion-content>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameplayPageComponent {
  readonly session = inject(GameplaySessionService).getActiveSession("adventure");
}
