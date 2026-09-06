import { AvailabilityWindow, ResetPolicy } from './remote/event.model';
import { FrameItem, ItemType, PriceItem } from './game.models';

export type CollectibleState = 'received' | 'collect' | 'locked';

export interface ShopItem {
  id: string;
  framePanel: FrameItem;
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
