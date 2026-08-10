import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonContent, IonFooter, IonToolbar, PopoverController } from '@ionic/angular/standalone';
import { ChestItem, EquipItem, InventoryItem } from '../../../core/models/game.models';
import { chestItemsMock, chestTypesMock } from '../../../core/models/mock/fantasy/box-data';
import { equipItemsMock, equipItemsVariantMock, equipTypesMock } from '../../../core/models/mock/fantasy/equip-data';
import { mockHeroItems } from '../../../core/models/mock/fantasy/hero-data';
import { resourceItemsMock, resourceTypesMock } from '../../../core/models/mock/fantasy/resource-data';
import { buildShopItemsFromItems } from '../../../core/models/mock/fantasy/shop-data';
import { ShopItem } from '../../../core/models/shop.models';
import { UIInventoryBoxComponent } from '../../../shared/components/box/ui-inventory-box.component';
import { UIEquipBoxComponent } from '../../../shared/components/box/ui-equip-box.component';
import { UIShopBoxComponent } from '../../../shared/components/box/ui-shop-box.component';
import { UIItemDetailPopupComponent } from '../../../shared/components/popup/ui-item-detail-popup.component';
import { UIChestOpeningPopupComponent } from '../../../shared/components/popup/ui-box-opening-popup.component';
import { UIBottomUtilsComponent } from 'src/app/shared/components/ui-bottom-utils.component';
import { UiUtilsPageHeaderComponent } from 'src/app/shared/components/ui-utils-page-header.component';

type MockBoxTypeId = 'ui-inventory-box' | 'ui-equip-box' | 'ui-shop-box';

interface MockBoxTypeOption {
  id: MockBoxTypeId;
  label: string;
  description: string;
}

interface MockDataSection {
  id: string;
  title: string;
  description: string;
  data: unknown;
  previewItems: InventoryItem[];
  supportedBoxTypes: MockBoxTypeId[];
}

@Component({
  selector: 'app-data-mock-page',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonFooter, IonToolbar, UIBottomUtilsComponent, UiUtilsPageHeaderComponent, UIInventoryBoxComponent, UIEquipBoxComponent, UIShopBoxComponent, UIChestOpeningPopupComponent],
  templateUrl: './data-mock.page.html',
  styleUrls: ['./data-mock.page.scss'],
})
export class DataMockPage {
  private readonly popoverCtrl = inject(PopoverController);

  readonly sections: MockDataSection[] = [
    {
      id: 'hero',
      title: 'Eroi',
      description: 'Catalogo completo mockHeroItems, mostrato senza filtri o trasformazioni.',
      data: mockHeroItems,
      previewItems: mockHeroItems,
      supportedBoxTypes: ['ui-inventory-box', 'ui-shop-box'],
    },
    {
      id: 'equip',
      title: 'Equip',
      description: 'Tipi equip, item base e varianti mock originali.',
      data: {
        equipTypesMock,
        equipItemsMock,
        equipItemsVariantMock,
      },
      previewItems: equipItemsVariantMock,
      supportedBoxTypes: ['ui-inventory-box', 'ui-equip-box', 'ui-shop-box'],
    },
    {
      id: 'resource',
      title: 'Resource',
      description: 'Tipi risorsa e catalogo resourceItemsMock originali.',
      data: {
        resourceTypesMock,
        resourceItemsMock,
      },
      previewItems: resourceItemsMock,
      supportedBoxTypes: ['ui-inventory-box', 'ui-shop-box'],
    },
    {
      id: 'chest',
      title: 'Chest',
      description: 'Tipi chest e catalogo chestItemsMock originali.',
      data: {
        chestTypesMock,
        chestItemsMock,
      },
      previewItems: chestItemsMock,
      supportedBoxTypes: ['ui-inventory-box', 'ui-shop-box'],
    },
  ];

  readonly boxTypeOptions: MockBoxTypeOption[] = [
    { id: 'ui-inventory-box', label: 'ui-inventory-box', description: 'Card inventario usata per eroi, equip, resource e chest.' },
    { id: 'ui-equip-box', label: 'ui-equip-box', description: 'Card specializzata per equip con statistiche, maestria e durabilità.' },
    { id: 'ui-shop-box', label: 'ui-shop-box', description: 'Card shop con prezzo, stock e stato di acquisto.' },
  ];

