import { Scene, Physics } from 'phaser';
import { HealthBar } from './HealthBar';
import { GAME_CONFIG } from './GameConstants';

export interface PlayerConfig {
    scene: Scene;
    x: number;
    y: number;
    texture: string;
    frame?: string | number;
}

export enum PlayerState {
    IDLE = 'idle',
    WALKING = 'walking',
    ATTACKING = 'attacking',
    HURT = 'hurt',
    STUNNED = 'stunned',
    BLOCKING = 'blocking',
    DEAD = 'dead'
}

export class Player extends Physics.Arcade.Sprite {
    private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    private wasdKeys: { [key: string]: Phaser.Input.Keyboard.Key };
    
    // Player stats
    public maxHealth: number = 100;
    public currentHealth: number = 100;
    public attackDamage: number = 20;
    public speed: number = 200;
    
    // Leveling system
    public level: number = 1;
    public experience: number = 0;
    public experienceToNextLevel: number = GAME_CONFIG.LEVELING.BASE_EXPERIENCE_TO_LEVEL;
    public totalExperience: number = 0;
    
    // State management
    private currentState: PlayerState = PlayerState.IDLE;
    private attackCooldown: number = 500; // milliseconds
    private lastAttackTime: number = 0;
    private isInvulnerable: boolean = false;
    private invulnerabilityDuration: number = 1000; // milliseconds
    
    // Combat
    private attackRange: number = 80;
    private isAttacking: boolean = false;
    private isBlocking: boolean = false;
    
    // UI Elements
    private healthBar: HealthBar;
    
    constructor(config: PlayerConfig) {
        super(config.scene, config.x, config.y, config.texture, config.frame);
        
        // Add to scene and enable physics
        this.scene.add.existing(this as any);
        this.scene.physics.add.existing(this as any);
        
        // Set up physics properties
        this.setCollideWorldBounds(true);
        this.setDrag(500); // Add drag for smoother movement
        
        // Initialize input
        this.setupInput();
        
        // Set initial state
        this.setPlayerState(PlayerState.IDLE);
        
        // Create animations if they don't exist
        this.createAnimations();
        
        // Create health bar that follows the player
        this.healthBar = new HealthBar({
            scene: this.scene,
            x: this.x,
            y: this.y - 60, // Above the player
            width: 60,
            height: 8,
            maxHealth: this.maxHealth,
            currentHealth: this.currentHealth,
            followTarget: this,
            offsetX: 0,
            offsetY: -60,
            backgroundColor: 0x404040,
            healthColor: 0x00ff00,
            borderColor: 0xffffff,
            borderWidth: 1
        });
    }
    
    private setupInput(): void {
        // Cursor keys (arrow keys) - only for movement
        this.cursors = this.scene.input.keyboard!.createCursorKeys();
        
        // WASD keys - reserved for other actions, not movement
        this.wasdKeys = this.scene.input.keyboard!.addKeys('W,S,A,D,SPACE') as { [key: string]: Phaser.Input.Keyboard.Key };
    }
    
    private createAnimations(): void {
        const animsManager = this.scene.anims;
        
        // Only create animations if they don't already exist
        if (!animsManager.exists('player_idle')) {
            animsManager.create({
                key: 'player_idle',
                frames: animsManager.generateFrameNumbers(this.texture.key, { start: 0, end: 7 }), // Row 0: frames 0-7 (skip last 2 for smoother loop)
                frameRate: 8,
                repeat: -1
            });
        }
        
        if (!animsManager.exists('player_walk')) {
            animsManager.create({
                key: 'player_walk',
                frames: animsManager.generateFrameNumbers(this.texture.key, { start: 20, end: 27 }), // Row 2: frames 20-27 for walking
                frameRate: 10,
                repeat: -1
            });
        }
        
        if (!animsManager.exists('player_attack')) {
            animsManager.create({
                key: 'player_attack',
                frames: animsManager.generateFrameNumbers(this.texture.key, { start: 30, end: 35 }), // Row 3: frames 30-35 for attack
                frameRate: 15,
                repeat: 0
            });
        }
        
        if (!animsManager.exists('player_hurt')) {
            animsManager.create({
                key: 'player_hurt',
                frames: animsManager.generateFrameNumbers(this.texture.key, { start: 40, end: 45 }), // Row 4: frames 40-45 for hurt/dying
                frameRate: 8,
                repeat: 0
            });
        }
    }
    
