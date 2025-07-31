import { Scene } from 'phaser';

export class Preloader extends Scene
{
    constructor ()
    {
        super('Preloader');
    }

    init ()
    {
        //  We loaded this image in our Boot Scene, so we can display it here
        this.add.image(512, 384, 'background');

        //  A simple progress bar. This is the outline of the bar.
        this.add.rectangle(512, 384, 468, 32).setStrokeStyle(1, 0xffffff);

        //  This is the progress bar itself. It will increase in size from the left based on the % of progress.
        const bar = this.add.rectangle(512-230, 384, 4, 28, 0xffffff);

        //  Use the 'progress' event emitted by the LoaderPlugin to update the loading bar
        this.load.on('progress', (progress: number) => {

            //  Update the progress bar (our bar is 464px wide, so 100% = 464px)
            bar.width = 4 + (460 * progress);

        });
    }

    preload ()
    {
        //  Load the assets for the game - Replace with your own assets
        this.load.setPath('assets');

        this.load.image('logo', 'logo.png');
        
        // Load forest parallax background layers
        this.load.image('forest_back', 'backgrounds/forest/back.png');
        this.load.image('forest_middle', 'backgrounds/forest/middle.png');
        this.load.image('forest_front', 'backgrounds/forest/front.png');
        
        // Load player character spritesheet
        // TODO: Adjust frameWidth/frameHeight to match your actual sprite dimensions
        this.load.spritesheet('player_char', 'player_char.png', {
            frameWidth: 32,   // Try 32, 48, or 64 depending on your sprite size
            frameHeight: 32   // Should match the height of each individual sprite
        });
        
        // Load samurai enemy spritesheet
        // Row 1: idle (2 columns), Row 2: blocking (4 columns), Row 3: attacking (5 columns)
        this.load.spritesheet('samurai_enemy', 'samuri_animations.png', {
            frameWidth: 32,   // Adjust based on actual sprite dimensions
            frameHeight: 32   // Should match the height of each individual sprite
        });
    }

    create ()
    {
        //  When all the assets have loaded, it's often worth creating global objects here that the rest of the game can use.
        //  For example, you can define global animations here, so we can use them in other scenes.

        //  Move to the MainMenu. You could also swap this for a Scene Transition, such as a camera fade.
        this.scene.start('MainMenu');
    }
}
