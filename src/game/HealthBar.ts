import { Scene } from 'phaser';

export interface HealthBarConfig {
    scene: Scene;
    x: number;
    y: number;
    width: number;
    height: number;
    maxHealth: number;
    currentHealth: number;
    backgroundColor?: number;
    healthColor?: number;
    borderColor?: number;
    borderWidth?: number;
    followTarget?: Phaser.GameObjects.Sprite;
    offsetX?: number;
    offsetY?: number;
    fixed?: boolean; // If true, stays fixed to camera (for UI), if false, moves with world
    showText?: boolean; // If true, shows health numbers
}

export class HealthBar {
    private scene: Scene;
    private container: Phaser.GameObjects.Container;
    private background: Phaser.GameObjects.Rectangle;
    private healthFill: Phaser.GameObjects.Rectangle;
    private border: Phaser.GameObjects.Rectangle;
    private healthText?: Phaser.GameObjects.Text;
    
    private maxHealth: number;
    private currentHealth: number;
    private width: number;
    private height: number;
    private followTarget?: Phaser.GameObjects.Sprite;
    private offsetX: number;
    private offsetY: number;
    private fixed: boolean;
    
    constructor(config: HealthBarConfig) {
        this.scene = config.scene;
        this.maxHealth = config.maxHealth;
        this.currentHealth = config.currentHealth;
        this.width = config.width;
        this.height = config.height;
        this.followTarget = config.followTarget;
        this.offsetX = config.offsetX || 0;
        this.offsetY = config.offsetY || 0;
        this.fixed = config.fixed || false;
        
        // Create container for all health bar elements
        this.container = this.scene.add.container(config.x, config.y);
        
        // Background (empty health)
        this.background = this.scene.add.rectangle(
            0, 0, 
            this.width, this.height, 
            config.backgroundColor || 0x404040
        );
        
        // Health fill (current health)
        this.healthFill = this.scene.add.rectangle(
            0, 0, 
            this.width, this.height, 
            config.healthColor || 0x00ff00
        );
        // Set origin to left-center so it grows from left to right
        this.healthFill.setOrigin(0, 0.5);
        
        // Border
        this.border = this.scene.add.rectangle(
            0, 0, 
            this.width, this.height
        );
        this.border.setStrokeStyle(
            config.borderWidth || 2, 
            config.borderColor || 0xffffff
        );
        this.border.setFillStyle(); // Remove fill, only border
        
        // Add health text if requested
        if (config.showText) {
            this.healthText = this.scene.add.text(0, 0, '', {
                fontSize: '12px',
                color: '#ffffff',
                fontFamily: 'Arial',
                stroke: '#000000',
                strokeThickness: 1
            }).setOrigin(0.5);
        }

        // Add elements to container
        this.container.add([this.background, this.healthFill, this.border]);
        if (this.healthText) {
            this.container.add(this.healthText);
        }
        
        // Set depth and scroll factor
        if (this.fixed) {
            this.container.setScrollFactor(0); // Fixed to camera
            this.container.setDepth(1000); // High depth for UI
        } else {
            this.container.setDepth(150); // Above characters but below UI
        }
        
        // Update visual representation
        this.updateHealthBar();
    }
    
    public updateHealth(currentHealth: number, maxHealth?: number): void {
        this.currentHealth = Math.max(0, currentHealth);
        if (maxHealth !== undefined) {
            this.maxHealth = maxHealth;
        }
        this.updateHealthBar();
    }
    
    private updateHealthBar(): void {
        const healthPercentage = this.currentHealth / this.maxHealth;
        const healthWidth = this.width * healthPercentage;
        
        // Update health fill width and position
        this.healthFill.width = healthWidth;
        // Position at left edge of container (since origin is set to left-center)
        this.healthFill.x = -this.width / 2;
        
        // Change color based on health percentage
        if (healthPercentage > 0.6) {
            this.healthFill.setFillStyle(0x00ff00); // Green
        } else if (healthPercentage > 0.3) {
            this.healthFill.setFillStyle(0xffff00); // Yellow
        } else {
            this.healthFill.setFillStyle(0xff0000); // Red
        }
        
        // Update health text if it exists
        if (this.healthText) {
            this.healthText.setText(`${this.currentHealth}/${this.maxHealth}`);
        }
        
        // Hide health bar if dead
        this.container.setVisible(this.currentHealth > 0);
    }
    
    public update(): void {
        if (this.followTarget && this.followTarget.active) {
            this.container.x = this.followTarget.x + this.offsetX;
            this.container.y = this.followTarget.y + this.offsetY;
        }
    }
    
    public setPosition(x: number, y: number): void {
        this.container.x = x;
        this.container.y = y;
    }
    
    public setVisible(visible: boolean): void {
        this.container.setVisible(visible);
    }
    
    public destroy(): void {
        this.container.destroy();
    }
    
    public getContainer(): Phaser.GameObjects.Container {
        return this.container;
    }
} 