    public update(): void {
        if (this.currentState === PlayerState.DEAD) {
            return;
        }
        
        this.handleInput();
        this.updateState();
        this.updateAnimations();
        
        // Update health bar
        this.healthBar.update();
    }
    
    private handleInput(): void {
        if (this.currentState === PlayerState.ATTACKING || 
            this.currentState === PlayerState.HURT || 
            this.currentState === PlayerState.STUNNED ||
            this.currentState === PlayerState.BLOCKING) {
            return;
        }
        
        // Only arrow keys for movement
        const leftPressed = this.cursors.left?.isDown;
        const rightPressed = this.cursors.right?.isDown;
        const upPressed = this.cursors.up?.isDown;
        const downPressed = this.cursors.down?.isDown;
        
        // Attack can use either space or WASD space
        const attackPressed = this.cursors.space?.isDown || this.wasdKeys.SPACE?.isDown;
        
        // Handle movement
        let velocityX = 0;
        let velocityY = 0;
        
        if (leftPressed) {
            velocityX = -this.speed;
            this.setFlipX(true);
        } else if (rightPressed) {
            velocityX = this.speed;
            this.setFlipX(false);
        }
        
        if (upPressed) {
            velocityY = -this.speed;
        } else if (downPressed) {
            velocityY = this.speed;
        }
        
        // Normalize diagonal movement
        if (velocityX !== 0 && velocityY !== 0) {
            velocityX *= 0.707; // sqrt(2)/2
            velocityY *= 0.707;
        }
        
        this.setVelocity(velocityX, velocityY);
        
        // Handle attack
        if (attackPressed && this.canAttack()) {
            this.attack();
        }
    }
    
    private updateState(): void {
        if (this.currentState === PlayerState.ATTACKING || 
            this.currentState === PlayerState.HURT || 
            this.currentState === PlayerState.STUNNED || 
            this.currentState === PlayerState.BLOCKING ||
            this.currentState === PlayerState.DEAD) {
            return;
        }
        
        const velocity = this.body!.velocity;
        const isMoving = Math.abs(velocity.x) > 10 || Math.abs(velocity.y) > 10;
        
        if (isMoving) {
            this.setPlayerState(PlayerState.WALKING);
        } else {
            this.setPlayerState(PlayerState.IDLE);
        }
    }
    
    private updateAnimations(): void {
        switch (this.currentState) {
            case PlayerState.IDLE:
                this.play('player_idle', true);
                break;
            case PlayerState.WALKING:
                this.play('player_walk', true);
                break;
            case PlayerState.ATTACKING:
                this.play('player_attack', true);
                break;
            case PlayerState.HURT:
                this.play('player_hurt', true);
                break;
            case PlayerState.STUNNED:
                this.play('player_hurt', true); // Use hurt animation for stunned state
                break;
            case PlayerState.BLOCKING:
                this.play('player_idle', true); // Use idle animation for blocking (defensive stance)
                break;
        }
    }
    
    private setPlayerState(newState: PlayerState): void {
        if (this.currentState !== newState) {
            this.currentState = newState;
            this.onStateChange(newState);
        }
    }
    
