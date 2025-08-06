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
    player: Phaser.GameObjects.Sprite;
    maxEnemies?: number; // Maximum enemies alive at once
}

export class EnemySpawner {
    private scene: Scene;
    private player: Phaser.GameObjects.Sprite;
    private enemies: Enemy[] = [];
    private spawnPoints: SpawnPoint[] = [];
    private maxEnemies: number;
    private lastSpawnX: number = 0;
    private spawnInterval: number = GAME_CONFIG.SPAWNING.SPAWN_INTERVAL;
    
    constructor(config: EnemySpawnerConfig) {
        this.scene = config.scene;
        this.player = config.player;
        this.maxEnemies = config.maxEnemies || GAME_CONFIG.SPAWNING.MAX_ENEMIES;
        
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
        const enemy = new Enemy({
            scene: this.scene,
            x: spawnPoint.x,
            y: spawnPoint.y,
            texture: 'samurai_enemy'
        });
        
        // Scale enemy using same scale as player for consistency
        enemy.setScale(GAME_CONFIG.PLAYER_SCALE);
        
        // Set enemy depth to render alongside player
        enemy.setDepth(100); // Same as player depth
        
        // Set up enemy physics body
        enemy.body!.setSize(
            enemy.width * 0.6,
            enemy.height * 0.8
        );
        
        // Set up enemy event listeners
        enemy.on('death', () => {
            console.log('Enemy defeated in spawner!');
            this.removeEnemy(enemy);
        });

        enemy.on('damage', (currentHealth: number, maxHealth: number) => {
            console.log(`Spawned enemy health: ${currentHealth}/${maxHealth}`);
        });
        
        // Add to our tracking array
        this.enemies.push(enemy);
        
        console.log(`Spawned enemy at (${spawnPoint.x}, ${spawnPoint.y}). Active enemies: ${this.enemies.length}`);
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
    
    // Reset spawn points (useful for restarting level)
    public reset(): void {
        this.spawnPoints.forEach(point => point.triggered = false);
        this.enemies.forEach(enemy => enemy.destroy());
        this.enemies = [];
    }
} 