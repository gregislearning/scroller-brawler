// Item and stat type definitions and a central registry for item metadata

export type StatName = 'attackDamage' | 'maxHealth' | 'speed';

export interface StatModifier {
  stat: StatName;
  amount: number;
}

export type ItemCategory = 'potion' | 'item';

// Extend this as you add content
export type ItemId =
  | 'potion_health_small'
  | 'potion_attack_tonic'
  | 'potion_speed_draught'
  | 'item_boots_haste'
  | 'item_amulet_strength'
  | 'item_ring_vitality';

export type PotionUseEffect =
  | { kind: 'heal'; amount: number }
  | { kind: 'timedBuff'; modifier: StatModifier; durationMs: number };

export interface ItemDefinition {
  id: ItemId;
  displayName: string;
  description: string;
  category: ItemCategory;
  iconKey: string;
  stackable: false; // For now, no stacking per design
  consumable: boolean; // Potions are consumable; items are not
  potionUse?: PotionUseEffect; // For consumables only
  permanentModifiers?: StatModifier[]; // For permanent items
  cooldownMs?: number;
}

const DEFINITIONS: Record<ItemId, ItemDefinition> = {
  potion_health_small: {
    id: 'potion_health_small',
    displayName: 'Health Potion',
    description: 'Instantly restores a small amount of health.',
    category: 'potion',
    iconKey: 'icon_potion_health',
    stackable: false,
    consumable: true,
    potionUse: { kind: 'heal', amount: 25 },
    cooldownMs: 500,
  },
  potion_attack_tonic: {
    id: 'potion_attack_tonic',
    displayName: 'Attack Tonic',
    description: 'Temporarily increases attack damage.',
    category: 'potion',
    iconKey: 'icon_potion_attack',
    stackable: false,
    consumable: true,
    potionUse: { kind: 'timedBuff', modifier: { stat: 'attackDamage', amount: 10 }, durationMs: 10_000 },
    cooldownMs: 1000,
  },
  potion_speed_draught: {
    id: 'potion_speed_draught',
    displayName: 'Speed Draught',
    description: 'Temporarily increases movement speed.',
    category: 'potion',
    iconKey: 'icon_potion_speed',
    stackable: false,
    consumable: true,
    potionUse: { kind: 'timedBuff', modifier: { stat: 'speed', amount: 80 }, durationMs: 10_000 },
    cooldownMs: 1000,
  },
  item_boots_haste: {
    id: 'item_boots_haste',
    displayName: 'Boots of Haste',
    description: 'Light boots that permanently increase speed while carried.',
    category: 'item',
    iconKey: 'icon_boots_haste',
    stackable: false,
    consumable: false,
    permanentModifiers: [{ stat: 'speed', amount: 60 }],
  },
  item_amulet_strength: {
    id: 'item_amulet_strength',
    displayName: 'Amulet of Strength',
    description: 'An amulet that permanently increases attack while carried.',
    category: 'item',
    iconKey: 'icon_amulet_strength',
    stackable: false,
    consumable: false,
    permanentModifiers: [{ stat: 'attackDamage', amount: 10 }],
  },
  item_ring_vitality: {
    id: 'item_ring_vitality',
    displayName: 'Ring of Vitality',
    description: 'A ring that permanently increases max health while carried.',
    category: 'item',
    iconKey: 'icon_ring_vitality',
    stackable: false,
    consumable: false,
    permanentModifiers: [{ stat: 'maxHealth', amount: 25 }],
  },
};

export const ItemRegistry = {
  get(id: ItemId): ItemDefinition {
    return DEFINITIONS[id];
  },
  getAll(): ReadonlyArray<ItemDefinition> {
    return Object.values(DEFINITIONS);
  },
  isConsumable(id: ItemId): boolean {
    return DEFINITIONS[id].consumable;
  },
  getPotionUse(id: ItemId): PotionUseEffect | undefined {
    return DEFINITIONS[id].potionUse;
  },
  getPermanentModifiers(id: ItemId): ReadonlyArray<StatModifier> {
    return DEFINITIONS[id].permanentModifiers ?? [];
  },
};

export interface InventorySnapshotSlot {
  itemId: ItemId | null;
}


