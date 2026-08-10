import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from "@angular/core";
import { CommonModule, NgClass } from "@angular/common";
import { UiContentTabsComponent } from "./ui-content-tabs.component";
import { ComponentMode, UiTabItem } from "../../core/models/game.models";

@Component({
  selector: "ui-content-panel",
  standalone: true,
  imports: [NgClass, CommonModule, UiContentTabsComponent],
  template: `<section class="ui-content-panel" [ngClass]="[getClasses(), styleClass, variant]">
	  <div class="horizontal-menu" *ngIf="horizontalTabs.length">
	  	<ui-content-tabs [tabs]="horizontalTabs" [selected]="horizontalSelected" (selectedChange)="selectHorizontal($event)"/>
	  </div>
	  
	  <div class="vertical-menu" *ngIf="verticalTabs.length">
	  	<ui-content-tabs [tabs]="verticalTabs" [selected]="verticalSelected" direction="vertical" (selectedChange)="selectVertical($event)"/>
	  </div>
  
  	<span class="panel-title" *ngIf="title">{{title}}</span>
	<div class="panel-content">
    <ng-content></ng-content>
	</div>
  </section>`,

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UIContentPanelComponent {
  @Input() variant: ComponentMode  = "none";
  @Input() styleClass =  "";
  @Input() title: string | undefined =  "";
  @Input() horizontalSelected = '';
  @Input() verticalSelected = '';
  @Input() horizontalTabs: UiTabItem[] = [];
  @Input() verticalTabs: UiTabItem[] = [];
  @Output() readonly horizontalChange = new EventEmitter<string>();
  @Output() readonly verticalChange = new EventEmitter<string>();
  
  getClasses() {
	//elenco completo di classi da applicare al pannello, in base alle proprietà
	//"panel-sm-light"
	//"panel-sm-light-title"
	//"panel-sm-strong"
	//"panel-sm-strong-title"

	//"panel-md-light"
	//"panel-md-light-title"
	//"panel-md-strong"
	//"panel-md-strong-title"

	
	  return "panel" + (this.title ? "-title" : "")+ "-" + this.variant;
  }
  
  selectHorizontal(id: string): void {
    this.horizontalChange.emit(id);
  }
  
  selectVertical(id: string): void {
    this.verticalChange.emit(id);
  }
}
