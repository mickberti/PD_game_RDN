import {
  Directive,
  ElementRef,
  HostListener,
  Input,
  Renderer2,
  inject
} from '@angular/core';

@Directive({
  selector: '[appJuice]',
  exportAs: 'appJuice',
  standalone: true
})
export class JuiceDirective {
  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly renderer = inject(Renderer2);
  private activeEffect = '';
  private cleanupTimer?: number;

  @Input('appJuice') effect = 'juicy__bounce';

  play(effect = this.effect): void {
    const native = this.el.nativeElement;
    const effectClass = this.resolveEffectClass(effect);

    this.clearActiveEffect();
    this.renderer.removeClass(native, effectClass);

    // forza il reflow: necessario per riavviare la stessa animazione
    void native.offsetWidth;

    this.renderer.addClass(native, effectClass);
    this.activeEffect = effectClass;
    this.scheduleCleanup(native);
  }

  @HostListener('animationend')
  onAnimationEnd(): void {
    this.clearActiveEffect();
  }

  private clearActiveEffect(): void {
    if (this.cleanupTimer) {
      window.clearTimeout(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    if (!this.activeEffect) {
      return;
    }

    this.renderer.removeClass(this.el.nativeElement, this.activeEffect);
    this.activeEffect = '';
  }

  private resolveEffectClass(effect: string): string {
    if (effect.startsWith('fx-juicy')) {
      return effect;
    }

    return `fx-${effect.split('__').join('_')}`;
  }

  private scheduleCleanup(native: HTMLElement): void {
    const styles = window.getComputedStyle(native);
    const duration = this.parseTimeList(styles.animationDuration);
    const delay = this.parseTimeList(styles.animationDelay);
    const iterations = this.parseIterationCount(styles.animationIterationCount);
    const totalDuration = (duration * iterations) + delay;

    if (!Number.isFinite(totalDuration) || totalDuration <= 0) {
      return;
    }

    this.cleanupTimer = window.setTimeout(() => {
      this.clearActiveEffect();
    }, totalDuration + 50);
  }

  private parseTimeList(value: string): number {
    return Math.max(
      ...value.split(',').map(item => this.parseTime(item.trim())),
      0
    );
  }

  private parseTime(value: string): number {
    if (value.endsWith('ms')) {
      return Number.parseFloat(value);
    }

    if (value.endsWith('s')) {
      return Number.parseFloat(value) * 1000;
    }

    return 0;
  }

  private parseIterationCount(value: string): number {
    const iterations = value
      .split(',')
      .map(item => item.trim() === 'infinite' ? 1 : Number.parseFloat(item.trim()))
      .filter(item => Number.isFinite(item) && item > 0);

    return Math.max(...iterations, 1);
  }
}
