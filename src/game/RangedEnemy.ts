import { Scene } from 'phaser';
import { Enemy, EnemyConfig, EnemyState } from './Enemy';
import { Projectile } from './Projectile';
import { GAME_CONFIG, DEPTH_LAYERS } from './GameConstants';

export interface RangedEnemyConfig extends EnemyConfig {
    projectileSpeed?: number;
    projectileRange?: number;
}

export class RangedEnemy extends Enemy {
    // Ranged-specific properties
    private rangedAttackRange: number = 300; // Much longer range than melee
    private projectileSpeed: number = 200;
    private projectileRange: number = 400;
    private projectileTexture: string = 'samurai_enemy'; // Will use same texture as a placeholder
    private minAttackDistance: number = 120; // Minimum distance to maintain from player
    
    constructor(config: RangedEnemyConfig) {
        super(config);
        
        // Override ranged-specific properties
        if (config.projectileSpeed) this.projectileSpeed = config.projectileSpeed;
        if (config.projectileRange) this.projectileRange = config.projectileRange;
        
        // Reduce health slightly since ranged enemies have tactical advantage
        this.maxHealth = Math.floor(this.maxHealth * 0.8);
        this.currentHealth = this.maxHealth;
        
        // Update the attack range to the ranged value
        this.attackRange = this.rangedAttackRange;
    }
    
    public update(playerX: number, playerY: number): void {
        if (this.getState() === EnemyState.DEAD) {
            return;
        }
        
        // Always face the player (copy logic from base class since method is private)
        this.setFlipX(playerX < this.x);

        this.updateRangedAI(playerX, playerY);
        
        // Let parent handle state and animation updates
        // We need to call the parent's private methods somehow, so let's call super.update
        // but first we need to override our AI behavior before the parent processes it
        // Actually, let's just copy what the parent does for non-AI parts
        
        // Update animations based on current state
        this.updateAnimations();
        
        // Update health bar (copied from parent)
        const healthBar = (this as any).healthBar;
        if (healthBar && healthBar.update) {
            healthBar.update();
        }
    }
    
    private updateRangedAI(playerX: number, playerY: number): void {
        if (this.getState() === EnemyState.ATTACKING || 
            this.getState() === EnemyState.HURT || 
            this.getState() === EnemyState.STUNNED || 
            this.getState() === EnemyState.BLOCKING ||
            this.isWindingUp) {
            return;
        }
        
        const distanceToPlayer = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);
        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const horizontallyInRange = Math.abs(dx) <= this.rangedAttackRange;
        const verticallyAligned = Math.abs(dy) <= this.verticalAttackTolerance;
        const currentTime = this.scene.time.now;
        
        // Only take actions every actionCooldown milliseconds
        if (currentTime - this.lastActionTime < this.actionCooldown) {
            return;
        }
        
        if (distanceToPlayer <= this.rangedAttackRange) {
            // If too close, back away to maintain optimal distance
            if (distanceToPlayer < this.minAttackDistance) {
                this.moveAwayFromPlayer(playerX, playerY);
                this.lastActionTime = currentTime;
            }
            // If in good range and aligned, attack
            else if (horizontallyInRange && verticallyAligned) {
                if (this.canAttack()) {
                    this.startAttackWindup();
                    this.lastActionTime = currentTime;
                }
            }
            // If not aligned, reposition
            else {
                this.moveTowardsPlayer(playerX, playerY);
            }
        } else {
            // Player too far, return to idle or move closer if they're in detection range
            const detectionRange = this.rangedAttackRange + 100; // Slightly larger detection
            if (distanceToPlayer <= detectionRange) {
                this.moveTowardsPlayer(playerX, playerY);
            } else {
                this.setVelocity(0, 0);
            }
        }
        
