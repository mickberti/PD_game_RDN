import { ChangeDetectionStrategy, Component, OnInit, inject } from "@angular/core";
import { IonContent } from "@ionic/angular/standalone";
import { AppNavigationService } from "../../core/services/app/navigation/app-navigation.service";
import { GameplaySessionService } from "../../core/services/gameplay/gameplay-session.service";

@Component({
  selector: "app-phaser-game-launcher",
  standalone: true,
  imports: [IonContent],
  template: `<ion-content></ion-content>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhaserGameLauncherPage implements OnInit {
  private readonly nav = inject(AppNavigationService);
  private readonly gameplaySession = inject(GameplaySessionService);

  ngOnInit(): void {
    const session = this.gameplaySession.getActiveSession();
    void this.nav.go(this.gameplaySession.getRouteForVariant(session.variant));
  }
}
