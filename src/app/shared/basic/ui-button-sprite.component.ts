import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from "@angular/core";
import { NgClass, NgFor, NgIf } from "@angular/common";
import { UiSpriteComponent } from "./ui-sprite.component";
import { ComponentSize, FrameItem, UIButtonParticleItem, UIButtonParticleMode } from "../../core/models/game.models";
import { createUIButtonParticles } from "./ui-button-particles";

@Component({
  selector: "ui-button-sprite",
  standalone: true,
  imports: [NgClass, NgFor, NgIf, UiSpriteComponent],
  template: `<button
    class="ui-button-sprite"
    [ngClass]="[styleClass, buttonSize()]"
    [disabled]="disabled"
    [attr.aria-label]="ariaLabel || null"
    [class.active]="active"
    [class.ui-button-particle-mode]="hasParticles()"
    (click)="handleClick()"
  >
    <span class="ui-button-content">
      <ui-sprite [frame]="frame"/>
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
          [frame]="{ name: particle.frameName, effect: 'fx-power-glow' }"
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
export class UIButtonSpriteComponent {
  @Input() disabled = false;
  @Input() active = false;
  @Input() styleClass: string = '';
  @Input() ariaLabel: string = '';
  @Input() frame: FrameItem = { name: '', effect: 'none' };
  @Input() size: ComponentSize = 'md';
  @Input() particleMode: UIButtonParticleMode = 'none';
  @Output() pressed = new EventEmitter<void>();

  particles: UIButtonParticleItem[] = [];

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

}
