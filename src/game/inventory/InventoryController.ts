import { Scene } from 'phaser';
import { Inventory } from './Inventory';

export class InventoryController {
  private scene: Scene;
  private inventory: Inventory;
  private keySlots: Phaser.Input.Keyboard.Key[] = [];
  private keyShift: Phaser.Input.Keyboard.Key;

  constructor(scene: Scene, inventory: Inventory) {
    this.scene = scene;
    this.inventory = inventory;

    // Bind 1..6 and Shift
    this.keySlots = [
      this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ONE),
      this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.TWO),
      this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.THREE),
      this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR),
      this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.FIVE),
      this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SIX),
    ];
    this.keyShift = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);

    this.scene.events.on('update', this.update, this);
  }

  private update(): void {
    for (let i = 0; i < this.keySlots.length; i++) {
      const key = this.keySlots[i];
      if (Phaser.Input.Keyboard.JustDown(key)) {
        const slotIndex = i;
        const isDrop = this.keyShift.isDown;
        if (isDrop) {
          this.scene.events.emit('inventory:drop', slotIndex);
        } else {
          this.scene.events.emit('inventory:use', slotIndex);
        }
      }
    }
  }

  public destroy(): void {
    this.scene.events.off('update', this.update, this);
  }
}