    private onStateChange(state: PlayerState): void {
        // Clean up previous state
        if (this.currentState === PlayerState.BLOCKING && state !== PlayerState.BLOCKING) {
            this.isBlocking = false;
        }
        
        switch (state) {
            case PlayerState.ATTACKING:
                this.isAttacking = true;
                this.setVelocity(0, 0); // Stop movement during attack
                
                // End attack after animation
                this.scene.time.delayedCall(300, () => {
                    this.isAttacking = false;
                    this.setPlayerState(PlayerState.IDLE);
                });
                break;
                
            case PlayerState.HURT:
                this.setVelocity(0, 0);
                this.makeInvulnerable();
                
                // End hurt state
                this.scene.time.delayedCall(500, () => {
                    if (this.currentHealth > 0) {
                        this.setPlayerState(PlayerState.IDLE);
                    }
                });
                break;
                
            case PlayerState.STUNNED:
                this.setVelocity(0, 0); // Stop movement during stun
                
                // End stunned state - longer duration than hurt for clear feedback
                this.scene.time.delayedCall(800, () => {
                    if (this.currentHealth > 0) {
                        this.setPlayerState(PlayerState.IDLE);
                    }
                });
                break;
                
            case PlayerState.BLOCKING:
                this.isBlocking = true;
                this.setVelocity(0, 0); // Stop movement during block
                
                // Note: Blocking state will be controlled externally (key press/release)
                // No automatic timeout for blocking
                break;
        }
    }
    
    private canAttack(): boolean {
        const currentTime = this.scene.time.now;
        return !this.isAttacking && 
               this.currentState !== PlayerState.STUNNED && 
               this.currentState !== PlayerState.BLOCKING &&
               (currentTime - this.lastAttackTime) >= this.attackCooldown;
    }
    
    public attack(): void {
        if (!this.canAttack()) return;
        
        this.lastAttackTime = this.scene.time.now;
        this.setPlayerState(PlayerState.ATTACKING);
        
        // Create attack hitbox (you can customize this based on your needs)
        const attackX = this.flipX ? this.x - this.attackRange : this.x + this.attackRange;
        const attackY = this.y;
        
        // You can emit an event or call a method to handle attack collision
        this.emit('attack', {
            x: attackX,
            y: attackY,
            damage: this.attackDamage,
            range: this.attackRange
        });
    }
    
    public takeDamage(damage: number): void {
        if (this.isInvulnerable || this.currentState === PlayerState.DEAD) {
            return;
        }
        
        // Check if blocking - reduce damage to 10% if blocking
        if (this.isBlocking && this.currentState === PlayerState.BLOCKING) {
            damage = Math.floor(damage * 0.1); // 10% damage when blocking
            console.log(`Player blocked! Damage reduced to ${damage}`);
        }
        
        this.currentHealth = Math.max(0, this.currentHealth - damage);
        
        // Update health bar
        this.healthBar.updateHealth(this.currentHealth, this.maxHealth);
        
        if (this.currentHealth <= 0) {
            this.die();
        } else {
            // Only get stunned if not blocking
            if (this.currentState !== PlayerState.BLOCKING) {
                // Set to stunned state when taking damage - prevents attacking
                this.setPlayerState(PlayerState.STUNNED);
                // Also trigger hurt state for visual feedback and invulnerability
                this.makeInvulnerable();
            } else {
                // If blocking, just show brief damage effect without stunning
                this.scene.tweens.add({
                    targets: this,
                    alpha: 0.8,
                    duration: 100,
                    yoyo: true,
                    repeat: 1,
                    onComplete: () => {
                        this.setAlpha(1);
                    }
                });
            }
        }
        
        // Emit damage event for UI updates
        this.emit('damage', this.currentHealth, this.maxHealth);
    }
    
    private makeInvulnerable(): void {
        this.isInvulnerable = true;
        
        // Visual feedback for invulnerability
        this.scene.tweens.add({
            targets: this,
            alpha: 0.5,
            duration: 100,
            yoyo: true,
            repeat: this.invulnerabilityDuration / 200,
            onComplete: () => {
                this.setAlpha(1);
                this.isInvulnerable = false;
            }
        });
    }
    
    private die(): void {
        this.setPlayerState(PlayerState.DEAD);
        this.setVelocity(0, 0);
        
        // Reset combat flags
        this.isBlocking = false;
        this.isAttacking = false;
        
        // Hide health bar
        this.healthBar.setVisible(false);
        
        // Fade out effect
        this.scene.tweens.add({
            targets: this,
            alpha: 0,
            duration: 1000,
            onComplete: () => {
                this.emit('death');
            }
        });
    }
    
