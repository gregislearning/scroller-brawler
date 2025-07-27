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

        // Debug text for player state and health
        this.debugText = this.add.text(16, 16, '', {
            fontSize: '18px',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 8, y: 4 }
        });

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
            `Speed: ${this.player.speed}`
        ]);
    }
}
