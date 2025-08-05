import { Scene, Physics } from 'phaser';
import { HealthBar } from './HealthBar';

export interface EnemyConfig {
    scene: Scene;
    x: number;
    y: number;
    texture: string;
    frame?: string | number;
}

export enum EnemyState {
    IDLE = 'idle',
    WALKING = 'walking',
    BLOCKING = 'blocking',
    ATTACKING = 'attacking',
    HURT = 'hurt',
    DEAD = 'dead'
}

export class Enemy extends Physics.Arcade.Sprite {
    // Enemy stats
    public maxHealth: number = 80;
    public currentHealth: number = 80;
    public attackDamage: number = 15;
    public speed: number = 100;
    
    // State management
    private currentState: EnemyState = EnemyState.IDLE;
    private attackCooldown: number = 800; // milliseconds
    private lastAttackTime: number = 0;
    private isInvulnerable: boolean = false;
    private invulnerabilityDuration: number = 500; // milliseconds
    
    // Combat
    private attackRange: number = 70;
    private isAttacking: boolean = false;
    private isBlocking: boolean = false;
    
    // AI behavior
    private detectionRange: number = 200;
    private blockChance: number = 0.3; // 30% chance to block when attacked
    private lastActionTime: number = 0;
    private actionCooldown: number = 1000; // Time between AI actions
    
    // UI Elements
    private healthBar: HealthBar;
    
    constructor(config: EnemyConfig) {
        super(config.scene, config.x, config.y, config.texture, config.frame);
        
        // Add to scene and enable physics
        this.scene.add.existing(this as any);
        this.scene.physics.add.existing(this as any);
        
        // Set up physics properties
        this.setCollideWorldBounds(true);
        this.setDrag(300); // Add drag for smoother movement
        
        // Set initial state
        this.setEnemyState(EnemyState.IDLE);
        
        // Create animations if they don't exist
        this.createAnimations();
        
        // Create health bar that follows the enemy
        this.healthBar = new HealthBar({
            scene: this.scene,
            x: this.x,
            y: this.y - 60, // Above the enemy
            width: 60,
            height: 8,
            maxHealth: this.maxHealth,
            currentHealth: this.currentHealth,
            followTarget: this,
            offsetX: 0,
            offsetY: -60,
            backgroundColor: 0x404040,
            healthColor: 0xff4444, // Red for enemy
            borderColor: 0xffffff,
            borderWidth: 1
        });
    }
    
    private createAnimations(): void {
        const animsManager = this.scene.anims;
        
        // Only create animations if they don't already exist
        if (!animsManager.exists('samurai_idle')) {
            animsManager.create({
                key: 'samurai_idle',
                frames: animsManager.generateFrameNumbers(this.texture.key, { start: 0, end: 1 }), // Row 1: frames 0-1 (2 columns)
                frameRate: 4,
                repeat: -1
            });
        }
        
        if (!animsManager.exists('samurai_blocking')) {
            animsManager.create({
                key: 'samurai_blocking',
                frames: animsManager.generateFrameNumbers(this.texture.key, { start: 5, end: 8 }), // Row 2: frames 5-8 (4 columns)
                frameRate: 8,
                repeat: -1
            });
        }
        
        if (!animsManager.exists('samurai_attack')) {
            animsManager.create({
                key: 'samurai_attack',
                frames: animsManager.generateFrameNumbers(this.texture.key, { start: 10, end: 14 }), // Row 3: frames 10-14 (5 columns)
                frameRate: 12,
                repeat: 0
            });
        }
        
        if (!animsManager.exists('samurai_hurt')) {
            animsManager.create({
                key: 'samurai_hurt',
                frames: animsManager.generateFrameNumbers(this.texture.key, { start: 1, end: 1 }), // Use idle frame for hurt
                frameRate: 8,
                repeat: 0
            });
        }
    }
    
    public update(playerX: number, playerY: number): void {
        if (this.currentState === EnemyState.DEAD) {
            return;
        }
        
        this.updateAI(playerX, playerY);
        this.updateState();
        this.updateAnimations();
        
        // Update health bar
        this.healthBar.update();
    }
    
    private updateAI(playerX: number, playerY: number): void {
        if (this.currentState === EnemyState.ATTACKING || 
            this.currentState === EnemyState.HURT || 
            this.currentState === EnemyState.BLOCKING) {
            return;
        }
        
        const distanceToPlayer = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);
        const currentTime = this.scene.time.now;
        
        // Only take actions every actionCooldown milliseconds
        if (currentTime - this.lastActionTime < this.actionCooldown) {
            return;
        }
        
