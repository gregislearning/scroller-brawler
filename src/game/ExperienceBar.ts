import { Scene } from 'phaser';

export interface ExperienceBarConfig {
    scene: Scene;
    x: number;
    y: number;
    width: number;
    height: number;
    currentExperience: number;
    experienceToNext: number;
    level: number;
    backgroundColor?: number;
    experienceColor?: number;
    borderColor?: number;
    borderWidth?: number;
    showText?: boolean;
}

export class ExperienceBar {
    private scene: Scene;
    private container: Phaser.GameObjects.Container;
    private background: Phaser.GameObjects.Rectangle;
    private experienceFill: Phaser.GameObjects.Rectangle;
    private border: Phaser.GameObjects.Rectangle;
    private experienceText?: Phaser.GameObjects.Text;
    private levelText?: Phaser.GameObjects.Text;
    
    private currentExperience: number;
    private experienceToNext: number;
    private level: number;
    private width: number;
    private height: number;
    
    constructor(config: ExperienceBarConfig) {
        this.scene = config.scene;
        this.currentExperience = config.currentExperience;
        this.experienceToNext = config.experienceToNext;
        this.level = config.level;
        this.width = config.width;
        this.height = config.height;
        
        // Create container for all experience bar elements
        this.container = this.scene.add.container(config.x, config.y);
        
        // Background (empty experience)
        this.background = this.scene.add.rectangle(
            0, 0, 
            this.width, this.height, 
            config.backgroundColor || 0x404040
        );
        
        // Experience fill (current experience)
        this.experienceFill = this.scene.add.rectangle(
            0, 0, 
            this.width, this.height, 
            config.experienceColor || 0x00aaff
        );
        
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
        
        // Add level text (left side)
        this.levelText = this.scene.add.text(-this.width/2 - 30, 0, '', {
            fontSize: '14px',
            color: '#ffffff',
            fontFamily: 'Arial',
            stroke: '#000000',
            strokeThickness: 1
        }).setOrigin(1, 0.5);
        
        // Add experience text if requested
        if (config.showText) {
            this.experienceText = this.scene.add.text(0, 0, '', {
                fontSize: '12px',
                color: '#ffffff',
                fontFamily: 'Arial',
                stroke: '#000000',
                strokeThickness: 1
            }).setOrigin(0.5);
        }

        // Add elements to container
        this.container.add([this.background, this.experienceFill, this.border, this.levelText]);
        if (this.experienceText) {
            this.container.add(this.experienceText);
        }
        
        // Set scroll factor and depth for UI
        this.container.setScrollFactor(0); // Fixed to camera
        this.container.setDepth(1000); // High depth for UI
        
        // Update visual representation
        this.updateExperienceBar();
    }
    
    public updateExperience(currentExperience: number, experienceToNext: number, level: number): void {
        this.currentExperience = currentExperience;
        this.experienceToNext = experienceToNext;
        this.level = level;
        this.updateExperienceBar();
    }
    
    private updateExperienceBar(): void {
        const experiencePercentage = this.currentExperience / this.experienceToNext;
        const experienceWidth = this.width * experiencePercentage;
        
        // Update experience fill width and position
        this.experienceFill.width = experienceWidth;
        this.experienceFill.x = -(this.width - experienceWidth) / 2; // Align to left side
        
        // Update level text
        this.levelText!.setText(`LV ${this.level}`);
        
        // Update experience text if it exists
        if (this.experienceText) {
            this.experienceText.setText(`${this.currentExperience}/${this.experienceToNext}`);
        }
        
        // Experience bar is always visible (players always have a level)
        this.container.setVisible(true);
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