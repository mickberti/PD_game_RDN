import { PLAYER_STATE_CONFIG } from "../../../game/phaser/config/game-variables.config";
import { getChestItemsByLevel } from "../../../models/mock/fantasy/box-data";
import { getEquipItemsByLevelAndMasteryAndType } from "../../../models/mock/fantasy/equip-data";
import { getHeroItemsByLevelAndMasteryAndVariantAndStats } from "../../../models/mock/fantasy/hero-data";
import { getResourceItemsByLevel } from "../../../models/mock/fantasy/resource-data";
import { createInitialPlayerInventory } from "./player-inventory.factory";

describe("createInitialPlayerInventory", () => {
  const createMock = () => ({
    resourceItemsPlayer: getResourceItemsByLevel(3).slice(0, 6),
    chestItemsPlayer: getChestItemsByLevel(5).slice(0, 6),
    equipItemPlayer: getEquipItemsByLevelAndMasteryAndType(1, 1, 0).slice(0, 10),
    heroesPlayer: getHeroItemsByLevelAndMasteryAndVariantAndStats(1, 1, 0, 20).slice(0, 4),
  });

  it("builds the initial inventory using configured limits and first selected hero", () => {
    const mock = createMock();
    const inventory = createInitialPlayerInventory(mock, { stock: () => 3 });

    expect(inventory.resources.length).toBe(mock.resourceItemsPlayer.length);
    expect(inventory.boxes.length).toBe(mock.chestItemsPlayer.length);
    expect(inventory.equip.length).toBe(PLAYER_STATE_CONFIG.initialEquipCount);
    expect(inventory.heroes.length).toBe(PLAYER_STATE_CONFIG.initialHeroCount);
    expect(inventory.selectedHeroId).toBe(inventory.heroes[0].id);
    expect(inventory.resources.every((item) => item.stock === 3)).toBeTrue();
    expect(inventory.boxes.every((item) => item.stock === 3)).toBeTrue();
  });

  it("filters empty stacks and clones inventory objects", () => {
    const mock = createMock();
    const inventory = createInitialPlayerInventory(mock, { stock: () => 0 });

    expect(inventory.resources).toEqual([]);
    expect(inventory.boxes).toEqual([]);
    expect(inventory.equip[0]).not.toBe(mock.equipItemPlayer[0]);
    expect(inventory.heroes[0]).not.toBe(mock.heroesPlayer[0]);
    expect(inventory.heroes[0].stats[0]).not.toBe(mock.heroesPlayer[0].stats[0]);
  });

  it("always creates at least one hero when the mock session has no heroes", () => {
    const mock = {
      ...createMock(),
      heroesPlayer: [],
    };

    const inventory = createInitialPlayerInventory(mock, { stock: () => 1 });

    expect(inventory.heroes.length).toBeGreaterThan(0);
    expect(inventory.selectedHeroId).toBe(inventory.heroes[0].id);
  });
});
