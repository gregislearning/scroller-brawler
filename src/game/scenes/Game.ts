import { Scene } from 'phaser';
import { Player } from '../Player';
import { CameraManager } from '../CameraManager';
import { ParallaxBackground } from '../ParallaxBackground';
import { GAME_CONFIG, FOREST_CONFIG, DEPTH_LAYERS, CALCULATED_VALUES } from '../GameConstants';

export class Game extends Scene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    parallaxBackground: ParallaxBackground;
    player: Player;
    cameraManager: CameraManager;
    debugText: Phaser.GameObjects.Text;

    constructor ()
    {
        super('Game');
    }

    create ()
    {
        this.camera = this.cameras.main;
        this.camera.setBackgroundColor(FOREST_CONFIG.BACKGROUND_COLOR);

        // Create parallax background system with forest layers
        this.parallaxBackground = new ParallaxBackground(this, this.cameras.main, GAME_CONFIG.WORLD_WIDTH, GAME_CONFIG.WORLD_HEIGHT);
        this.parallaxBackground.setupForestLayers();

        // Enable physics with extended world bounds - walkable area is ground level
        this.physics.world.setBounds(0, GAME_CONFIG.PHYSICS_START_Y, GAME_CONFIG.WORLD_WIDTH, GAME_CONFIG.PHYSICS_HEIGHT);

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

        // Set up player event listeners
        this.player.on('attack', (attackData: any) => {
            // Handle attack logic here
            console.log('Player attacked at:', attackData.x, attackData.y);
        });

        this.player.on('damage', (currentHealth: number, maxHealth: number) => {
            // Handle damage - update UI, etc.
            console.log(`Player health: ${currentHealth}/${maxHealth}`);
        });

        this.player.on('death', () => {
            // Handle player death
            console.log('Player died!');
            this.scene.start('GameOver');
        });

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

    update()
    {
        // Update player
        this.player.update();
        
        // Update advanced camera system
        this.cameraManager.update(this.time.now);
        
        // Update parallax background system
        this.parallaxBackground.update();

        // Update debug text with level progress, camera, and parallax info
        const levelProgress = Math.round((this.player.x / 3000) * 100);
        const cameraX = Math.round(this.cameras.main.worldView.centerX);
        const cameraY = Math.round(this.cameras.main.worldView.centerY);
        const velocity = this.player.body!.velocity;
        const layerCount = this.parallaxBackground.getAllLayerConfigs().length;
        
        this.debugText.setText([
            `Player: (${Math.round(this.player.x)}, ${Math.round(this.player.y)}) | Camera: (${cameraX}, ${cameraY})`,
            `Level Progress: ${levelProgress}% | Velocity: (${Math.round(velocity.x)}, ${Math.round(velocity.y)})`,
            `State: ${this.player.getCurrentState()} | Health: ${this.player.currentHealth}/${this.player.maxHealth}`,
            `Scale: ${this.player.scaleX}x | Forest Layers: ${layerCount} | Using GameConstants`,
            `Ground: ${GAME_CONFIG.GROUND_HEIGHT_RATIO * 100}% | Physics: ${GAME_CONFIG.PHYSICS_START_Y}-${GAME_CONFIG.PHYSICS_START_Y + GAME_CONFIG.PHYSICS_HEIGHT}px`
        ]);
    }
}
