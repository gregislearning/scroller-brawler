import { Scene } from 'phaser';
import { Enemy } from './Enemy';
import { GAME_CONFIG } from './GameConstants';

export interface SpawnPoint {
    x: number;
    y: number;
    triggered: boolean;
    triggerDistance: number; // Distance from player when spawn should trigger
}

export interface EnemySpawnerConfig {
    scene: Scene;
    player: any; // Changed to any to access player level methods
    maxEnemies?: number; // Maximum enemies alive at once
    onEnemyKilled?: (enemy: Enemy) => void; // Callback for when enemy dies
}

export class EnemySpawner {
    private scene: Scene;
    private player: any; // Changed to any to access player level methods
    private enemies: Enemy[] = [];
    private spawnPoints: SpawnPoint[] = [];
    private maxEnemies: number;
    private spawnInterval: number = GAME_CONFIG.SPAWNING.SPAWN_INTERVAL;
    private onEnemyKilled?: (enemy: Enemy) => void;
    
    constructor(config: EnemySpawnerConfig) {
        this.scene = config.scene;
        this.player = config.player;
        this.maxEnemies = config.maxEnemies || GAME_CONFIG.SPAWNING.MAX_ENEMIES;
        this.onEnemyKilled = config.onEnemyKilled;
        
        this.setupSpawnPoints();
    }
    
    private setupSpawnPoints(): void {
        // Create spawn points across the level
        const worldWidth = GAME_CONFIG.WORLD_WIDTH;
        const startX = GAME_CONFIG.SCREEN_WIDTH; // Start spawning beyond initial screen
        
        // Create spawn points every 400 pixels
        for (let x = startX; x < worldWidth; x += this.spawnInterval) {
            // Top spawn point (near top of walkable area)
            this.spawnPoints.push({
                x: x,
                y: GAME_CONFIG.PHYSICS_START_Y + GAME_CONFIG.SPAWNING.SPAWN_OFFSET_FROM_EDGE,
                triggered: false,
                triggerDistance: GAME_CONFIG.SPAWNING.TRIGGER_DISTANCE
            });
            
            // Bottom spawn point (near bottom of walkable area)
            this.spawnPoints.push({
                x: x,
                y: GAME_CONFIG.PHYSICS_START_Y + GAME_CONFIG.PHYSICS_HEIGHT - GAME_CONFIG.SPAWNING.SPAWN_OFFSET_FROM_EDGE,
                triggered: false,
                triggerDistance: GAME_CONFIG.SPAWNING.TRIGGER_DISTANCE
            });
        }
        
        console.log(`Created ${this.spawnPoints.length} spawn points`);
    }
    
    public update(): void {
        this.checkSpawnTriggers();
        this.cleanupDeadEnemies();
    }
    
    private checkSpawnTriggers(): void {
        // Check if we should spawn new enemies based on player position
        for (const spawnPoint of this.spawnPoints) {
            if (!spawnPoint.triggered && this.enemies.length < this.maxEnemies) {
                const distanceToPlayer = Math.abs(this.player.x - spawnPoint.x);
                
                if (distanceToPlayer <= spawnPoint.triggerDistance) {
                    this.spawnEnemyAt(spawnPoint);
                    spawnPoint.triggered = true;
                }
            }
        }
    }
    
    private spawnEnemyAt(spawnPoint: SpawnPoint): void {
        const enemyLevel = this.calculateEnemyLevel();
        
        const enemy = new Enemy({
            scene: this.scene,
            x: spawnPoint.x,
            y: spawnPoint.y,
            texture: 'samurai_enemy',
            level: enemyLevel
        });
        
        // Scale enemy to match player display height for consistency
        const desiredDisplayHeight = this.player.displayHeight;
        const enemyBaseHeight = enemy.height; // natural frame height before scaling
        if (enemyBaseHeight > 0) {
            const scale = desiredDisplayHeight / enemyBaseHeight;
            enemy.setScale(scale);
        }
        
        // Set enemy depth to render alongside player
        enemy.setDepth(100); // Same as player depth
        
        // Set up enemy physics body
        enemy.body!.setSize(
            enemy.width * 0.6,
            enemy.height * 0.8
        );
        
        // Set up enemy event listeners
        enemy.on('death', () => {
            console.log(`Level ${enemy.getLevel()} enemy defeated in spawner!`);
            this.removeEnemy(enemy);
            
            // Award level-based experience
            if (this.player.gainExperience) {
                const xpReward = enemy.getExperienceReward();
                this.player.gainExperience(xpReward);
                console.log(`Player gained ${xpReward} XP from level ${enemy.getLevel()} enemy`);
            }
            
            // Handle item drops
            this.handleEnemyItemDrop(enemy);
            
            // Call the callback if provided (for additional logic)
            if (this.onEnemyKilled) {
                this.onEnemyKilled(enemy);
            }
        });

        enemy.on('damage', (currentHealth: number, maxHealth: number) => {
            console.log(`Spawned enemy health: ${currentHealth}/${maxHealth}`);
        });
        
        // Add to our tracking array
        this.enemies.push(enemy);
        
        console.log(`Spawned level ${enemyLevel} enemy at (${spawnPoint.x}, ${spawnPoint.y}). Active enemies: ${this.enemies.length}`);
    }
    