        if (distanceToPlayer <= this.detectionRange) {
            if (distanceToPlayer <= this.attackRange) {
                // Close enough to attack
                if (this.canAttack()) {
                    this.attack();
                    this.lastActionTime = currentTime;
                }
            } else {
                // Move towards player
                this.moveTowardsPlayer(playerX, playerY);
                this.setEnemyState(EnemyState.WALKING);
            }
        } else {
            // Player too far, return to idle
            this.setVelocity(0, 0);
            this.setEnemyState(EnemyState.IDLE);
        }
    }
    
    private moveTowardsPlayer(playerX: number, playerY: number): void {
        const directionX = playerX - this.x;
        const directionY = playerY - this.y;
        const distance = Math.sqrt(directionX * directionX + directionY * directionY);
        
        if (distance > 0) {
            const normalizedX = directionX / distance;
            const normalizedY = directionY / distance;
            
            this.setVelocity(normalizedX * this.speed, normalizedY * this.speed);
            
            // Flip sprite based on movement direction
            this.setFlipX(directionX < 0);
        }
    }
    
    private setEnemyState(newState: EnemyState): void {
        if (this.currentState !== newState) {
            this.currentState = newState;
            this.onStateChange(newState);
        }
    }
    
    private onStateChange(state: EnemyState): void {
        switch (state) {
            case EnemyState.ATTACKING:
                this.isAttacking = true;
                this.setVelocity(0, 0); // Stop movement during attack
                
                // End attack after animation
                this.scene.time.delayedCall(400, () => {
                    this.isAttacking = false;
                    this.setEnemyState(EnemyState.IDLE);
                });
                break;
                
            case EnemyState.BLOCKING:
                this.isBlocking = true;
                this.setVelocity(0, 0);
                
                // End blocking after a short time
                this.scene.time.delayedCall(800, () => {
                    this.isBlocking = false;
                    this.setEnemyState(EnemyState.IDLE);
                });
                break;
                
            case EnemyState.HURT:
                this.setVelocity(0, 0);
                this.makeInvulnerable();
                
                // End hurt state
                this.scene.time.delayedCall(400, () => {
                    if (this.currentHealth > 0) {
                        this.setEnemyState(EnemyState.IDLE);
                    }
                });
                break;
        }
    }
    
    private updateState(): void {
        if (this.currentState === EnemyState.ATTACKING || 
            this.currentState === EnemyState.HURT || 
            this.currentState === EnemyState.BLOCKING) {
            return; // Don't change state during these actions
        }
        
        const velocity = this.body!.velocity;
        const isMoving = Math.abs(velocity.x) > 10 || Math.abs(velocity.y) > 10;
        
        if (isMoving) {
            this.setEnemyState(EnemyState.WALKING);
        } else {
            this.setEnemyState(EnemyState.IDLE);
        }
    }
    
    private updateAnimations(): void {
        switch (this.currentState) {
            case EnemyState.IDLE:
                this.play('samurai_idle', true);
                break;
            case EnemyState.WALKING:
                this.play('samurai_idle', true); // Use idle for walking too
                break;
            case EnemyState.BLOCKING:
                this.play('samurai_blocking', true);
                break;
            case EnemyState.ATTACKING:
                this.play('samurai_attack', true);
                break;
            case EnemyState.HURT:
                this.play('samurai_hurt', true);
                break;
        }
    }
    
    private canAttack(): boolean {
        const currentTime = this.scene.time.now;
        return currentTime - this.lastAttackTime >= this.attackCooldown;
    }
    
    public attack(): void {
        if (!this.canAttack()) return;
        
        this.lastAttackTime = this.scene.time.now;
        this.setEnemyState(EnemyState.ATTACKING);
        
        // Create attack hitbox
        const attackX = this.flipX ? this.x - this.attackRange : this.x + this.attackRange;
        const attackY = this.y;
        
        // Emit attack event
        this.emit('attack', {
            x: attackX,
            y: attackY,
            damage: this.attackDamage,
            range: this.attackRange
        });
    }
    
    public takeDamage(damage: number): void {
        if (this.isInvulnerable || this.currentState === EnemyState.DEAD) {
            return;
        }
        
        // Check if blocking
        if (this.isBlocking && Math.random() < 0.7) { // 70% block success rate
            // Damage reduced by blocking
            damage = Math.floor(damage * 0.3);
        }
        
        this.currentHealth = Math.max(0, this.currentHealth - damage);
        
        // Update health bar
        this.healthBar.updateHealth(this.currentHealth, this.maxHealth);
        
        if (this.currentHealth <= 0) {
            this.die();
        } else {
            this.setEnemyState(EnemyState.HURT);
        }
        
        // Emit damage event
        this.emit('damage', this.currentHealth, this.maxHealth);
    }
    
    public startBlocking(): void {
        if (this.currentState === EnemyState.IDLE || this.currentState === EnemyState.WALKING) {
            this.setEnemyState(EnemyState.BLOCKING);
        }
    }
    
    private makeInvulnerable(): void {
        this.isInvulnerable = true;
        this.setTint(0xff0000); // Red tint to show damage
        
        this.scene.time.delayedCall(this.invulnerabilityDuration, () => {
            this.isInvulnerable = false;
            this.clearTint();
        });
    }
    
    private die(): void {
        this.setEnemyState(EnemyState.DEAD);
        this.setVelocity(0, 0);
        this.setTint(0x666666); // Gray tint for death
        
        // Hide health bar
        this.healthBar.setVisible(false);
        
        // Emit death event
        this.emit('death');
        
        // Remove after a delay
        this.scene.time.delayedCall(2000, () => {
            // Clean up health bar
            this.healthBar.destroy();
            this.destroy();
        });
    }
    
    public getState(): EnemyState {
        return this.currentState;
    }
    
    public getHealth(): { current: number; max: number } {
        return { current: this.currentHealth, max: this.maxHealth };
    }
} 