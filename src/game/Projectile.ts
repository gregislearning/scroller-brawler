import { Scene, Physics } from 'phaser';
import { GAME_CONFIG, DEPTH_LAYERS } from './GameConstants';

export interface ProjectileConfig {
    scene: Scene;
    x: number;
    y: number;
    texture: string;
    frame?: string | number;
    velocityX: number;
    velocityY: number;
    damage: number;
    range: number; // Maximum distance the projectile can travel
    owner?: any; // The entity that fired this projectile (enemy or player)
}

export class Projectile extends Physics.Arcade.Sprite {
    public damage: number;
    public range: number;
    public owner: any;
    private startX: number;
    private startY: number;
    private hasHitTarget: boolean = false;

    constructor(config: ProjectileConfig) {
        super(config.scene, config.x, config.y, config.texture, config.frame);
        
        // Store projectile properties
        this.damage = config.damage;
        this.range = config.range;
        this.owner = config.owner;
        this.startX = config.x;
        this.startY = config.y;
        
        // Add to scene and enable physics
        this.scene.add.existing(this);
        this.scene.physics.add.existing(this);
        
        // Set up physics properties
        this.setVelocity(config.velocityX, config.velocityY);
        
        // Set depth to render above game objects but below effects
        this.setDepth(DEPTH_LAYERS.PROJECTILES);
        
        // Set up physics body size (generous for easier hits)
        this.body!.setSize(
            this.width * 0.8,
            this.height * 0.8
        );
        
        // Auto-destroy after a reasonable time (failsafe)
        this.scene.time.delayedCall(5000, () => {
            if (this.active) {
                this.destroy();
            }
        });
    }
    
    preUpdate(time: number, delta: number): void {
        super.preUpdate(time, delta);
        
        if (!this.active || this.hasHitTarget) {
            return;
        }
        
        // Check if projectile has traveled beyond its range
        const distanceTraveled = Phaser.Math.Distance.Between(
            this.startX, this.startY,
            this.x, this.y
        );
        
        if (distanceTraveled >= this.range) {
            this.destroy();
            return;
        }
        
        // Check if projectile has left the world bounds
        if (this.x < 0 || this.x > GAME_CONFIG.WORLD_WIDTH || 
            this.y < GAME_CONFIG.PHYSICS_START_Y || 
            this.y > GAME_CONFIG.PHYSICS_START_Y + GAME_CONFIG.PHYSICS_HEIGHT) {
            this.destroy();
            return;
        }
    }
    
    public hitTarget(target: any): void {
        if (this.hasHitTarget) {
            return;
        }
        
        this.hasHitTarget = true;
        
        // Emit hit event with damage and target information
        this.emit('hit', {
            target: target,
            damage: this.damage,
            projectile: this,
            owner: this.owner
        });
        
        // Create a small impact effect
        this.createImpactEffect();
        
        // Destroy the projectile
        this.destroy();
    }
    
    private createImpactEffect(): void {
        // Create a simple impact effect (a small puff or spark)
        const impactEffect = this.scene.add.circle(this.x, this.y, 8, 0xffaa00, 0.8);
        impactEffect.setDepth(DEPTH_LAYERS.EFFECTS);
        
        // Animate the impact effect
        this.scene.tweens.add({
            targets: impactEffect,
            scaleX: 0,
            scaleY: 0,
            alpha: 0,
            duration: 200,
            ease: 'Power2',
            onComplete: () => impactEffect.destroy()
        });
    }
    
    public getDamage(): number {
        return this.damage;
    }
    
    public getOwner(): any {
        return this.owner;
    }
}
