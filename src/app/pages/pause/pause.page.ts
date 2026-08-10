import { Component, inject } from "@angular/core";
import { IonContent } from "@ionic/angular/standalone";
import { Router } from "@angular/router";
import { UIButtonComponent } from "src/app/shared/basic/ui-button.component";

@Component({
  selector: "app-pause",
  standalone: true,
  imports: [IonContent,  UIButtonComponent],

  template: `

  <ion-content >
    
    <div class="screen pause-screen">
    <div class="road-bg"></div>
    
    <section class="pause-box">
	  <ui-button variant="primary" (pressed)="go('/gameplay')" >▶</ui-button>
	  <ui-button variant="complementary" (pressed)="go('/hub')" >Home</ui-button>
    </section>
	</div>
  </ion-content>
`,
})
export class PausePage {
  private readonly router = inject(Router);
  go(route: string): void {
    this.router.navigateByUrl(route);
  }
}
