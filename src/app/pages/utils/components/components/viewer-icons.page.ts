import { CommonModule } from '@angular/common';

import { Component, OnInit, signal } from '@angular/core';

import { IonContent, IonFooter, IonToolbar } from '@ionic/angular/standalone';
import { UIIconComponent } from 'src/app/shared/basic/ui-icon.component';
import { UIPanelComponent } from 'src/app/shared/basic/ui-panel.component';
import { UIButtonComponent } from 'src/app/shared/basic/ui-button.component';
import { UIPillComponent } from 'src/app/shared/basic/ui-pill.component';
import { AwardItem, COMPONENT_EFFECT, COMPONENT_JUICY_EFFECT, COMPONENT_MODE, COMPONENT_SIZE, ComponentEffect, ComponentJuicyEffect, ComponentMode, ComponentSize, FrameItem, GlobalItem, ICON_TYPES, IconType } from '../../../../core/models/game.models';
import { UIBottomUtilsComponent } from 'src/app/shared/components/ui-bottom-utils.component';
import { UiUtilsPageHeaderComponent } from 'src/app/shared/components/ui-utils-page-header.component';
import { UIBandComponent } from 'src/app/shared/basic/ui-band.component';
import { UiSpriteComponent } from 'src/app/shared/basic/ui-sprite.component';
import { defaultPowerUps, defaultRanking, defaultAward, defaultShop } from '../../../../core/models/mock/fantasy/utils-data';
import { UIChestComponent } from 'src/app/shared/components/box/ui-box.component';
import { UISettingChestComponent } from 'src/app/shared/components/box/ui-setting-box.component';
import { UIAwardChestComponent } from 'src/app/shared/components/box/ui-award-box.component';
import { UIRankingChestComponent } from 'src/app/shared/components/box/ui-ranking-box.component';
import { UIPrestigeChestComponent } from 'src/app/shared/components/box/ui-prestige-box.component';
import { UIPowerUpChestComponent } from 'src/app/shared/components/box/ui-power-up-box.component';
import { UIEquipChestComponent } from 'src/app/shared/components/box/ui-equip-box.component';
import { UIAttributeChestComponent } from 'src/app/shared/components/box/ui-attribute-box.component';
import { ScoreItem } from '../../../../core/models/game.models';
import { UIEquipHeroChestComponent } from 'src/app/shared/components/box/ui-equip-hero-box.component';
import { JuiceDirective } from 'src/app/core/directive/juice.directive';
import { ActionFeedbackFrameItem, ActionFeedbackVariant, UIActionFeedbackOverlayComponent } from 'src/app/shared/components/ui-action-feedback-overlay.component';

export const SHOWCASE_TYPE = ['all', 'icons' , 'panels' , 'buttons' , 'pills', 'bands' , 'bars' , 'tops', 'chests', 'juice', 'feedback'] as const;
export type ShowcaseType = typeof SHOWCASE_TYPE[number];

