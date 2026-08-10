import { Component, Input, signal } from "@angular/core";
import { IonItem, IonLabel, IonRange } from "@ionic/angular/standalone";
import { UIPanelComponent } from "../../basic/ui-panel.component";
import { UIButtonComponent } from "../../basic/ui-button.component";
import { UIButtonSpriteComponent } from "../../basic/ui-button-sprite.component";
import { defaultLevelRange, defaultMasteryRange } from "../../../core/models/mock/fantasy/utils-data";

@Component({
  selector: "ui-equip-filter-popup",
  standalone: true,
  imports: [IonItem, IonLabel, IonRange, UIPanelComponent, UIButtonComponent, UIButtonSpriteComponent],
  template: `
  <ui-panel [variant]="'light'">
    <div class="filter-popup">
      <div class="equip-preview-title-row">
        <h3 class="equip-preview-title">Filtri equipaggiamento</h3>
        <ui-button-sprite
          class="popup-close-button"
          styleClass="popup-close-button"
          size="sm"
          [frame]="{ name: 'icon-close-large', effect: 'none' }"
          (pressed)="onDismiss?.()"
          ariaLabel="Chiudi popup"
          />
        </div>

      <ion-item lines="none">
        <ion-label>
          Maestria: {{ draftExperienceRange().lower }} - {{ draftExperienceRange().upper }}
        </ion-label>
      </ion-item>
      <ion-range
        [dualKnobs]="true"
        [pin]="true"
        [step]="1"
        [min]="1"
        [max]="15"
        [value]="draftExperienceRange()"
        (ionChange)="onExperienceRangeChange($event)"
      ></ion-range>

      <ion-item lines="none" style="margin-top: 16px;">
        <ion-label>
          Livello: {{ draftLevelRange().lower }} - {{ draftLevelRange().upper }}
        </ion-label>
      </ion-item>
      <ion-range
        [dualKnobs]="true"
        [pin]="true"
        [step]="1"
        [min]="1"
        [max]="10"
        [value]="draftLevelRange()"
        (ionChange)="onLevelRangeChange($event)"
      ></ion-range>

      <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:24px;">
		<ui-button variant="dark" [size]="'sm'" (pressed)="resetFilters()">Reset</ui-button>
		<ui-button variant="primary" [size]="'sm'" (pressed)="applyFilters()">Applica</ui-button>
      </div>
    </div>
	</ui-panel>
  `,
})
export class UIEquipFilterPopupComponent {
  @Input() experienceRange: { lower: number; upper: number } = defaultMasteryRange;
  @Input() levelRange: { lower: number; upper: number } = defaultLevelRange;
  @Input() onDismiss?: (data?: any) => void;
  @Input() onApply?: (filters: { experience: { lower: number; upper: number }; level: { lower: number; upper: number } }) => void;

  readonly draftExperienceRange = signal<{ lower: number; upper: number }>(defaultMasteryRange);
  readonly draftLevelRange = signal<{ lower: number; upper: number }>(defaultLevelRange);

  ngOnInit(): void {
    this.draftExperienceRange.set({ ...this.experienceRange });
    this.draftLevelRange.set({ ...this.levelRange });
  }

  onExperienceRangeChange(event: Event): void {
    const value = (event as CustomEvent<{ value: { lower: number; upper: number } }>).detail.value;
    this.draftExperienceRange.set({ lower: value.lower, upper: value.upper });
  }

  onLevelRangeChange(event: Event): void {
    const value = (event as CustomEvent<{ value: { lower: number; upper: number } }>).detail.value;
    this.draftLevelRange.set({ lower: value.lower, upper: value.upper });
  }

  resetFilters(): void {
    this.draftExperienceRange.set(defaultMasteryRange);
    this.draftLevelRange.set(defaultLevelRange);
  }

  applyFilters(): void {
    this.onApply?.({
      experience: { ...this.draftExperienceRange() },
      level: { ...this.draftLevelRange() },
    });
  }
}
