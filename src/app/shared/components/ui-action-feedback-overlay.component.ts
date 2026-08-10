import { CommonModule, DOCUMENT } from "@angular/common";
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Inject,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
} from "@angular/core";

import { ComponentJuicyEffect, FrameItem } from "../../core/models/game.models";
import { UiSpriteComponent } from "../basic/ui-sprite.component";
import { LoggerService } from "src/app/core/services/infrastructure/logging/logger.service";

export type ActionFeedbackVariant = "gain" | "sell" | "collect" | "open";

export interface ActionFeedbackFrameItem {
  frame?: FrameItem;
  text?: string;
  duration?: number;
  delayAfter?: number;
}

@Component({
  selector: "ui-action-feedback-overlay",
  standalone: true,
  imports: [CommonModule, UiSpriteComponent],
  template: `
    <div
      *ngIf="open"
      class="action-feedback-overlay"
      [class.action-feedback-overlay--dismissible]="dismissible"
      [class.action-feedback-overlay--blocking]="blocking"
      [class.action-feedback-overlay--sequence]="hasSequence"
      [ngClass]="overlayClass"
      role="status"
      aria-live="polite"
      (click)="onOverlayClick()"
    >
      <div
        *ngIf="renderFrame"
        class="action-feedback-stage"
        [ngClass]="stageClasses"
        [attr.data-action-feedback-frame-index]="currentFrameIndex"
        [style.--action-feedback-duration]="currentDuration + 'ms'"
        (click)="onStageClick($event)"
        (animationend)="onAnimationEnd($event)"
      >
        <div class="action-feedback-sprite-motion">
          <div class="action-feedback-sprite-wrap" [ngClass]="spriteEffect">
            <ui-sprite
              *ngIf="currentFrame"
              class="action-feedback-sprite"
              [frame]="currentFrame"
              [fit]="spriteFit"
              [allowUpscale]="allowUpscale"
              [showScale]="false"
            />
          </div>
        </div>

        <div *ngIf="currentText" class="action-feedback-label-motion">
          <div class="action-feedback-label" [ngClass]="labelEffect">
            {{ currentText }}
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`:host { display: contents; }`],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UIActionFeedbackOverlayComponent implements AfterViewInit, OnChanges, OnDestroy {
  private readonly logger = inject(LoggerService);
  private readonly hostElement: HTMLElement;
  private readonly placeholder: Comment;
  private frameTimer?: ReturnType<typeof setTimeout>;
  private playbackVersion = 0;
  private finished = false;
  currentFrameIndex = 0;
  renderFrame = true;

  @Input() open = false;
  @Input() frame?: FrameItem;
  @Input() text = "";
  @Input() frames: ActionFeedbackFrameItem[] = [];
  @Input() variant: ActionFeedbackVariant = "gain";
  @Input() duration = 2000;
  @Input() frameDelay = 0;
  @Input() advanceOnClick = true;
  @Input() dismissible = false;
  @Input() blocking = false;
  @Input() closeOnAnimationEnd = true;
  @Input() allowUpscale = true;
  @Input() spriteFit: "contain" | "cover" | "stretch" | "none" = "contain";
  @Input() spriteEffect: ComponentJuicyEffect | string = "fx-juicy_bounce";
  @Input() labelEffect: ComponentJuicyEffect | string = "fx-juicy_titlespin";
  @Input() overlayClass: string | string[] | Set<string> | { [klass: string]: unknown } = "";

  @Output() closed = new EventEmitter<void>();
  @Output() frameChanged = new EventEmitter<number>();
  @Output() sequenceEnded = new EventEmitter<void>();

  constructor(
    private readonly elementRef: ElementRef<HTMLElement>,
    @Inject(DOCUMENT) private readonly document: Document,
    private readonly changeDetectorRef: ChangeDetectorRef,
  ) {
    this.hostElement = this.elementRef.nativeElement;
    this.placeholder = this.document.createComment("ui-action-feedback-overlay");
  }

  ngAfterViewInit(): void {
    const parent = this.hostElement.parentNode;

    if (!parent || parent === this.document.body) {
      return;
    }

    parent.insertBefore(this.placeholder, this.hostElement);
    this.document.body.appendChild(this.hostElement);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["open"] || changes["frames"] || changes["frame"] || changes["text"] || changes["duration"]) {
      this.resetPlayback();
    }
  }

  ngOnDestroy(): void {
    this.clearFrameTimer();

    if (this.placeholder.parentNode) {
      this.placeholder.parentNode.insertBefore(this.hostElement, this.placeholder);
      this.placeholder.remove();
      return;
    }

    this.hostElement.remove();
  }

  get hasSequence(): boolean {
    return this.frames.length > 0;
  }

  get currentItem(): ActionFeedbackFrameItem | undefined {
    this.logger.logInfo('[UIActionFeedbackOverlayComponent] currentItem', this.frames[this.currentFrameIndex]);
    return this.hasSequence ? this.frames[this.currentFrameIndex] : undefined;
  }

  get currentFrame(): FrameItem | undefined {
    return this.currentItem?.frame ?? this.frame;
  }

  get currentText(): string {
    return this.currentItem?.text ?? this.text;
  }

  get currentDuration(): number {
    return this.normalizeTime(this.currentItem?.duration, this.duration);
  }

  get currentDelayAfter(): number {
    return this.normalizeTime(this.currentItem?.delayAfter, this.frameDelay);
  }

  get stageClasses(): string[] {
    return [
      `action-feedback-stage--${this.variant}`,
      this.spriteEffect ? "action-feedback-stage--has-sprite-effect" : "",
      this.labelEffect ? "action-feedback-stage--has-label-effect" : "",
    ].filter(Boolean);
  }

  onOverlayClick(): void {
    if (this.tryAdvanceFromClick()) {
      return;
    }

    if (!this.dismissible) {
      return;
    }

    this.closed.emit();
  }

  onStageClick(event: MouseEvent): void {
    event.stopPropagation();
    this.tryAdvanceFromClick();
  }

  onAnimationEnd(event: AnimationEvent): void {
    this.logger.logInfo('[UIActionFeedbackOverlayComponent] onAnimationEnd', event);
    if (!this.isPrimarySpriteAnimation(event)) {
      return;
    }

    if (this.hasSequence) {
      this.scheduleNextFrame();
      return;
    }

    if (!this.closeOnAnimationEnd) {
      return;
    }

    this.finishPlayback(false);
  }

  private resetPlayback(): void {
    this.playbackVersion += 1;
    this.finished = false;
    this.clearFrameTimer();
    this.currentFrameIndex = 0;
    this.renderFrame = true;

    if (this.open && this.hasSequence) {
      this.frameChanged.emit(this.currentFrameIndex);
    }
  }

  private tryAdvanceFromClick(): boolean {
    if (!this.open || this.finished || !this.hasSequence || !this.advanceOnClick) {
      return false;
    }

    this.goToNextFrame(this.playbackVersion);
    return true;
  }

  private scheduleNextFrame(): void {
    this.clearFrameTimer();

    if (!this.closeOnAnimationEnd || this.finished) {
      return;
    }

    const scheduledPlaybackVersion = this.playbackVersion;
    this.frameTimer = setTimeout(() => this.goToNextFrame(scheduledPlaybackVersion), this.currentDelayAfter);
  }

  private goToNextFrame(expectedPlaybackVersion: number): void {
    this.logger.logInfo('[UIActionFeedbackOverlayComponent] expectedPlaybackVersion', this.currentFrameIndex , this.frames.length - 1);
    this.clearFrameTimer();

    if (this.finished || expectedPlaybackVersion !== this.playbackVersion) {
      return;
    }

    if (this.currentFrameIndex >= this.frames.length - 1) {
      this.finishPlayback(true);
      return;
    }

    this.currentFrameIndex += 1;
    this.restartFrameAnimation();
    this.frameChanged.emit(this.currentFrameIndex);
  }

  private restartFrameAnimation(): void {
    this.renderFrame = false;
    this.changeDetectorRef.detectChanges();
    this.renderFrame = true;
    this.changeDetectorRef.markForCheck();
  }

  private clearFrameTimer(): void {
    if (!this.frameTimer) {
      return;
    }

    clearTimeout(this.frameTimer);
    this.frameTimer = undefined;
  }

  private finishPlayback(emitSequenceEnded: boolean): void {
    if (this.finished) {
      return;
    }

    this.finished = true;
    this.clearFrameTimer();

    if (emitSequenceEnded) {
      this.sequenceEnded.emit();
    }

    this.closed.emit();
  }

  private isPrimarySpriteAnimation(event: AnimationEvent): boolean {
    if (event.animationName !== this.animationNameForVariant()) {
      return false;
    }

    return event.target instanceof HTMLElement && event.target.classList.contains("action-feedback-sprite-motion");
  }

  private normalizeTime(value: number | undefined, fallback: number): number {
    const nextValue = value ?? fallback;
    const validFallback = Number.isFinite(fallback) && fallback >= 0 ? fallback : 0;
    return Number.isFinite(nextValue) && nextValue >= 0 ? nextValue : validFallback;
  }

  private animationNameForVariant(): string {
    if (this.variant === "sell") {
      return "action-feedback-sprite-sell";
    }

    if (this.variant === "collect") {
      return "action-feedback-sprite-collect";
    }

    return "action-feedback-sprite-pop";
  }
}
