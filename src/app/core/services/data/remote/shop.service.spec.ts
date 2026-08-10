import { ShopItem } from "../../../models/shop.models";

import { resolveAvailableShopItems } from './shop.service';

describe('ShopService availability filtering', () => {
  const now = new Date('2026-06-17T12:00:00.000Z');
  const frame = { name: 'coin', effect: 'none' } as const;

  const buildShopItem = (overrides: Partial<ShopItem>): ShopItem => ({
    id: 'item',
    framePanel: frame,
    item: {
      id: 'coins',
      itemType: 'resource',
      name: 'Coins',
      description: 'Coins resource',
      type: { id: 'res1', title: 'Coins', description: 'Coins resource', frame },
      level: 1,
      mastery: 0,
      frame,
    },
    type: 'resource',
    title: 'Coins',
    state: 'collect',
    price: { frame, type: 'gem', amount: 10 },
    quantity: 100,
    ...overrides
  });

  it('keeps only unlocked items available at the current time', () => {
    const items = [
      buildShopItem({ id: 'enabled-current' }),
      buildShopItem({ id: 'disabled-current', state: 'locked' }),
      buildShopItem({
        id: 'future',
        availability: { startAt: '2026-06-18T00:00:00.000Z' }
      }),
      buildShopItem({
        id: 'expired',
        availability: { endAt: '2026-06-16T00:00:00.000Z' }
      })
    ];

    expect(resolveAvailableShopItems(items, now).map(item => item.id)).toEqual(['enabled-current']);
  });

  it('keeps the source order for available items', () => {
    const items = [
      buildShopItem({ id: 'first' }),
      buildShopItem({ id: 'second' }),
      buildShopItem({ id: 'third' })
    ];

    expect(resolveAvailableShopItems(items, now).map(item => item.id)).toEqual(['first', 'second', 'third']);
  });
});
