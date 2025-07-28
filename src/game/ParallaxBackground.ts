import { Scene } from 'phaser';

export interface ParallaxLayer {
    name: string;
    texture: string;
    scrollFactor: number;     // How fast this layer scrolls (0.0 = static, 1.0 = normal speed)
    scale: number;           // Visual scale of the layer
    alpha: number;           // Transparency (0.0 = invisible, 1.0 = opaque)
    tint?: number;           // Optional color tint for variety
    offsetY: number;         // Vertical offset for positioning
    depth: number;           // Render depth (lower = behind)
}

export class ParallaxBackground {
    private scene: Scene;
    private layers: Phaser.GameObjects.TileSprite[] = [];
    private layerConfigs: ParallaxLayer[] = [];
    private worldWidth: number;
    private worldHeight: number;
    private camera: Phaser.Cameras.Scene2D.Camera;
    
    constructor(scene: Scene, camera: Phaser.Cameras.Scene2D.Camera, worldWidth: number, worldHeight: number) {
        this.scene = scene;
        this.camera = camera;
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;
    }
    
    public addLayer(config: ParallaxLayer): void {
        this.layerConfigs.push(config);
        
        // Create tile sprite for this layer
        const layer = this.scene.add.tileSprite(
            0, 
            config.offsetY, 
            this.worldWidth, 
            this.worldHeight, 
            config.texture
        );
        
        // Configure layer properties
        layer.setOrigin(0, 0);
        layer.setScale(config.scale);
        layer.setAlpha(config.alpha);
        layer.setDepth(config.depth);
        
        // Apply tint if specified
        if (config.tint !== undefined) {
            layer.setTint(config.tint);
        }
        
        // Set scroll factor for parallax effect
        layer.setScrollFactor(config.scrollFactor, 1);
        
        this.layers.push(layer);
    }
    
    public setupDefaultLayers(): void {
        // Layer 1: Far background (sky/distant elements)
        this.addLayer({
            name: 'far_background',
            texture: 'background',
            scrollFactor: 0.1,        // Moves very slowly
            scale: 1.5,               // Zoomed in a bit
            alpha: 0.3,               // Very transparent
            tint: 0x6699ff,           // Blue tint for distance effect
            offsetY: -50,             // Slight upward offset
            depth: 0                  // Furthest back
        });
        
        // Layer 2: Mid background
        this.addLayer({
            name: 'mid_background',
            texture: 'background',
            scrollFactor: 0.3,        // Moderate movement
            scale: 1.2,               // Slightly larger
            alpha: 0.5,               // Semi-transparent
            tint: 0x99aaff,           // Lighter blue tint
            offsetY: -25,             // Small upward offset
            depth: 1                  // Middle depth
        });
        
        // Layer 3: Near background
        this.addLayer({
            name: 'near_background',
            texture: 'background',
            scrollFactor: 0.7,        // Fast movement
            scale: 1.0,               // Normal size
            alpha: 0.7,               // More opaque
            offsetY: 0,               // No offset
            depth: 2                  // Closer to front
        });
        
        // The main game layer (player, enemies) has scrollFactor 1.0 by default
    }
    
    public setupForestLayers(): void {
        // Layer 1: Far forest background (distant trees, sky)
        this.addLayer({
            name: 'forest_far_background',
            texture: 'forest_back',
            scrollFactor: 0.1,        // Moves very slowly for distance effect
            scale: 1.0,               // Normal size
            alpha: 0.8,               // Slightly transparent
            offsetY: 0,               // No offset
            depth: 0                  // Furthest back
        });
        
        // Layer 2: Middle forest layer (trees, foliage)
        this.addLayer({
            name: 'forest_middle_background',
            texture: 'forest_middle',
            scrollFactor: 0.4,        // Moderate movement for middle depth
            scale: 1.0,               // Normal size
            alpha: 0.9,               // More opaque than far layer
            offsetY: 0,               // No offset
            depth: 1                  // Middle depth
        });
        
        // Optional: Keep the original background as a far distance layer with heavy tint
        this.addLayer({
            name: 'forest_sky',
            texture: 'background',    // Use original bg as sky layer
            scrollFactor: 0.05,       // Almost static (distant sky)
            scale: 1.2,               // Slightly larger
            alpha: 0.3,               // Very transparent
            tint: 0x87CEEB,           // Sky blue tint
            offsetY: -100,            // Offset upward for sky effect
            depth: -1                 // Behind everything
        });
        
        // The main game layer (player, enemies) will render at depth 100+
    }
    
    public update(): void {
        // Any dynamic parallax effects can be added here
        // For example: subtle movement, color shifts, etc.
        
        // Example: Subtle wave effect on far layer
        if (this.layers.length > 0) {
            const time = this.scene.time.now * 0.001; // Convert to seconds
            const waveOffset = Math.sin(time * 0.5) * 2; // Very subtle movement
            this.layers[0].setY(this.layerConfigs[0].offsetY + waveOffset);
        }
    }
    
    public setLayerVisibility(layerName: string, visible: boolean): void {
        const index = this.layerConfigs.findIndex(config => config.name === layerName);
        if (index !== -1 && this.layers[index]) {
            this.layers[index].setVisible(visible);
        }
    }
    
    public setLayerAlpha(layerName: string, alpha: number): void {
        const index = this.layerConfigs.findIndex(config => config.name === layerName);
        if (index !== -1 && this.layers[index]) {
            this.layers[index].setAlpha(alpha);
            this.layerConfigs[index].alpha = alpha;
        }
    }
    
    public setLayerScrollFactor(layerName: string, scrollFactor: number): void {
        const index = this.layerConfigs.findIndex(config => config.name === layerName);
        if (index !== -1 && this.layers[index]) {
            this.layers[index].setScrollFactor(scrollFactor, 1);
            this.layerConfigs[index].scrollFactor = scrollFactor;
        }
    }
    
    public getLayerConfig(layerName: string): ParallaxLayer | undefined {
        return this.layerConfigs.find(config => config.name === layerName);
    }
    
    public getAllLayerConfigs(): ParallaxLayer[] {
        return [...this.layerConfigs];
    }
    
    public destroy(): void {
        this.layers.forEach(layer => layer.destroy());
        this.layers = [];
        this.layerConfigs = [];
    }
    
    // Debug method to visualize layer info
    public debugLayers(): void {
        console.log('Parallax Background Layers:');
        this.layerConfigs.forEach((config, index) => {
            console.log(`  ${index}: ${config.name} - scroll: ${config.scrollFactor}x, alpha: ${config.alpha}, depth: ${config.depth}`);
        });
    }
} 