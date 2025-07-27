import { Scene } from 'phaser';
import { Player } from '../Player';

export class Game extends Scene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    background: Phaser.GameObjects.TileSprite;
    player: Player;
    debugText: Phaser.GameObjects.Text;

    constructor ()
    {
        super('Game');
    }

    create ()
    {
        this.camera = this.cameras.main;
        this.camera.setBackgroundColor(0x00ff00);

        // Create extended background for scrolling level
        this.background = this.add.tileSprite(0, 0, 3000, 768, 'background');
        this.background.setOrigin(0, 0);
        this.background.setAlpha(0.5);

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
        this.debugText = this.add.text(16, 768 - 120, '', {
            fontSize: '16px',
            color: '#ffffff',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: { x: 12, y: 8 }
        });
        this.debugText.setScrollFactor(0); // Fixed to camera, doesn't scroll with world
        this.debugText.setDepth(1000); // Always on top

        // Set up camera for horizontal scrolling level
        this.cameras.main.setBounds(0, 0, 3000, 768);
        this.cameras.main.startFollow(this.player);
        this.cameras.main.setFollowOffset(0, 0);
        this.cameras.main.setLerp(0.1, 0.1);

        // Instructions text (positioned relative to world, not camera)
        this.add.text(200, 100, 'Arrow Keys or WASD to Move\nSPACE to Attack\nExplore the 3000px wide level!', {
            fontFamily: 'Arial Black', fontSize: 20, color: '#ffffff',
            stroke: '#000000', strokeThickness: 4,
            align: 'center'
        }).setOrigin(0.5);
    }

    update()
    {
        // Update player
        this.player.update();

        // Update debug text with level progress
        const levelProgress = Math.round((this.player.x / 3000) * 100);
        this.debugText.setText([
            `Position: ${Math.round(this.player.x)}, ${Math.round(this.player.y)}`,
            `Level Progress: ${levelProgress}% (${Math.round(this.player.x)}/3000px)`,
            `State: ${this.player.getCurrentState()}`,
            `Health: ${this.player.currentHealth}/${this.player.maxHealth}`,
            `Speed: ${this.player.speed} | Scale: ${this.player.scaleX}x`
        ]);
    }
}
