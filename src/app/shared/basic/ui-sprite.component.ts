import { CommonModule, NgClass, NgStyle } from '@angular/common';
import {
	Component,
	Input,
	ChangeDetectionStrategy,
	computed,
	signal,
	inject,
	effect,
	OnDestroy,
	AfterViewInit,
	ViewChild,
	ElementRef,
	SimpleChanges
} from '@angular/core';
import { FrameItem } from '../../core/models/game.models';
import { AtlasFrame, AtlasService, AtlasSource } from '../../core/services/ui/assets/atlas.service';
import { ThemeService } from '../../core/services/app/theme/theme.service';

type SpriteFit =
  | 'contain'
  | 'cover'
  | 'stretch'
  | 'none';
  
  type SpriteAnchor =
    | 'top-left'
    | 'top-center'
    | 'top-right'
    | 'center-left'
    | 'center'
    | 'center-right'
    | 'bottom-left'
    | 'bottom-center'
    | 'bottom-right';
	
@Component({
	selector: 'ui-sprite',
	standalone: true,
	imports: [NgStyle, NgClass, CommonModule],
	template: `
	<div #container class="sprite-container">

	  <div class="sprite"
	  	[ngClass]="getEffect()"
	    [ngStyle]="style()">
	  </div>
	  <div class="badge" *ngIf="badge">{{badge}} </div>
	  <div class="scale" *ngIf="showScale">{{scale()}} </div>
	  <div class="name" *ngIf="showName">{{frameNm()}} </div>
	</div>
  `,
	styles: [`
		:host {
		  display: block;
		  width: 100%;
		  height: 100%;
		}


		
  `],
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class UiSpriteComponent implements AfterViewInit, OnDestroy{


	@ViewChild('container', { static: true })
	container!: ElementRef<HTMLDivElement>;
	
	/**
	 * Path atlas image
	 * Example:
	 * /assets/ui/fantasy_bg/top1-set4.png
	 */
	
	@Input()
	frame!: FrameItem;

	/** Restricts frame resolution to a specific atlas when names may overlap. */
	@Input()
	atlasSource?: AtlasSource;
	
	@Input()
	badge!: string;
	
	/**
	 * Allow upscale
	 */
	@Input()
	showName = false;
	/**
	 * Allow upscale
	 */
	@Input()
	showScale = true;
		
	/**
	 * Allow upscale
	 */
	@Input()
	allowUpscale = false;

	/**
	 * contain | cover | stretch | none
	 */
	@Input()
	fit: SpriteFit = 'contain';
	
	/**
	 * Sprite anchor
	 */
	@Input()
	anchor: SpriteAnchor = 'center';
	
	readonly atlasService = inject(AtlasService);
	readonly theme = inject(ThemeService);
	private resizeObserver?: ResizeObserver;
	readonly scale = signal(1);
	/**
	 * Container size
	 */
	private readonly containerWidth = signal(0);

	private readonly containerHeight = signal(0);
	  

	/**
	 * Current atlas frame
	 */
	private readonly frameSignal =  signal<AtlasFrame | null>(null);

	private readonly themeRefresh = effect(() => {
	  this.theme.activeTheme();
	  this.loadFrame();
	});

	readonly frameNm = computed(() => {
		return this.frame ? 'fr'+this.frame.name : 'none';
	});
	

	/**
	 * Main style computed
	 */
	readonly style = computed(() => {

	  const frame = this.frameSignal();

	  if (!frame) {
	    return {};
	  }

	  const containerWidth =
	    this.containerWidth();

	  const containerHeight =
	    this.containerHeight();

	  if (!containerWidth || !containerHeight) {
	    return {};
	  }

	  let scaleX =
	    containerWidth / frame.width;

	  let scaleY =
	    containerHeight / frame.height;

	  let scale = 1;

	  switch (this.fit) {

	    case 'contain':
	      scale = Math.min(scaleX, scaleY);
	      break;

	    case 'cover':
	      scale = Math.max(scaleX, scaleY);
	      break;

	    case 'stretch':
	      scale = scaleX;
	      break;

	    case 'none':
	      scale = 1;
	      break;
	  }

	  if (!this.allowUpscale) {
	    scale = Math.min(scale, 1);
	  }

	  const spriteWidth =
	    frame.width * scale;

	  const spriteHeight =
	    frame.height * scale;

	  const atlasWidth =
	    frame.atlasWidth * scale;

	  const atlasHeight =
	    frame.atlasHeight * scale;

	  const bgPosX =
	    -(frame.x * scale);

	  const bgPosY =
	    -(frame.y * scale);

	  /*
	   * Anchor positioning
	   */
	  let left = 0;
	  let top = 0;

	  const horizontalSpace =
	    containerWidth - spriteWidth;

	  const verticalSpace =
	    containerHeight - spriteHeight;

	  switch (this.anchor) {

	    case 'top-left':
	      left = 0;
	      top = 0;
	      break;

	    case 'top-center':
	      left = horizontalSpace / 2;
	      top = 0;
	      break;

	    case 'top-right':
	      left = horizontalSpace;
	      top = 0;
	      break;

	    case 'center-left':
	      left = 0;
	      top = verticalSpace / 2;
	      break;

	    case 'center':
	      left = horizontalSpace / 2;
	      top = verticalSpace / 2;
	      break;

	    case 'center-right':
	      left = horizontalSpace;
	      top = verticalSpace / 2;
	      break;

	    case 'bottom-left':
	      left = 0;
	      top = verticalSpace;
	      break;

	    case 'bottom-center':
	      left = horizontalSpace / 2;
	      top = verticalSpace;
	      break;

	    case 'bottom-right':
	      left = horizontalSpace;
	      top = verticalSpace;
	      break;
	  }

	  return {

	    width: `${spriteWidth}px`,
	    height: `${spriteHeight}px`,

	    left: `${left}px`,
	    top: `${top}px`,

	    backgroundImage:
	      `url(${frame.atlas})`,

	    backgroundRepeat:
	      'no-repeat',

	    backgroundPosition:
	      `${bgPosX}px ${bgPosY}px`,

	    backgroundSize:
	      `${atlasWidth}px ${atlasHeight}px`
	  };
	});

	ngAfterViewInit(): void {

	  this.loadFrame();

	  this.resizeObserver =
	    new ResizeObserver(entries => {

	      for (const entry of entries) {

	        this.containerWidth.set(
	          entry.contentRect.width
	        );

	        this.containerHeight.set(
	          entry.contentRect.height
	        );
	      }
	    });

	  this.resizeObserver.observe(
	    this.container.nativeElement
	  );
	}

	  ngOnChanges(
	    changes: SimpleChanges
	  ): void {

	    /*
	     * Frame changed dynamically
	     */
	    if (changes['frame']) {
	      this.loadFrame();
	    }
	  }
	  
	ngOnDestroy(): void {

	  this.resizeObserver?.disconnect();
	}
	
	/**
	 * Resolve current frame
	 */
	private loadFrame(): void {

	  if (!this.frame?.name) {
	    this.frameSignal.set(null);
	    return;
	  }

		const frame =
		  this.atlasService.resolveFrame(
			this.frame.name,
			this.atlasSource,
		  );
		this.frameSignal.set(frame);

	  //console.log("frame loaded", this.frame.name,frame);
	  
	}
	
	getEffect(): string{
		return this.frame ? this.frame.effect : '';
	}
	
}