@Component({
  selector: 'app-viewer-icons-page',
  standalone: true,
  imports: [CommonModule, IonContent, UIIconComponent, UIPanelComponent, UIButtonComponent, UIPillComponent, IonToolbar, UIChestComponent, IonFooter, UiSpriteComponent, UIBottomUtilsComponent, UIBandComponent, UISettingChestComponent, UIAwardChestComponent, UIRankingChestComponent, UIPrestigeChestComponent, UIPowerUpChestComponent, UIEquipChestComponent, UIEquipHeroChestComponent, UIAttributeChestComponent, JuiceDirective, UIActionFeedbackOverlayComponent, UiUtilsPageHeaderComponent],
  templateUrl: './viewer-icons.page.html',
  styleUrls: ['./viewer-icons.page.scss'],
})
export class ViewerIconsPage implements OnInit {
  readonly types: ShowcaseType[] = [...SHOWCASE_TYPE];
  readonly sizes: ComponentSize[] = [...COMPONENT_SIZE];
  readonly variants: ComponentMode[] = [...COMPONENT_MODE];
  readonly iconTypes: IconType[] = [...ICON_TYPES];
  readonly effects: ComponentEffect[] = [...COMPONENT_EFFECT];
  readonly juiceEffects: ComponentJuicyEffect[] = [...new Set(COMPONENT_JUICY_EFFECT)];
  readonly defaultShop:GlobalItem = defaultShop;
  readonly defaultAward:AwardItem = defaultAward;
  readonly defaultPowerUps:GlobalItem = defaultPowerUps;
  readonly defaultRanking: ScoreItem = defaultRanking;
  readonly juiceResources: JuiceResourceItem[] = [
    { id: 'gold-cache', name: 'Gold Cache', frameName: 'coin_many', price: 25, owned: 0, purchasable: true },
    { id: 'crystal-cache', name: 'Crystal Cache', frameName: 'crystal_many', price: 75, owned: 0, purchasable: false },
    { id: 'magic-dust', name: 'Magic Dust', frameName: 'magic_dust_many', price: 50, owned: 0, purchasable: true },
  ];
  readonly particles = Array.from({ length: 12 }, (_, i) => this.createParticle(i));
  bubbleExamples: JuiceBubbleItem[] = this.createBubbles();

  readonly emptyFeedbackFrames: ActionFeedbackFrameItem[] = [];
  readonly feedbackVariants: ActionFeedbackVariant[] = ['gain', 'sell', 'collect', 'open'];
  readonly singleFeedbackExamples: ActionFeedbackDemo[] = [
    {
      id: 'single-gain',
      title: 'Gain base',
      description: 'Overlay singola con animazione gain e chiusura automatica.',
      frame: { name: 'coin_many', effect: 'fx-new' },
      text: '+250 Gold',
      variant: 'gain',
      duration: 2200,
    },
    {
      id: 'single-sell',
      title: 'Sell + dismiss',
      description: 'Feedback vendita, tappabile per chiudere prima della fine.',
      frame: { name: 'crystal_many', effect: 'fx-rare' },
      text: 'Venduto +75',
      variant: 'sell',
      duration: 2600,
      dismissible: true,
    },
    {
      id: 'single-collect',
      title: 'Collect blocking',
      description: 'Overlay bloccante per raccolte importanti.',
      frame: { name: 'magic_dust_many', effect: 'fx-mythic' },
      text: 'Ricompensa raccolta',
      variant: 'collect',
      duration: 2400,
      blocking: true,
    },
    {
      id: 'single-open',
      title: 'Open custom fx',
      description: 'Usa effetto scelto dalla toolbar per sprite e label.',
      frame: { name: 'chest', effect: 'fx-box-open' },
      text: 'Chest aperta!',
      variant: 'open',
      duration: 2800,
    },
    {
      id: 'single-fit',
      title: 'Fit cover no upscale',
      description: 'Configurazione con fit cover e allowUpscale disattivato.',
      frame: { name: 'chest-angel-gold', effect: 'fx-legendary' },
      text: 'Chest rara',
      variant: 'gain',
      duration: 2400,
      spriteFit: 'cover',
      allowUpscale: false,
    },
    {
      id: 'single-manual-close',
      title: 'Manual close',
      description: 'Non si chiude a fine animazione: clicca overlay per chiudere.',
      frame: { name: 'potion_many', effect: 'fx-holy-aura' },
      text: 'Pozione attiva',
      variant: 'collect',
      duration: 1800,
      dismissible: true,
      closeOnAnimationEnd: false,
    },
  ];
  readonly multiFeedbackExamples: ActionFeedbackDemo[] = [
    {
      id: 'multi-reward',
      title: 'Sequenza reward',
      description: 'Tre frame in sequenza con delay automatico.',
      variant: 'gain',
      duration: 1500,
      frameDelay: 220,
      frames: [
        { frame: { name: 'coin_many', effect: 'fx-new' }, text: '+500 Gold', duration: 1400, delayAfter: 120 },
        { frame: { name: 'crystal_many', effect: 'fx-rare' }, text: '+20 Gems', duration: 1400, delayAfter: 120 },
        { frame: { name: 'magic_dust_many', effect: 'fx-mythic' }, text: '+8 Dust', duration: 1600 },
      ],
    },
    {
      id: 'multi-click',
      title: 'Sequenza click-to-advance',
      description: 'Tocca lo stage o overlay per avanzare tra gli step.',
      variant: 'open',
      duration: 2200,
      frameDelay: 900,
      dismissible: true,
      advanceOnClick: true,
      frames: [
        { frame: { name: 'chest', effect: 'fx-box-open' }, text: 'Scrigno trovato', duration: 1800 },
        { frame: { name: 'chest-angel-gold', effect: 'fx-legendary' }, text: 'Bonus leggendario', duration: 1800 },
        { frame: { name: 'potion_many', effect: 'fx-holy-aura' }, text: 'Pozione extra', duration: 1800 },
      ],
    },
    {
      id: 'multi-no-click',
      title: 'Sequenza bloccante',
      description: 'Avanza solo a fine animazione, utile per risultati importanti.',
      variant: 'collect',
      duration: 1700,
      frameDelay: 180,
      blocking: true,
      advanceOnClick: false,
      frames: [
        { frame: { name: 'skill-fist', effect: 'fx-fire' }, text: 'Attack +1', duration: 1400 },
        { frame: { name: 'shield', effect: 'fx-frozen' }, text: 'Defense +1', duration: 1400 },
      ],
    },
  ];

