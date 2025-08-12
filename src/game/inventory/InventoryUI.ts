import { Scene } from 'phaser';
import { Inventory, InventorySnapshot } from './Inventory';
import { ItemRegistry } from '../items/ItemTypes';
import { DEPTH_LAYERS } from '../GameConstants';

export interface InventoryUIOptions {
  x: number; // bottom-left anchor x (screen space)
  y: number; // bottom-left anchor y (screen space)
  slotSize?: number; // default 44
  slotGap?: number; // default 8
}

export class InventoryUI {
  private scene: Scene;
  private inventory: Inventory;
  private container: Phaser.GameObjects.Container;
  private slotRects: Phaser.GameObjects.Rectangle[] = [];
  private slotLabels: Phaser.GameObjects.Text[] = [];
  private slotIcons: Phaser.GameObjects.Text[] = []; // placeholder letters until icons exist
  private options: Required<InventoryUIOptions>;

  constructor(scene: Scene, inventory: Inventory, options: InventoryUIOptions) {
    this.scene = scene;
    this.inventory = inventory;
    this.options = {
      x: options.x,
      y: options.y,
      slotSize: options.slotSize ?? 44,
      slotGap: options.slotGap ?? 8,
    };

    this.container = this.scene.add.container(this.options.x, this.options.y);
    this.container.setScrollFactor(0); // fixed to camera
    this.container.setDepth(DEPTH_LAYERS.UI_TEXT); // ensure on top of game world

    this.buildSlots();

    // Initial render and subscribe to changes
    this.updateFromSnapshot({ slots: this.inventory.getSlots().map((id) => ({ itemId: id })) });
    this.inventory.on('changed', (snapshot: InventorySnapshot) => this.updateFromSnapshot(snapshot));
  }

  private buildSlots(): void {
    const size = this.options.slotSize;
    const gap = this.options.slotGap;

    for (let i = 0; i < this.inventory.getSize(); i++) {
      const x = (size + gap) * i + size / 2; // lay out horizontally from left to right
      const y = -size / 2; // anchor container at bottom-left

      const rect = this.scene.add.rectangle(x, y, size, size, 0x000000, 0.35)
        .setStrokeStyle(2, 0xffffff)
        .setOrigin(0.5);
      const label = this.scene.add.text(x - size / 2 + 4, y + size / 2 - 16, `${i + 1}`, {
        fontSize: '12px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0, 0.5);
      const icon = this.scene.add.text(x, y, '', {
        fontSize: '12px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0.5);

      this.container.add(rect);
      this.container.add(label);
      this.container.add(icon);

      this.slotRects.push(rect);
      this.slotLabels.push(label);
      this.slotIcons.push(icon);
    }
  }

  private updateFromSnapshot(snapshot: InventorySnapshot): void {
    const size = this.inventory.getSize();
    for (let i = 0; i < size; i++) {
      const slot = snapshot.slots[i];
      const iconText = this.slotIcons[i];
      const bg = this.slotRects[i];

      if (!slot || slot.itemId === null) {
        iconText.setText('');
        bg.setFillStyle(0x000000, 0.25);
        continue;
      }

      const def = ItemRegistry.get(slot.itemId);
      // Temporary fallback: show 2-letter abbreviation
      const abbrev = this.makeAbbrev(def.displayName);
      iconText.setText(abbrev);
      bg.setFillStyle(def.category === 'potion' ? 0x224466 : 0x223322, 0.6);
    }
  }

  private makeAbbrev(name: string): string {
    const words = name.split(/\s+/).filter(Boolean);
    if (words.length === 1) {
      return words[0].slice(0, 2).toUpperCase();
    }
    return (words[0][0] + words[1][0]).toUpperCase();
  }

  public setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }
}


