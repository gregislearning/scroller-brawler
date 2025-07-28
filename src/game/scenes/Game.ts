import { Scene } from 'phaser';
import { Player } from '../Player';
import { CameraManager } from '../CameraManager';
import { ParallaxBackground } from '../ParallaxBackground';

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
        this.camera.setBackgroundColor(0x4a5d23); // Forest green background color

        // Create parallax background system with forest layers
        this.parallaxBackground = new ParallaxBackground(this, this.cameras.main, 3000, 768);
        this.parallaxBackground.setupForestLayers();

        // Enable physics with extended world bounds
        this.physics.world.setBounds(0, 0, 3000, 768);

        // Create player with character spritesheet (start near left side for scrolling)
        this.player = new Player({
            scene: this,
            x: 200,
            y: 384,
            texture: 'player_char'
        });

        // Scale character to be ~1/100 of screen area (from 32x32 to ~88x88 pixels)
        // NOTE: Use this same scale (2.75) for all characters (enemies, bosses) for consistency
        this.player.setScale(2.75);
        
        // Set player depth to render in front of parallax background layers
        this.player.setDepth(100);
        
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
        this.debugText = this.add.text(16, 768 - 140, '', {
            fontSize: '14px',
            color: '#ffffff',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: { x: 10, y: 6 }
        });
        this.debugText.setScrollFactor(0); // Fixed to camera, doesn't scroll with world
        this.debugText.setDepth(1000); // Always on top

        // Initialize advanced camera system with look-ahead and deadzone
        this.cameraManager = new CameraManager(this, this.cameras.main, this.player, {
            lookAheadFactor: 0.4,        // Look ahead 40% of movement
            lookAheadMaxDistance: 200,   // Max 200px look-ahead
            deadzoneWidth: 300,          // 300px horizontal deadzone
            deadzoneHeight: 150,         // 150px vertical deadzone  
            followSpeed: 0.08,           // Smooth following when moving
            returnSpeed: 0.05,           // Slower return when idle
            worldWidth: 3000,            // Match our level width
            worldHeight: 768,            // Match our level height
            shakeEnabled: false,          // Enable camera shake effects
            // shakeIntensity: 1.0          // Normal shake intensity
        });

        // Instructions text (positioned relative to world, not camera)
        this.add.text(200, 100, 'Arrow Keys or WASD to Move\nSPACE to Attack\nExplore the Forest with Multi-layer Parallax!\nNotice: Background & Middle layers scroll at different speeds', {
            fontFamily: 'Arial Black', fontSize: 16, color: '#ffffff',
            stroke: '#000000', strokeThickness: 4,
            align: 'center'
        }).setOrigin(0.5).setDepth(200); // Render above everything
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
            `Scale: ${this.player.scaleX}x | Forest Parallax: ${layerCount} layers (back.png + middle.png)`,
            `Controls: WASD/Arrows=Move, SPACE=Attack | Forest Environment Active`
        ]);
    }
}
