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
        
        // Load samurai enemy raw spritesheet image (3 columns x 4 rows)
        // We'll slice it dynamically in create() so we don't need to hardcode pixel sizes
        this.load.image('samurai_spritesheet_raw', 'samurai-spritesheet.png');
    }

    create ()
    {
        //  When all the assets have loaded, it's often worth creating global objects here that the rest of the game can use.
        //  For example, you can define global animations here, so we can use them in other scenes.

        // Convert raw samurai spritesheet image into a Phaser spritesheet using a 3x4 grid
        const samuraiTexture = this.textures.get('samurai_spritesheet_raw');
        if (samuraiTexture && samuraiTexture.key !== '__MISSING') {
            const sourceImage = samuraiTexture.getSourceImage() as HTMLImageElement;
            const frameWidth = Math.floor(sourceImage.width / 3);
            const frameHeight = Math.floor(sourceImage.height / 4);
            // Register the sliced spritesheet with the key used by the game
            this.textures.addSpriteSheet('samurai_enemy', sourceImage, {
                frameWidth,
                frameHeight
            });

            // Use nearest-neighbor filtering to prevent bleeding between rows/columns
            const slicedTexture = this.textures.get('samurai_enemy') as Phaser.Textures.Texture;
            if (slicedTexture) {
                slicedTexture.setFilter(Phaser.Textures.FilterMode.NEAREST);

                // Add slightly trimmed copies of specific frames to avoid sampling the next row
                // Idle frames: (col 0, row 1) → index 3 and (col 0, row 2) → index 6
                const idle0X = 0 * frameWidth;
                const idle0Y = 1 * frameHeight;
                const idle1X = 0 * frameWidth;
                const idle1Y = 2 * frameHeight;
                const trimmedHeight = Math.max(1, frameHeight - 5);
                // Create custom sub-frames with 1px trimmed from the bottom edge
                slicedTexture.add('idle_fix_0', 0, idle0X, idle0Y, frameWidth, trimmedHeight);
                slicedTexture.add('idle_fix_1', 0, idle1X, idle1Y, frameWidth, trimmedHeight);
            }
        }

        //  Move to the MainMenu. You could also swap this for a Scene Transition, such as a camera fade.
        this.scene.start('MainMenu');
    }
}