  readonly cardFrameOptions = [
    'card-parchment-small',
    'card-blue-small',
    'card-dark-small',
    'card-purple-small',
    'card-brown-small',
    'card-parchment-red-banner',
    'card-blue-gold-banner',
    'card-magenta-gold-banner',
    'card-red-gold-banner',
    'card-teal-gold-banner',
    'card-ice-blue',
    'card-gold',
    'card-light-crystal',
    'card-cosmic-purple',
    'card-lava',
	'icon-circle-dark',
	'icon-square-light',
	'icon-hex-light',
	'icon-hex-light-purplegem',
	'icon-diamond-blue'
  ];

  selectedSectionId = this.sections[0].id;
  selectedCardFrame = this.cardFrameOptions[10];
  selectedBoxType: MockBoxTypeId = 'ui-inventory-box';
  selectedChest: ChestItem | null = null;
  copied = false;

  get selectedSection(): MockDataSection {
    return this.sections.find((section) => section.id === this.selectedSectionId) ?? this.sections[0];
  }

  get supportedBoxTypeOptions(): MockBoxTypeOption[] {
    return this.boxTypeOptions.filter((option) => this.selectedSection.supportedBoxTypes.includes(option.id));
  }

  get selectedBoxTypeOption(): MockBoxTypeOption {
    return this.boxTypeOptions.find((option) => option.id === this.selectedBoxType) ?? this.boxTypeOptions[0];
  }

  get renderedItems(): (InventoryItem | ShopItem)[] {
    if (this.selectedBoxType === 'ui-shop-box') {
      return buildShopItemsFromItems(this.selectedSection.previewItems, {
        defaultStock: 5,
      });
    }

    return this.selectedSection.previewItems;
  }

  get output(): string {
    return JSON.stringify(this.selectedSection.data, null, 2);
  }

  selectSection(section: MockDataSection): void {
    this.selectedSectionId = section.id;
    if (!section.supportedBoxTypes.includes(this.selectedBoxType)) {
      this.selectedBoxType = section.supportedBoxTypes[0];
    }
  }

  trackRenderedItem(item: InventoryItem | ShopItem): string {
    return item.id;
  }

  inventoryItemFromRendered(item: InventoryItem | ShopItem): InventoryItem {
    return this.isShopItem(item) ? item.item : item;
  }

  equipItemFromRendered(item: InventoryItem | ShopItem): EquipItem {
    return this.inventoryItemFromRendered(item) as EquipItem;
  }

  shopItemFromRendered(item: InventoryItem | ShopItem): ShopItem {
    return item as ShopItem;
  }

  async openDetail(item: InventoryItem | ShopItem): Promise<void> {
    if (this.selectedBoxType === 'ui-inventory-box' && this.isChestItem(this.inventoryItemFromRendered(item))) {
      this.selectedChest = this.inventoryItemFromRendered(item) as ChestItem;
      return;
    }

    let pop: HTMLIonPopoverElement | undefined;
    const shopItem = this.isShopItem(item) ? item : null;

    pop = await this.popoverCtrl.create({
      component: UIItemDetailPopupComponent,
      componentProps: {
        item: shopItem ? shopItem.item : item,
        actionLabel: shopItem ? 'Acquista' : undefined,
        actionPrice: shopItem?.price,
        actionDisabled: shopItem ? shopItem.state !== 'collect' : false,
        showUpgrade: false,
        onDismiss: (d?: any) => pop?.dismiss(d),
      },
      translucent: true,
      cssClass: 'equip-preview-popover',
    });

    await pop.present();
  }

  closeChestDetail(): void {
    this.selectedChest = null;
  }

  private isShopItem(item: InventoryItem | ShopItem): item is ShopItem {
    return 'item' in item && 'state' in item && 'type' in item;
  }

  private isChestItem(item: InventoryItem): item is ChestItem {
    return item.itemType === 'chest';
  }

  async exportOutput(): Promise<void> {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(this.output);
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = this.output;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }

    this.copied = true;
    setTimeout(() => {
      this.copied = false;
    }, 1800);
  }
}
