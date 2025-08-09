import { Scene } from 'phaser';
import { Player } from '../Player';
import { Enemy } from '../Enemy';
import { CameraManager } from '../CameraManager';
import { ParallaxBackground } from '../ParallaxBackground';
import { HealthBar } from '../HealthBar';
import { ExperienceBar } from '../ExperienceBar';
import { EnemySpawner } from '../EnemySpawner';
import { GAME_CONFIG, FOREST_CONFIG, DEPTH_LAYERS, CALCULATED_VALUES } from '../GameConstants';

export class Game extends Scene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    parallaxBackground: ParallaxBackground;
    player: Player;
    enemy: Enemy; // Keep for backwards compatibility, but will be removed
    enemySpawner: EnemySpawner;
    cameraManager: CameraManager;
    debugText: Phaser.GameObjects.Text;
    playerHUD: HealthBar;
    playerExperienceBar: ExperienceBar;

    constructor ()
    {
        super('Game');
    }

    create ()
    {
        this.camera = this.cameras.main;
        this.camera.setBackgroundColor(FOREST_CONFIG.BACKGROUND_COLOR);

        // Create parallax background system: render only sky layers above the black line
        this.parallaxBackground = new ParallaxBackground(this, this.cameras.main, GAME_CONFIG.WORLD_WIDTH, GAME_CONFIG.WORLD_HEIGHT);
        this.parallaxBackground.setupForestSkyLayers();

        // Enable physics with extended world bounds - walkable area is ground level
        this.physics.world.setBounds(0, GAME_CONFIG.PHYSICS_START_Y, GAME_CONFIG.WORLD_WIDTH, GAME_CONFIG.PHYSICS_HEIGHT);

        // Draw a vertical gradient over the walkable ground area (top: forest green, bottom: lighter green)
        const groundGradient = this.add.graphics();
        groundGradient.fillGradientStyle(
            0x2f3a15, // darker top-left
            0x2f3a15, // darker top-right
            0x5f7f3a, // muted bottom-left
            0x5f7f3a, // muted bottom-right
            1, 1, 1, 1
        );
        groundGradient.fillRect(0, GAME_CONFIG.GROUND_START_Y, GAME_CONFIG.WORLD_WIDTH, GAME_CONFIG.GROUND_HEIGHT);
        groundGradient.setScrollFactor(1, 1);
        groundGradient.setDepth(DEPTH_LAYERS.ENVIRONMENT_MIDDLE); // Behind the black line and player

        // Visual marker for the top edge of the walkable area
        const walkableTopLine = this.add.graphics();
        walkableTopLine.fillStyle(0x000000, 1);
        walkableTopLine.fillRect(0, GAME_CONFIG.GROUND_START_Y - 1, GAME_CONFIG.WORLD_WIDTH, 2);
        walkableTopLine.setScrollFactor(1, 1);
        walkableTopLine.setDepth(DEPTH_LAYERS.ENVIRONMENT_GROUND);

        // Create player with character spritesheet
        this.player = new Player({
            scene: this,
            x: GAME_CONFIG.PLAYER_START_X,
            y: GAME_CONFIG.PLAYER_START_Y,
            texture: 'player_char'
        });

        // Scale character using configured scale factor
        // NOTE: Use this same scale for all characters (enemies, bosses) for consistency
        this.player.setScale(GAME_CONFIG.PLAYER_SCALE);
        
        // Set player depth to render in front of parallax background layers
        this.player.setDepth(DEPTH_LAYERS.PLAYER);
        
        // Ensure physics body scales with the sprite for accurate collision detection
        this.player.body!.setSize(
            this.player.width * 0.6,  // Slightly smaller than visual for better gameplay feel
            this.player.height * 0.8   // Taller hitbox for more natural collision
        );

        // Create fixed player HUD health bar (top-left of screen)
        this.playerHUD = new HealthBar({
            scene: this,
            x: 120,
            y: 30,
            width: 200,
            height: 20,
            maxHealth: this.player.maxHealth,
            currentHealth: this.player.currentHealth,
            backgroundColor: 0x404040,
            healthColor: 0x00ff00,
            borderColor: 0xffffff,
            borderWidth: 2,
            fixed: true, // Fixed to camera
            showText: true // Show health numbers
        });

        // Add player name/label
        this.add.text(20, 20, 'Player', {
            fontSize: '16px',
            color: '#ffffff',
            fontFamily: 'Arial',
            stroke: '#000000',
            strokeThickness: 2
        }).setScrollFactor(0).setDepth(DEPTH_LAYERS.UI_TEXT);

        // Create player experience bar (below health bar)
        const playerLevelInfo = this.player.getLevelInfo();
        this.playerExperienceBar = new ExperienceBar({
            scene: this,
            x: 120,
            y: 60, // Below the health bar
            width: 200,
            height: 15,
            currentExperience: playerLevelInfo.experience,
            experienceToNext: playerLevelInfo.experienceToNext,
            level: playerLevelInfo.level,
            backgroundColor: 0x404040,
            experienceColor: 0x00aaff,
            borderColor: 0xffffff,
            borderWidth: 2,
            showText: true
        });

        // Set up player event listeners
        this.player.on('attack', (attackData: any) => {
            // Handle attack logic here
            console.log('Player attacked at:', attackData.x, attackData.y);
        });

        this.player.on('damage', (currentHealth: number, maxHealth: number) => {
            // Handle damage - update UI, etc.
            console.log(`Player health: ${currentHealth}/${maxHealth}`);
            // Update HUD health bar
            this.playerHUD.updateHealth(currentHealth, maxHealth);
        });

        this.player.on('death', () => {
            // Handle player death
            console.log('Player died!');
            this.scene.start('GameOver');
        });

        this.player.on('levelUp', (levelData: any) => {
            console.log(`Player leveled up to ${levelData.newLevel}!`);
            console.log(`Bonuses: +${levelData.bonuses.health} HP, +${levelData.bonuses.damage} ATK, +${levelData.bonuses.speed} SPD`);
        });

        this.player.on('experienceGain', (expData: any) => {
            console.log(`XP: ${expData.current}/${expData.needed} (${expData.gained} gained)`);
            // Update experience bar
            this.playerExperienceBar.updateExperience(expData.current, expData.needed, expData.level);
        });

        // Initialize enemy spawning system
        this.enemySpawner = new EnemySpawner({
            scene: this,
            player: this.player,
            maxEnemies: GAME_CONFIG.SPAWNING.MAX_ENEMIES,
            onEnemyKilled: (enemy: Enemy) => {
                // Award experience to player when spawned enemies die
                this.player.gainExperience(GAME_CONFIG.LEVELING.ENEMY_EXPERIENCE_VALUES.BASIC_ENEMY);
            }
        });

        // Keep the original enemy for now (will be phased out)
        this.enemy = new Enemy({
            scene: this,
            x: GAME_CONFIG.PLAYER_START_X + 300, // Start 300 pixels to the right of player
            y: GAME_CONFIG.PLAYER_START_Y,
            texture: 'samurai_enemy'
        });

        // Scale enemy using same scale as player for consistency
        this.enemy.setScale(GAME_CONFIG.PLAYER_SCALE);
        
        // Set enemy depth to render alongside player
        this.enemy.setDepth(DEPTH_LAYERS.PLAYER);
        
        // Set up enemy physics body
        this.enemy.body!.setSize(
            this.enemy.width * 0.6,
            this.enemy.height * 0.8
        );

        // Set up combat system that works with both single enemy and spawned enemies
        this.setupCombatSystem();

        // Debug text for player state and health (bottom of screen, follows camera)
        this.debugText = this.add.text(16, GAME_CONFIG.DEBUG.DEBUG_TEXT_Y, '', {
            fontSize: `${GAME_CONFIG.DEBUG.DEBUG_TEXT_SIZE}px`,
            color: '#ffffff',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: GAME_CONFIG.DEBUG.DEBUG_TEXT_PADDING
        });
        this.debugText.setScrollFactor(0); // Fixed to camera, doesn't scroll with world
        this.debugText.setDepth(DEPTH_LAYERS.UI_DEBUG); // Always on top

        // Initialize advanced camera system with configured values
        this.cameraManager = new CameraManager(this, this.cameras.main, this.player, {
            lookAheadFactor: GAME_CONFIG.CAMERA.LOOK_AHEAD_FACTOR,
            lookAheadMaxDistance: GAME_CONFIG.CAMERA.LOOK_AHEAD_MAX_DISTANCE,
            deadzoneWidth: GAME_CONFIG.CAMERA.DEADZONE_WIDTH,
            deadzoneHeight: GAME_CONFIG.CAMERA.DEADZONE_HEIGHT,
            followSpeed: GAME_CONFIG.CAMERA.FOLLOW_SPEED,
            returnSpeed: GAME_CONFIG.CAMERA.RETURN_SPEED,
            worldWidth: GAME_CONFIG.WORLD_WIDTH,
            worldHeight: GAME_CONFIG.WORLD_HEIGHT,
            shakeEnabled: GAME_CONFIG.CAMERA.SHAKE_ENABLED,
            shakeIntensity: GAME_CONFIG.CAMERA.SHAKE_INTENSITY
        });

        // Instructions text (positioned relative to world, not camera)
        this.add.text(GAME_CONFIG.PLAYER_START_X, CALCULATED_VALUES.CENTER_Y - 100, 'Arrow Keys or WASD to Move\nSPACE to Attack\nExplore the Forest Environment!\nGround layer (front.png) creates walkable surface', {
            fontFamily: 'Arial Black', fontSize: 16, color: '#ffffff',
            stroke: '#000000', strokeThickness: 4,
            align: 'center'
        }).setOrigin(0.5).setDepth(DEPTH_LAYERS.UI_TEXT); // Render above everything
    }

    private setupCombatSystem(): void {
        // Set up enemy event listeners for the original enemy (backwards compatibility)
        this.enemy.on('attack', (attackData: any) => {
            this.handleEnemyAttack(attackData);
        });

        this.enemy.on('damage', (currentHealth: number, maxHealth: number) => {
            console.log(`Enemy health: ${currentHealth}/${maxHealth}`);
        });

        this.enemy.on('death', () => {
            console.log('Enemy defeated!');
            // Award experience to player
            this.player.gainExperience(GAME_CONFIG.LEVELING.ENEMY_EXPERIENCE_VALUES.BASIC_ENEMY);
        });

        // Set up player attack system that works with all enemies
        this.player.on('attack', (attackData: any) => {
            this.handlePlayerAttack(attackData);
        });
    }

    private handleEnemyAttack(attackData: any): void {
        // Check if attack hits player
        const distance = Phaser.Math.Distance.Between(
            attackData.x, attackData.y,
            this.player.x, this.player.y
        );
        
        if (distance <= attackData.range) {
            this.player.takeDamage(attackData.damage);
        }
    }

    private handlePlayerAttack(attackData: any): void {
        // Check attacks against the original enemy
        if (this.enemy && this.enemy.active) {
            const distance = Phaser.Math.Distance.Between(
                attackData.x, attackData.y,
                this.enemy.x, this.enemy.y
            );
            
            if (distance <= attackData.range && this.enemy.getState() !== 'dead') {
                this.enemy.takeDamage(attackData.damage);
            }
        }

        // Check attacks against all spawned enemies
        const spawnedEnemies = this.enemySpawner.getActiveEnemies();
        for (const enemy of spawnedEnemies) {
            const distance = Phaser.Math.Distance.Between(
                attackData.x, attackData.y,
                enemy.x, enemy.y
            );
            
            if (distance <= attackData.range && enemy.getState() !== 'dead') {
                enemy.takeDamage(attackData.damage);
            }
        }
    }

    update()
    {
        // Update player
        this.player.update();
        
        // Update enemy spawning system
        this.enemySpawner.update();
        
        // Update original enemy with player position for AI (backwards compatibility)
        if (this.enemy && this.enemy.active) {
            this.enemy.update(this.player.x, this.player.y);
        }

        // Update all spawned enemies
        const spawnedEnemies = this.enemySpawner.getActiveEnemies();
        for (const enemy of spawnedEnemies) {
            enemy.update(this.player.x, this.player.y);
            
            // Set up attack event listener for each spawned enemy (if not already set)
            if (enemy.listeners('attack').length === 0) {
                enemy.on('attack', (attackData: any) => {
                    this.handleEnemyAttack(attackData);
                });
            }
        }
        
        // Update advanced camera system
        this.cameraManager.update();
        
        // Update parallax background system
        this.parallaxBackground.update();

        // Enforce forward-only walking area: don't allow player to move left of the camera view
        const cameraLeftEdge = this.cameras.main.worldView.left;
        const minPlayerX = cameraLeftEdge + 8; // small margin to avoid clipping
        if (this.player.x < minPlayerX) {
            this.player.x = minPlayerX;
            if (this.player.body) {
                this.player.body.velocity.x = Math.max(0, this.player.body.velocity.x);
            }
        }

        // Update debug text with level progress, camera, and enemy info
        const levelProgress = Math.round((this.player.x / 3000) * 100);
        const cameraX = Math.round(this.cameras.main.worldView.centerX);
        const cameraY = Math.round(this.cameras.main.worldView.centerY);
        const velocity = this.player.body!.velocity;
        const layerCount = this.parallaxBackground.getAllLayerConfigs().length;
        
        const enemyHealth = this.enemy && this.enemy.active ? this.enemy.getHealth() : { current: 0, max: 0 };
        const enemyState = this.enemy && this.enemy.active ? this.enemy.getState() : 'dead';
        const spawnedEnemyCount = this.enemySpawner.getEnemyCount();
        const playerLevelInfo = this.player.getLevelInfo();
        
        this.debugText.setText([
            `Player: (${Math.round(this.player.x)}, ${Math.round(this.player.y)}) | Camera: (${cameraX}, ${cameraY})`,
            `Level Progress: ${levelProgress}% | Velocity: (${Math.round(velocity.x)}, ${Math.round(velocity.y)})`,
            `Player - Level: ${playerLevelInfo.level} | XP: ${playerLevelInfo.experience}/${playerLevelInfo.experienceToNext} (${playerLevelInfo.experienceProgress}%)`,
            `Player - State: ${this.player.getCurrentState()} | Health: ${this.player.currentHealth}/${this.player.maxHealth} | ATK: ${this.player.attackDamage}`,
            `Original Enemy - State: ${enemyState} | Health: ${enemyHealth.current}/${enemyHealth.max}`,
            `Spawned Enemies: ${spawnedEnemyCount} | Scale: ${this.player.scaleX}x | Forest Layers: ${layerCount}`
        ]);
    }
}
