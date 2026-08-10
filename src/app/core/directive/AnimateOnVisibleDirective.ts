import {
  AfterViewInit,
  Directive,
  ElementRef,
  HostBinding,
  Input,
  OnDestroy
} from '@angular/core';

@Directive({
  selector: '[appAnimateOnVisible]',
  standalone: true
})
export class AnimateOnVisibleDirective implements AfterViewInit, OnDestroy {
  @Input('appAnimateOnVisible') effect = 'animate-in';
  @Input() threshold = 0.2;
  @Input() once = true;

  @HostBinding('class')
  hostClass = '';

  private observer?: IntersectionObserver;

  constructor(private elementRef: ElementRef<HTMLElement>) {}

  ngAfterViewInit(): void {
    this.observer = new IntersectionObserver(
      entries => {
        const entry = entries[0];

        if (entry.isIntersecting) {
          this.addAnimationClass();

          if (this.once) {
            this.observer?.disconnect();
          }
        } else if (!this.once) {
          this.removeAnimationClass();
        }
      },
      {
        threshold: this.threshold
      }
    );

    this.observer.observe(this.elementRef.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  private addAnimationClass(): void {
    const element = this.elementRef.nativeElement;
    element.classList.add(this.effect);
  }

  private removeAnimationClass(): void {
    const element = this.elementRef.nativeElement;
    element.classList.remove(this.effect);
  }
}