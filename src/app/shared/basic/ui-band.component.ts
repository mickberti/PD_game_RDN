import { ChangeDetectionStrategy, Component, Input } from "@angular/core";
import { CommonModule, NgClass } from "@angular/common";
import { ComponentMode } from "../../core/models/game.models";

@Component({
  selector: "ui-band",
  standalone: true,
  imports: [NgClass, CommonModule],
  template: `
  <div class="band-wrapper">
  <section [ngClass]="[getClasses(), styleClass]">
  	<span class="band-title" *ngIf="title">{{title}}</span>
	<ng-content></ng-content>
  </section>
  <div>`,

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UIBandComponent {
  @Input() variant: ComponentMode = "primary";
  @Input() styleClass =  "";
  @Input() title: string | undefined =  "";
  
  getClasses() {
	  return this.variant + "-band";
  }
  

}