  readonly activeFeedback = signal<ActionFeedbackDemo | null>(null);


  selectedType: ShowcaseType = 'all';
  selectedSize: ComponentSize = 'xs';
  selectedVariant: ComponentMode = 'primary';
  selectedEffect: ComponentEffect = 'none';
  selectedJuiceEffect: ComponentJuicyEffect = 'fx-juicy_bounce';


  readonly panelSizes: Array<'sm' | 'md'> = ['sm', 'md'];

  
  ngOnInit(): void {
    //this.onSizeChange('md');
  }
  


  showFeedback(example: ActionFeedbackDemo): void {
    this.activeFeedback.set(this.cloneFeedbackExample(this.resolveFeedbackExample(example)));
  }

  closeFeedback(): void {
    this.activeFeedback.set(null);
  }

  private resolveFeedbackExample(example: ActionFeedbackDemo): ActionFeedbackDemo {
    if (example.id !== 'single-open') {
      return example;
    }

    return {
      ...example,
      spriteEffect: this.selectedJuiceEffect,
      labelEffect: this.selectedJuiceEffect,
    };
  }


  private cloneFeedbackExample(example: ActionFeedbackDemo): ActionFeedbackDemo {
    return {
      ...example,
      frame: example.frame ? { ...example.frame } : undefined,
      frames: example.frames?.map((item) => ({
        ...item,
        frame: item.frame ? { ...item.frame } : undefined,
      })),
    };
  }

  get selectedButtonVariant(): ComponentMode {
    return this.selectedVariant;
  }

  get selectedPanelSize(): 'sm' | 'md' {
    return this.selectedSize === 'xs' ? 'sm' : this.selectedSize === 'lg' ? 'md' : (this.selectedSize as 'sm' | 'md');
  }

  get selectedEffectClass(): string {
    return this.selectedEffect === 'none' ? '' : `${this.selectedEffect}`;
  }

  showSection(type: ShowcaseType): boolean {
    return this.selectedType === 'all' || this.selectedType === type;
  }

  onTypeChange(value: string): void {
    this.selectedType = value as ShowcaseType;
  }

  onVariantChange(value: string): void {
    this.selectedVariant = value as ComponentMode;
  }

