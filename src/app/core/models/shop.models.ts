import { AvailabilityWindow, ResetPolicy } from './remote/event.model';
import { ChestItem, EquipItem, FrameItem, HeroItem, ItemType, PriceItem, ResourceItem } from './game.models';

export type CollectibleState = 'received' | 'collect' | 'locked';

export interface ShopItem {
  id: string;
  framePanel: FrameItem;
  item: EquipItem | HeroItem | ResourceItem | ChestItem;
  type: ItemType;
  title: string;
  subtitle?: string;
  state: CollectibleState;
  price?: PriceItem;
  stock?: number;
  quantity?: number;
  reset?: ResetPolicy;
  availability?: AvailabilityWindow;
}
