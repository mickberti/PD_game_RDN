import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { atlas } from "src/assets/ui/racing-hud-atlas";


@Component({
  selector: "app-game-mode",
  standalone: true,
  imports: [ CommonModule],

  template: `

  <div class="hud-scene">

    <!-- BACKGROUND -->
    <div class="road"></div>

    <!-- SPEEDOMETER -->
    <div class="speedometer">
      <img src="assets/ui/racing-hud.png" class="hud-sheet" />

      <!-- lancetta animata -->
      <div class="needle"></div>

      <!-- glow -->
      <div class="speed-glow"></div>
    </div>

    <!-- FUEL -->
    <div class="fuel-wrapper">
      <img src="assets/ui/racing-hud.png" class="hud-sheet fuel-sheet" />

      <div class="fuel-fill"></div>
    </div>

    <!-- COUNTDOWN -->
    <div class="countdown">
      <span>3</span>
    </div>

    <!-- PEDAL -->
    <button class="pedal accelerate">
      <img src="assets/ui/racing-hud.png" />
    </button>

    <!-- TROPHY -->
    <div class="trophy">
      <img src="assets/ui/racing-hud.png" />
    </div>

  </div>`,
})
export class AnimationPage {
	
	atlas = atlas.frames;

	getStyle(frameName: string) {

	  const frame = this.atlas[frameName as keyof typeof this.atlas].frame;

	  return {
	    width: `${frame.w}px`,
	    height: `${frame.h}px`,
	    backgroundImage: `url(assets/ui/racing-hud.png)`,
	    backgroundPosition: `-${frame.x}px -${frame.y}px`
	  };
	}
}
