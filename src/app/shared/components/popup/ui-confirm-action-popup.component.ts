import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, EventEmitter, inject, Input, Output } from "@angular/core";

import { FrameItem, PriceItem } from "../../../core/models/game.models";
import { GameUtilsService } from "../../../core/services/ui/formatting/game-utils.service";
import { UIButtonComponent } from "src/app/shared/basic/ui-button.component";
import { UIButtonSpriteComponent } from "src/app/shared/basic/ui-button-sprite.component";
import { UIPillComponent } from "src/app/shared/basic/ui-pill.component";
import { UiSpriteComponent } from "src/app/shared/basic/ui-sprite.component";
import { UIPanelComponent } from "../../basic/ui-panel.component";

@Component({
  selector: "ui-confirm-action-popup",
  standalone: true,
  imports: [CommonModule, UIButtonComponent, UIButtonSpriteComponent, UIPillComponent, UiSpriteComponent, UIPanelComponent],
  template: `
    @if (open) {
      <div class="modal-backdrop" role="dialog" aria-modal="true" [attr.aria-label]="ariaLabel">
        <section class="modal confirm-action-modal">
		<ui-panel variant="light" styleClass="box-detail-panel">


          <div class="confirm-action-title-row">
            <h2 class="confirm-action-text">{{ text }}</h2>
            <ui-button-sprite
              class="popup-close-button"
              styleClass="popup-close-button"
              size="sm"
              [frame]="{ name: 'icon-close-large', effect: 'none' }"
              (pressed)="cancel.emit()"
              ariaLabel="Chiudi popup"
            />
          </div>

		  <div class="confirm-action-preview">
		    <ui-sprite [frame]="frame" fit="contain" anchor="center" />
		  </div>

          <div>
            <ui-button variant="primary" (pressed)="confirm.emit()">
              <span>{{ confirmLabel }}</span>
              @if (price) {
                <ui-pill
                  [frame]="price.frame"
                  size="sm"
                  [value]="formattedPriceAmount(price.amount)"
                />
              }
            </ui-button>
          </div>
		  </ui-panel>
        </section>
      </div>
    }
  `,
  styles: [`
    .confirm-action-modal {
      display: grid;
      gap: 14px;
      justify-items: center;
      text-align: center;
      padding: 32px 24px 24px;
    }

    .confirm-action-preview {
      height: 96px;
      display: grid;
      place-items: center;
    }

    .confirm-action-title-row {
      display: grid;
      grid-template-columns: 32px minmax(0, 1fr) 32px;
      align-items: start;
      width: 100%;
      gap: 8px;
    }

    .confirm-action-title-row .popup-close-button {
      grid-column: 3;
      justify-self: end;
    }

    .confirm-action-text {
      grid-column: 2;
      font-size: 26px;
      line-height: 1.15;
      margin: 0;
    }

    .confirm-action-price {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-size: 18px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UIConfirmActionPopupComponent {
  private readonly utils = inject(GameUtilsService);

  @Input() open = false;
  @Input() text = "";
  @Input() frame: FrameItem = { name: "none", effect: "none" };
  @Input() price?: PriceItem | null;
  @Input() pricePrefix = "Price";
  @Input() confirmLabel = "Conferma";
  @Input() cancelLabel = "No";
  @Input() ariaLabel = "Popup di conferma";
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  formattedPriceAmount(value: number): string {
    return this.utils.formatCompactNumber(value);
  }

  get priceLabel(): string {
    if (!this.price) return "";
    return `${this.pricePrefix} ${this.formattedPriceAmount(this.price.amount)} ${this.price.type}`;
  }
}