        // Update movement state based on velocity
        this.updateMovementState();
    }
    
    private updateMovementState(): void {
        const velocity = this.body!.velocity;
        const isMoving = Math.abs(velocity.x) > 10 || Math.abs(velocity.y) > 10;
        
        if (this.getState() === EnemyState.ATTACKING || 
            this.getState() === EnemyState.HURT || 
            this.getState() === EnemyState.STUNNED || 
            this.getState() === EnemyState.BLOCKING) {
            return; // Don't change state during these actions
        }
        
        if (isMoving) {
            this.setEnemyState(EnemyState.WALKING);
        } else {
            this.setEnemyState(EnemyState.IDLE);
        }
    }
    

    

    

    

    
    private moveAwayFromPlayer(playerX: number, playerY: number): void {
        const directionX = this.x - playerX; // Opposite direction
        const directionY = this.y - playerY; // Opposite direction
        const distance = Math.sqrt(directionX * directionX + directionY * directionY);
        
        if (distance > 0) {
            const normalizedX = directionX / distance;
            const normalizedY = directionY / distance;
            
            this.setVelocity(normalizedX * this.speed * 0.8, normalizedY * this.speed * 0.8); // Slightly slower retreat
        }
    }
    
    public attack(): void {
        if (!this.canAttack() && !this.isWindingUp) return;
        
        // Update the last attack time
        this.lastAttackTime = this.scene.time.now;
        this.lastActionTime = this.scene.time.now;
        
        // Set the attacking state
        this.setEnemyState(EnemyState.ATTACKING);
        
        // Fire a projectile towards the player
        const player = (this.scene as any).player as any | undefined;
        if (player) {
            this.fireProjectile(player.x, player.y);
        }
        
        console.log('Ranged enemy fired projectile!');
        
        // Emit attack event like the parent does
        this.emit('attack', {
            x: this.x,
            y: this.y,
            damage: this.attackDamage,
            range: this.rangedAttackRange,
            type: 'ranged'
        });
    }
    
    private fireProjectile(targetX: number, targetY: number): void {
        // Get player velocity for predictive aiming
        const player = (this.scene as any).player as any | undefined;
        let adjustedTargetX = targetX;
        let adjustedTargetY = targetY;
        
        if (player && player.body) {
            // Predict where the player will be based on their current velocity
            const playerVelocity = player.body.velocity;
            const timeToTarget = Phaser.Math.Distance.Between(this.x, this.y, targetX, targetY) / this.projectileSpeed;
            const prediction = 0.3; // How much to lead the target (0-1, where 1 is full prediction)
            
            adjustedTargetX = targetX + (playerVelocity.x * timeToTarget * prediction);
            adjustedTargetY = targetY + (playerVelocity.y * timeToTarget * prediction);
        }
        
        // Calculate direction to predicted target position
        const dx = adjustedTargetX - this.x;
        const dy = adjustedTargetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            // Normalize direction and apply speed
            const velocityX = (dx / distance) * this.projectileSpeed;
            const velocityY = (dy / distance) * this.projectileSpeed;
            
            // Create the projectile slightly in front of the enemy to avoid collision
            const offsetDistance = 30;
            const projectileX = this.x + (dx / distance) * offsetDistance;
            const projectileY = this.y + (dy / distance) * offsetDistance;
            
            // Create a simple circular projectile instead of using the samurai sprite
            const projectile = this.scene.add.circle(projectileX, projectileY, 8, 0xff4444);
            
            // Enable physics on the circle
            this.scene.physics.add.existing(projectile);
            
            // Set velocity
            (projectile.body as Phaser.Physics.Arcade.Body).setVelocity(velocityX, velocityY);
            
            // Set depth
            projectile.setDepth(DEPTH_LAYERS.PROJECTILES);
            
            // Add projectile properties
            (projectile as any).damage = this.attackDamage;
            (projectile as any).range = this.projectileRange;
            (projectile as any).owner = this;
            (projectile as any).startX = projectileX;
            (projectile as any).startY = projectileY;
            
            // Auto-destroy after range is reached
            const checkRange = () => {
                if (!projectile.active) return;
                
                const distanceTraveled = Phaser.Math.Distance.Between(
                    (projectile as any).startX, (projectile as any).startY,
                    projectile.x, projectile.y
                );
                
                if (distanceTraveled >= this.projectileRange) {
                    projectile.destroy();
                    return;
                }
                
                // Continue checking
                this.scene.time.delayedCall(50, checkRange);
            };
            checkRange();
            
            // Emit projectile event so the game scene can handle collisions
            this.emit('projectile', {
                projectile: projectile,
                owner: this
            });
        }
    }
    

    
    // Override getExperienceReward to give slightly more XP since ranged enemies are more challenging
    public getExperienceReward(): number {
        const baseXP = GAME_CONFIG.LEVELING.ENEMY_EXPERIENCE_VALUES.BASIC_ENEMY;
        const levelMultiplier = 1 + (this.level - 1) * 0.3;
        const rangedBonus = 1.2; // 20% more XP than melee enemies
        return Math.floor(baseXP * levelMultiplier * rangedBonus);
    }
}
