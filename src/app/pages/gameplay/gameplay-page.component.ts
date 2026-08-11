import { AfterViewInit, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, Injector, ViewChild, effect, inject, signal } from "@angular/core";
import { IonContent } from "@ionic/angular/standalone";
import * as Phaser from "phaser";
import { GameplaySessionService } from "../../core/services/gameplay/gameplay-session.service";
import { RdnPuzzleService } from "../../core/services/gameplay/rnd-puzzle.service";
import { AppNavigationService } from "../../core/services/app/navigation/app-navigation.service";
import { RdnPhaserScene } from "../../core/game/phaser/rnd-phaser.scene";

@Component({ selector: "app-gameplay", standalone: true, imports: [IonContent], template: `<ion-content [fullscreen]="true" [scrollY]="false"><div #gameHost class="rnd-phaser-host"></div></ion-content>`, styles: [`:host,ion-content{display:block;height:100%}.rnd-phaser-host{width:100%;height:100%;min-height:100dvh;background:#111;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none}.rnd-phaser-host canvas{display:block;touch-action:none;pointer-events:auto}`], changeDetection: ChangeDetectionStrategy.OnPush })
export class GameplayPageComponent implements AfterViewInit {
  @ViewChild("gameHost", { static: true }) private readonly host!: ElementRef<HTMLDivElement>;
  private readonly session = inject(GameplaySessionService).getActiveSession("adventure");
  private readonly puzzle = inject(RdnPuzzleService);
  private readonly nav = inject(AppNavigationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private game?: Phaser.Game;
  private scene?: RdnPhaserScene;
  private readonly outcome = signal<"win" | "lose" | null>(null);
  constructor() { this.puzzle.load(this.session.variant); this.destroyRef.onDestroy(() => this.game?.destroy(true)); }
  ngAfterViewInit(): void {
    this.scene = new RdnPhaserScene({ rotate: (direction, steps) => this.dispatch({ type: "ROTATE", direction, steps }), impulse: () => this.impulse(), restart: () => this.restart(), undo: () => this.dispatch({ type: "UNDO" }), continue: () => this.continue(), retry: () => this.restart(), exit: () => void this.nav.go("/hub") });
    this.game = new Phaser.Game({ type: Phaser.AUTO, parent: this.host.nativeElement, backgroundColor: "#111714", scale: { mode: Phaser.Scale.RESIZE, width: Math.max(1, this.host.nativeElement.clientWidth), height: Math.max(1, this.host.nativeElement.clientHeight) }, scene: [this.scene] });
    this.game.canvas.style.touchAction = "none";
    this.game.canvas.style.pointerEvents = "auto";
    this.game.canvas.style.display = "block";
    effect(() => { const model = { level: this.puzzle.level(), state: this.puzzle.state(), previews: this.puzzle.previews(), nextPreviews: this.puzzle.nextPreviews(), outcome: this.outcome() }; this.scene?.setModel(model); }, { injector: this.injector });
  }
  private dispatch(action: import("../../core/game/rnd/puzzle.types").PuzzleAction): void { this.puzzle.dispatch(action); this.outcome.set(null); }
  private impulse(): void { this.puzzle.dispatch({ type: "IMPULSE" }); this.outcome.set(this.puzzle.state().won ? "win" : this.puzzle.previews().some((preview) => preview.active) ? null : "lose"); }
  private restart(): void { this.puzzle.dispatch({ type: "RESTART" }); this.outcome.set(null); }
  private continue(): void { this.puzzle.load(this.session.variant, Math.min(50, this.puzzle.level().number + 1)); this.outcome.set(null); }
}
