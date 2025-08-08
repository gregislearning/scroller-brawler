import { Scene } from 'phaser';
import { GAME_CONFIG, FOREST_CONFIG } from './GameConstants';

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
    // Camera parameter kept in constructor for API compatibility, but not stored
    
    constructor(scene: Scene, _camera: Phaser.Cameras.Scene2D.Camera, worldWidth: number, worldHeight: number) {
        this.scene = scene;
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;
    }
    
    public addLayer(config: ParallaxLayer): void {
        this.layerConfigs.push(config);
        
        // Get the texture to determine its actual dimensions
        const texture = this.scene.textures.get(config.texture);
        // Width available if needed for future tile scale tuning
        const textureHeight = texture.source[0].height;
        
        // Special handling for ground layer (bottom 50% of screen)
        if (config.name === 'forest_ground') {
            // Create a tilesprite that exactly covers the ground area
            const layer = this.scene.add.tileSprite(
                0,                                // X position (left edge)
                GAME_CONFIG.GROUND_START_Y,       // Y position (top of ground section)
                GAME_CONFIG.WORLD_WIDTH,          // Full world width
                GAME_CONFIG.GROUND_HEIGHT,        // Exactly half the screen height
                config.texture
            );

            layer.setOrigin(0, 0);

            // Do not scale the display size; keep the area exactly half-height.
            // If we ever want to change the texture density, use setTileScale instead of setScale.

            layer.setAlpha(config.alpha);
            layer.setDepth(config.depth);
            layer.setScrollFactor(config.scrollFactor, 1);

            this.layers.push(layer);
            return;
        }
        
        // Regular background layers (full screen)
        const layer = this.scene.add.tileSprite(
            0, 
            config.offsetY, 
            this.worldWidth, 
            textureHeight,  // Use actual texture height instead of world height
            config.texture
        );
        
        // Configure layer properties
        layer.setOrigin(0, 0);
        
        // Scale to fill screen height while maintaining aspect ratio
        const scaleY = this.worldHeight / textureHeight;
        layer.setScale(config.scale, scaleY * config.scale);
        
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
            texture: FOREST_CONFIG.LAYERS.FAR.TEXTURE,
            scrollFactor: FOREST_CONFIG.LAYERS.FAR.SCROLL_FACTOR,
            scale: 1.0,
            alpha: FOREST_CONFIG.LAYERS.FAR.ALPHA,
            offsetY: 0,
            depth: FOREST_CONFIG.LAYERS.FAR.DEPTH
        });
        
        // Layer 2: Middle forest layer (trees, foliage)
        this.addLayer({
            name: 'forest_middle_background',
            texture: FOREST_CONFIG.LAYERS.MIDDLE.TEXTURE,
            scrollFactor: FOREST_CONFIG.LAYERS.MIDDLE.SCROLL_FACTOR,
            scale: 1.0,
            alpha: FOREST_CONFIG.LAYERS.MIDDLE.ALPHA,
            offsetY: 0,
            depth: FOREST_CONFIG.LAYERS.MIDDLE.DEPTH
        });
        
        // Layer 3: Front ground layer - walkable environment surface  
        this.addLayer({
            name: 'forest_ground',
            texture: FOREST_CONFIG.LAYERS.GROUND.TEXTURE,
            scrollFactor: FOREST_CONFIG.LAYERS.GROUND.SCROLL_FACTOR,
            scale: 1.0,
            alpha: FOREST_CONFIG.LAYERS.GROUND.ALPHA,
            offsetY: 0, // Positioned by special handling in addLayer method
            depth: FOREST_CONFIG.LAYERS.GROUND.DEPTH
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