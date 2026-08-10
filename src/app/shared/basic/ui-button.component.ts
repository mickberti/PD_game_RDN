import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  Output,
  ViewChild,
} from "@angular/core";
import { NgClass, NgFor, NgIf } from "@angular/common";
import { ComponentSize, UIButtonParticleItem, UIButtonParticleMode } from "../../core/models/game.models";
import { createUIButtonParticles } from "./ui-button-particles";
import { UiSpriteComponent } from "./ui-sprite.component";
import { GameUtilsService } from "../../core/services/ui/formatting/game-utils.service";

@Component({
  selector: "ui-button",
  standalone: true,
  imports: [NgClass, NgFor, NgIf, UiSpriteComponent],
  template: `<button
    class="ui-button"
    [ngClass]="[variant, buttonSize(), styleClass]"
    [disabled]="disabled"
    [class.active]="active"
    [class.ui-button-particle-mode]="hasParticles()"
    (click)="handleClick()"
  >
    <span class="ui-button-content" #buttonContent>
      <ng-content></ng-content>
    </span>

    <span *ngIf="hasParticles()" class="ui-button-particles" aria-hidden="true">
      <span
        class="ui-button-particle"
        *ngFor="let particle of particles; trackBy: trackByParticleId"
        [ngClass]="particle.effectClass"
        [style.--particle-jump]="particle.jump"
        [style.--particle-direction]="particle.direction"
        [style.--particle-spin]="particle.spin"
        [style.--particle-size]="particle.size"
        [style.left.%]="particle.originX"
        [style.bottom.%]="particle.originY">
        <ui-sprite
          *ngIf="particle.frameName; else fallbackParticle"
          [frame]="{ name: particle.frameName, effect: 'none' }"
          [showScale]="false"
          fit="contain" />
        <ng-template #fallbackParticle>
          <span class="ui-button-particle-dot"></span>
        </ng-template>
      </span>
    </span>
  </button>`,

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UIButtonComponent implements AfterViewChecked {
  private readonly utils = inject(GameUtilsService);

  @Input() variant: "primary" | "secondary" | "complementary" | "light" | "dark" | "settings-toggle" | "arrow-sx" | "arrow-dx" | "none"  = "primary";
  @Input() disabled = false;
  @Input() active = false;
  @Input() size: ComponentSize = 'md';
  @Input() styleClass: string = '';
  @Input() particleMode: UIButtonParticleMode = 'none';
  @Output() pressed = new EventEmitter<void>();
  @ViewChild('buttonContent') private readonly buttonContent?: ElementRef<HTMLElement>;

  particles: UIButtonParticleItem[] = [];

  ngAfterViewChecked(): void {
    this.formatProjectedNumericText();
  }

  buttonSize(): string{
    return 'ui-button-' + (this.size ? this.size : 'md');
  }

  handleClick(): void {
    if (this.hasParticles()) {
      this.createParticles();
    }

    this.pressed.emit();
  }

  hasParticles(): boolean {
    return this.particleMode !== 'none';
  }

  trackByParticleId(_index: number, particle: UIButtonParticleItem): string {
    return particle.id;
  }

  private createParticles(): void {
    this.particles = createUIButtonParticles(this.particleMode);
  }

  private formatProjectedNumericText(): void {
    const hostElement = this.buttonContent?.nativeElement;

    if (!hostElement) {
      return;
    }

    this.formatTextNodes(hostElement);
  }

  private formatTextNodes(node: Node): void {
    node.childNodes.forEach((childNode) => {
      if (childNode.nodeType === Node.TEXT_NODE) {
        const currentValue = childNode.textContent ?? '';
        const formattedValue = this.utils.formatCompactNumbersInText(currentValue);

        if (formattedValue !== currentValue) {
          childNode.textContent = formattedValue;
        }

        return;
      }

      this.formatTextNodes(childNode);
    });
  }

}