    public heal(amount: number): void {
        this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);
        this.emit('heal', this.currentHealth, this.maxHealth);
    }
    
    public startBlocking(): void {
        if (this.currentState === PlayerState.IDLE || this.currentState === PlayerState.WALKING) {
            this.setPlayerState(PlayerState.BLOCKING);
        }
    }
    
    public stopBlocking(): void {
        if (this.currentState === PlayerState.BLOCKING) {
            this.isBlocking = false;
            this.setPlayerState(PlayerState.IDLE);
        }
    }
    
    public isCurrentlyBlocking(): boolean {
        return this.isBlocking && this.currentState === PlayerState.BLOCKING;
    }
    
    public getHealthPercentage(): number {
        return this.currentHealth / this.maxHealth;
    }
    
    public getCurrentState(): PlayerState {
        return this.currentState;
    }
    
    public gainExperience(amount: number): void {
        console.log(`Player gained ${amount} experience!`);
        
        this.experience += amount;
        this.totalExperience += amount;
        
        // Check for level up
        while (this.experience >= this.experienceToNextLevel) {
            this.levelUp();
        }
        
        // Emit experience gain event for UI updates
        this.emit('experienceGain', {
            gained: amount,
            current: this.experience,
            needed: this.experienceToNextLevel,
            level: this.level,
            total: this.totalExperience
        });
    }
    
    private levelUp(): void {
        this.experience -= this.experienceToNextLevel;
        this.level++;
        
        // Calculate experience needed for next level (exponential growth)
        this.experienceToNextLevel = Math.floor(
            GAME_CONFIG.LEVELING.BASE_EXPERIENCE_TO_LEVEL * 
            Math.pow(GAME_CONFIG.LEVELING.EXPERIENCE_MULTIPLIER, this.level - 1)
        );
        
        // Apply level up bonuses
        this.applyLevelUpBonuses();
        
        console.log(`Level up! Player is now level ${this.level}. Next level requires ${this.experienceToNextLevel} XP.`);
        
        // Emit level up event
        this.emit('levelUp', {
            newLevel: this.level,
            experienceToNext: this.experienceToNextLevel,
            bonuses: this.getLastLevelBonuses()
        });
    }
    
    private applyLevelUpBonuses(): void {
        // Increase max health
        const healthIncrease = GAME_CONFIG.LEVELING.BONUSES_PER_LEVEL.HEALTH;
        this.maxHealth += healthIncrease;
        this.currentHealth += healthIncrease; // Also heal the increase amount
        
        // Increase attack damage
        const damageIncrease = GAME_CONFIG.LEVELING.BONUSES_PER_LEVEL.DAMAGE;
        this.attackDamage += damageIncrease;
        
        // Increase speed (capped at configured maximum)
        const speedIncrease = GAME_CONFIG.LEVELING.BONUSES_PER_LEVEL.SPEED;
        if (this.speed < GAME_CONFIG.LEVELING.SPEED_CAP) {
            this.speed += speedIncrease;
        }
        
        // Update health bar to reflect new max health
        this.healthBar.updateHealth(this.currentHealth, this.maxHealth);
    }
    
    private getLastLevelBonuses(): { health: number; damage: number; speed: number } {
        return {
            health: GAME_CONFIG.LEVELING.BONUSES_PER_LEVEL.HEALTH,
            damage: GAME_CONFIG.LEVELING.BONUSES_PER_LEVEL.DAMAGE,
            speed: this.speed < GAME_CONFIG.LEVELING.SPEED_CAP ? GAME_CONFIG.LEVELING.BONUSES_PER_LEVEL.SPEED : 0
        };
    }
    
    public getLevelInfo(): { 
        level: number; 
        experience: number; 
        experienceToNext: number; 
        totalExperience: number;
        experienceProgress: number; // Percentage to next level
    } {
        const experienceProgress = (this.experience / this.experienceToNextLevel) * 100;
        
        return {
            level: this.level,
            experience: this.experience,
            experienceToNext: this.experienceToNextLevel,
            totalExperience: this.totalExperience,
            experienceProgress: Math.round(experienceProgress)
        };
    }
    
    public getAttackRange(): number {
        return this.attackRange;
    }
    
    public isAlive(): boolean {
        return this.currentState !== PlayerState.DEAD;
    }
} 