  onSizeChange(value: string): void {
    this.selectedSize = value as ComponentSize;
  }
  

  onEffectChange(value: string): void {
    this.selectedEffect = value as ComponentEffect;
  }

  onJuiceEffectChange(value: string): void {
    this.selectedJuiceEffect = value as ComponentJuicyEffect;
  }

  collect(resource: JuiceResourceItem): void {
    resource.owned += 1;
    this.refreshParticles();
  }

  canBuy(resource: JuiceResourceItem): boolean {
    return resource.purchasable;
  }

  tryBuy(resource: JuiceResourceItem, juice: JuiceDirective): void {
    if (!this.canBuy(resource)) {
      juice.play('juicy__shake__2');
      return;
    }

    this.buy(resource);
    juice.play('juicy__bounce');
  }

  buy(resource: JuiceResourceItem): void {
    resource.owned += 5;
    this.refreshParticles();
  }

  playJuice(juice: JuiceDirective, effect = this.selectedJuiceEffect): void {
    juice.play(effect);
  }

  trackById(_index: number, item: { id: string }): string {
    return item.id;
  }

  refreshParticles(): void {
    this.particles.forEach((particle, index) => {
      Object.assign(particle, this.createParticle(index));
    });
  }

  replayBubbles(): void {
    this.bubbleExamples = this.createBubbles();
  }

  private createParticle(index: number): JuiceParticle {
    return {
      id: this.createId(index),
      jump: `${(0.5 + Math.random() * 1.5).toFixed(2)}`,
      direction: Math.random() > 0.5 ? '1' : '-1',
      spin: Math.random() > 0.5 ? '1' : '0',
      size: `${(0.6 + Math.random()).toFixed(2)}`,
      frameName: index % 3 === 0 ? 'magic_dust_single' : index % 2 === 0 ? 'crystal_single' : 'coin_single',
    };
  }

  private createId(index: number): string {
    return typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `particle-${Date.now()}-${index}`;
  }

  private createBubbles(): JuiceBubbleItem[] {
    const suffix = this.createId(0);

    return [
      { id: `bubble-primary-${suffix}`, left: 80, bottom: 20, heightScale: '1.2', widthScale: '0.4', sizeScale: '0.5', delay: '0' },
      { id: `bubble-small-${suffix}`, left: 46, bottom: 34, heightScale: '1.45', widthScale: '-0.25', sizeScale: '0.35', delay: '0.35' },
      { id: `bubble-wide-${suffix}`, left: 118, bottom: 18, heightScale: '1.05', widthScale: '0.65', sizeScale: '0.42', delay: '0.7' },
    ];
  }

  getSelectedIcon(iconType: IconType){
	return 	{
		effect: this.selectedEffect,
		type: iconType,
		size: this.selectedSize,
	}
  }

}

interface JuiceResourceItem {
  id: string;
  name: string;
  frameName: string;
  price: number;
  owned: number;
  purchasable: boolean;
}

interface JuiceParticle {
  id: string;
  jump: string;
  direction: string;
  spin: string;
  size: string;
  frameName: string;
}

interface JuiceBubbleItem {
  id: string;
  left: number;
  bottom: number;
  heightScale: string;
  widthScale: string;
  sizeScale: string;
  delay: string;
}


interface ActionFeedbackDemo {
  id: string;
  title: string;
  description: string;
  frame?: FrameItem;
  text?: string;
  frames?: ActionFeedbackFrameItem[];
  variant: ActionFeedbackVariant;
  duration?: number;
  frameDelay?: number;
  advanceOnClick?: boolean;
  dismissible?: boolean;
  blocking?: boolean;
  closeOnAnimationEnd?: boolean;
  allowUpscale?: boolean;
  spriteFit?: 'contain' | 'cover' | 'stretch' | 'none';
  spriteEffect?: ComponentJuicyEffect | string;
  labelEffect?: ComponentJuicyEffect | string;
}