    private calculateEnemyLevel(): number {
        // All enemies are currently level 1
        return 1;
    }
    
    private removeEnemy(enemy: Enemy): void {
        const index = this.enemies.indexOf(enemy);
        if (index > -1) {
            this.enemies.splice(index, 1);
        }
    }
    
    private cleanupDeadEnemies(): void {
        // Remove dead enemies from our tracking array
        this.enemies = this.enemies.filter(enemy => enemy.active);
    }
    
    public getActiveEnemies(): Enemy[] {
        return this.enemies.filter(enemy => enemy.active);
    }
    
    public getEnemyCount(): number {
        return this.enemies.length;
    }
    
    // Method to get the closest enemy to the player (useful for combat systems)
    public getClosestEnemy(): Enemy | null {
        if (this.enemies.length === 0) return null;
        
        let closest = this.enemies[0];
        let closestDistance = Phaser.Math.Distance.Between(
            this.player.x, this.player.y,
            closest.x, closest.y
        );
        
        for (let i = 1; i < this.enemies.length; i++) {
            const enemy = this.enemies[i];
            const distance = Phaser.Math.Distance.Between(
                this.player.x, this.player.y,
                enemy.x, enemy.y
            );
            
            if (distance < closestDistance) {
                closest = enemy;
                closestDistance = distance;
            }
        }
        
        return closest;
    }
    
    private handleEnemyItemDrop(enemy: Enemy): void {
        const dropChance = enemy.getItemDropChance();
        
        if (Math.random() < dropChance) {
            const itemId = this.selectItemForLevel(enemy.getLevel());
            if (itemId) {
                // For now, just log the drop - in a full implementation, you'd create a world drop
                console.log(`Level ${enemy.getLevel()} enemy dropped: ${itemId}`);
                
                // Try to add to player inventory if there's space
                const gameScene = this.scene as any;
                if (gameScene.inventory && !gameScene.inventory.isFull()) {
                    const result = gameScene.inventory.add(itemId);
                    if (result.success) {
                        console.log(`Added ${itemId} to player inventory`);
                    }
                }
            }
        }
    }
    
    private selectItemForLevel(enemyLevel: number): string | null {
        // Define level-based item drop pools
        const itemPools = {
            low: ['potion_health_small'], // Levels 1-2
            mid: ['potion_health_small', 'potion_attack_tonic', 'potion_speed_draught'], // Levels 3-5
            high: ['potion_attack_tonic', 'potion_speed_draught', 'item_boots_haste', 'item_amulet_strength'], // Levels 6-8
            elite: ['item_boots_haste', 'item_amulet_strength', 'item_ring_vitality'] // Levels 9+
        };
        
        let pool: string[];
        if (enemyLevel <= 2) {
            pool = itemPools.low;
        } else if (enemyLevel <= 5) {
            pool = itemPools.mid;
        } else if (enemyLevel <= 8) {
            pool = itemPools.high;
        } else {
            pool = itemPools.elite;
        }
        
        return pool[Math.floor(Math.random() * pool.length)];
    }
    
    // Reset spawn points (useful for restarting level)
    public reset(): void {
        this.spawnPoints.forEach(point => point.triggered = false);
        this.enemies.forEach(enemy => enemy.destroy());
        this.enemies = [];
    }
} 