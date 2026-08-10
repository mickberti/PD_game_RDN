import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { IonContent, IonFooter, IonToolbar } from "@ionic/angular/standalone";
import { UIBottomUtilsComponent } from "src/app/shared/components/ui-bottom-utils.component";
import { UiUtilsPageHeaderComponent } from "src/app/shared/components/ui-utils-page-header.component";
import { atlas } from "src/assets/ui/racing-hud-atlas";


@Component({
  selector: "app-game-mode",
  standalone: true,
  imports: [ CommonModule, IonContent, IonToolbar, IonFooter, UIBottomUtilsComponent, UiUtilsPageHeaderComponent],

  template: `
  <ion-content>
  	<div class="screen animation-screen">

	<ui-utils-page-header
	  group="component"
	  title="Component Animation"
	  description="Anteprima animata dei componenti HUD e delle icone UI basate su atlas."
	/>

	<div class="scene">

	  <!-- RPM -->
	  <div class="hud rpm" [ngStyle]="getStyle('rpm_gauge')">

	    <div class="needle"></div>

	  </div>

	  <!-- SPEED -->
	  <div class="hud speed" [ngStyle]="getStyle('speedometer_main')">

	    <div class="needle speed-needle"></div>

	  </div>

	  <!-- FUEL -->
	  <div class="hud fuel" [ngStyle]="getStyle('fuel_gauge')">

	    <div class="fuel-mask">
	      <div class="fuel-fill"></div>
	    </div>

	  </div>

	  <!-- PEDAL -->
	  <button class="pedal"
	          [ngStyle]="getStyle('pedal_accelerator')">
	  </button>

	  <!-- TRAFFIC LIGHT -->
	  <div class="traffic-light">

	    <div class="a-light red active"
	         [ngStyle]="getStyle('traffic_red')">
	    </div>

	    <div class="a-light yellow"
	         [ngStyle]="getStyle('traffic_yellow')">
	    </div>

	    <div class="a-light green"
	         [ngStyle]="getStyle('traffic_green')">
	    </div>

	  </div>

	  <!-- COUNTDOWN -->
	  <div class="countdown"
	       [ngStyle]="getStyle('countdown_go')">
	  </div>

	  <!-- TROPHY -->
	  <div class="trophy"
	       [ngStyle]="getStyle('trophy_gold')">
	  </div>


  </div>
  </div>
  </ion-content>
  
  <ion-footer>
  <ion-toolbar>
    <ui-bottom-utils />
  </ion-toolbar>
  </ion-footer>`,
  styleUrls: ['./animation.page.scss']
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
