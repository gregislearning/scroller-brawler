import Phaser from 'phaser';
import { ItemId, ItemRegistry, InventorySnapshotSlot } from '../items/ItemTypes';

export interface InventoryOptions {
  size?: number; // default 6
  onChanged?: (snapshot: InventorySnapshot) => void;
}

export interface InventorySnapshot {
  slots: InventorySnapshotSlot[]; // length == size
}

export interface InventoryAddResult {
  success: boolean;
  slotIndex?: number;
  reason?: 'full' | 'invalid';
}

export class Inventory extends Phaser.Events.EventEmitter {
  private slots: (ItemId | null)[];
  private readonly size: number;
  private onChanged?: (snapshot: InventorySnapshot) => void;

  constructor(options?: InventoryOptions) {
    super();
    this.size = options?.size ?? 6;
    this.slots = new Array(this.size).fill(null);
    this.onChanged = options?.onChanged;
  }

  public getSize(): number {
    return this.size;
  }

  public getSlots(): ReadonlyArray<ItemId | null> {
    return this.slots;
  }

  public isFull(): boolean {
    return this.slots.every((s) => s !== null);
  }

  public add(itemId: ItemId): InventoryAddResult {
    // Validate ID exists
    if (!ItemRegistry.get(itemId)) {
      return { success: false, reason: 'invalid' };
    }

    const emptyIndex = this.slots.findIndex((s) => s === null);
    if (emptyIndex === -1) {
      return { success: false, reason: 'full' };
    }

    this.slots[emptyIndex] = itemId;
    this.emitChanged();
    this.emit('add', { slotIndex: emptyIndex, itemId });
    return { success: true, slotIndex: emptyIndex };
  }

  public removeAt(slotIndex: number): ItemId | null {
    if (!this.isValidIndex(slotIndex)) return null;
    const existing = this.slots[slotIndex];
    this.slots[slotIndex] = null;
    this.emitChanged();
    if (existing) this.emit('remove', { slotIndex, itemId: existing });
    return existing;
  }

  public getAt(slotIndex: number): ItemId | null {
    if (!this.isValidIndex(slotIndex)) return null;
    return this.slots[slotIndex];
  }

  public swap(a: number, b: number): void {
    if (!this.isValidIndex(a) || !this.isValidIndex(b) || a === b) return;
    const tmp = this.slots[a];
    this.slots[a] = this.slots[b];
    this.slots[b] = tmp;
    this.emitChanged();
    this.emit('swap', { a, b });
  }

  public findFirst(itemId: ItemId): number {
    return this.slots.findIndex((id) => id === itemId);
  }

  public has(itemId: ItemId): boolean {
    return this.findFirst(itemId) !== -1;
  }

  public clear(): void {
    let changed = false;
    for (let i = 0; i < this.slots.length; i++) {
      if (this.slots[i] !== null) {
        this.slots[i] = null;
        changed = true;
      }
    }
    if (changed) {
      this.emitChanged();
      this.emit('clear');
    }
  }

  private emitChanged(): void {
    const snapshot: InventorySnapshot = {
      slots: this.slots.map((id) => ({ itemId: id })),
    };
    this.onChanged?.(snapshot);
    this.emit('changed', snapshot);
  }

  private isValidIndex(index: number): boolean {
    return Number.isInteger(index) && index >= 0 && index < this.size;
  }
}


