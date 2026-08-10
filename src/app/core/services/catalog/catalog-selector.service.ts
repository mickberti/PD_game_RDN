import { Injectable, computed, inject } from '@angular/core';

import { ComponentEffect, ComponentSize, EquipItem, EquipType, UiTabItem } from '../../models/game.models';
import { createEquipDurationProgress, createEquipExperienceProgress } from '../progression/level-progression.service';
import { GameStateService } from '../state/game-state.service';

const DEFAULT_EQUIP_TYPES: EquipType[] = [
  { id: 'weapon', title: 'Armi', frameName: 'equip-type-weapon' },
  { id: 'shield', title: 'Scudi', frameName: 'equip-type-shield' },
  { id: 'armor', title: 'Armature', frameName: 'equip-type-armor' },
  { id: 'helmet', title: 'Elmi', frameName: 'equip-type-helmet' },
  { id: 'ring', title: 'Anelli', frameName: 'equip-type-ring' },
  { id: 'artifact', title: 'Artefatti', frameName: 'equip-type-staff' },
];

@Injectable({ providedIn: 'root' })
export class CatalogSelectorService {
  private readonly state = inject(GameStateService);

  readonly equipTypes = computed<EquipType[]>(() => {
    const byId = new Map<string, EquipType>();
    for (const type of DEFAULT_EQUIP_TYPES) byId.set(type.id, type);
    for (const equip of [...this.state.catalog().equip, ...this.state.inventoryEquip()]) {
      if (equip.type?.id) byId.set(equip.type.id, equip.type);
    }
    return Array.from(byId.values());
  });

  readonly defaultEquip = computed<EquipItem>(() => this.createDefaultEquip(this.equipTypes()[0] ?? DEFAULT_EQUIP_TYPES[0]));

  readonly heroEquipTabs = computed<UiTabItem[]>(() => [
    this.createTabItem('stat', 'stat', 'icon-badge-star', 'none', 'sm'),
    ...this.equipTypes().map((item) => this.createTabItem(item.id, item.title, item.frameName, 'none', 'sm')),
  ]);

  normalizeEquipType(type: string | null | undefined): string {
    if (!type) return 'stat';
    if (type === 'stat' || type === 'delete') return type;
    return this.equipTypes().some((item) => item.id === type) ? type : (this.equipTypes()[0]?.id ?? 'weapon');
  }

  private createDefaultEquip(type: EquipType): EquipItem {
    return {
      itemType: 'equip',
      id: 'none',
      name: 'Nessuna Equipaggiamento',
      type,
      level: 0,
      mastery: 0,
      duration: createEquipDurationProgress(100),
      variant: 0,
      attack: 0,
      defense: 0,
      velocita: 0,
      effect: 'Nessun effetto speciale',
      experience: createEquipExperienceProgress(1, 0),
      bonus: { type: 'none', title: '', value: 0, malus: false },
      frame: { name: 'equip-default', effect: 'none' },
    };
  }

  private createTabItem(
    id: string,
    title: string,
    frameName: string,
    effect: ComponentEffect = 'none',
    size: ComponentSize = 'md',
  ): UiTabItem {
    return { id, title, frame: { name: frameName, effect }, route: '', size };
  }
}
