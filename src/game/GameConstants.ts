// Game Configuration Constants
// Central location for all game dimensions and settings

export const GAME_CONFIG = {
    // Screen Dimensions
    SCREEN_WIDTH: 1024,
    SCREEN_HEIGHT: 768,
    
    // World Dimensions  
    WORLD_WIDTH: 3000,
    get WORLD_HEIGHT() { return this.SCREEN_HEIGHT; },
    
    // Ground/Environment Layout
    GROUND_HEIGHT_RATIO: 0.5,  // Ground takes up 50% of screen height
    get GROUND_HEIGHT() { return this.SCREEN_HEIGHT * this.GROUND_HEIGHT_RATIO; },
    get GROUND_START_Y() { return this.SCREEN_HEIGHT * (1 - this.GROUND_HEIGHT_RATIO); },
    get SKY_HEIGHT() { return this.SCREEN_HEIGHT * (1 - this.GROUND_HEIGHT_RATIO); },
    
    // Physics Bounds (walkable area)
    get PHYSICS_START_Y() { return this.GROUND_START_Y; },
    get PHYSICS_HEIGHT() { return this.GROUND_HEIGHT; },
    
    // Player Configuration
    PLAYER_SCALE: 2.75,
    get PLAYER_START_X() { return 200; },
    get PLAYER_START_Y() { return this.GROUND_START_Y + (this.GROUND_HEIGHT * 0.6); }, // 60% down the ground area
    
    // Camera Configuration
    CAMERA: {
        LOOK_AHEAD_FACTOR: 0.4,
        LOOK_AHEAD_MAX_DISTANCE: 200,
        DEADZONE_WIDTH: 300,
        DEADZONE_HEIGHT: 150,
        FOLLOW_SPEED: 0.08,
        RETURN_SPEED: 0.05,
        SHAKE_ENABLED: true,
        SHAKE_INTENSITY: 1.0
    },
    
    // Parallax Configuration
    PARALLAX: {
        FAR_SCROLL_FACTOR: 0.1,
        MIDDLE_SCROLL_FACTOR: 0.4,
        GROUND_SCROLL_FACTOR: 1.0,
        
        // Alpha values for layering
        FAR_ALPHA: 0.8,
        MIDDLE_ALPHA: 0.9,
        GROUND_ALPHA: 1.0
    },
    
    // Debug Configuration
    DEBUG: {
        get DEBUG_TEXT_Y() { return GAME_CONFIG.SCREEN_HEIGHT - 140; },
        DEBUG_TEXT_SIZE: 14,
        DEBUG_TEXT_PADDING: { x: 10, y: 6 }
    },
    
    // UI Configuration
    UI: {
        HEALTH_BAR: {
            PLAYER_HUD_X: 120,
            PLAYER_HUD_Y: 30,
            PLAYER_HUD_WIDTH: 200,
            PLAYER_HUD_HEIGHT: 20,
            FLOATING_WIDTH: 60,
            FLOATING_HEIGHT: 8,
            FLOATING_OFFSET_Y: -60
        },
        EXPERIENCE_BAR: {
            PLAYER_HUD_X: 120,
            PLAYER_HUD_Y: 60,
            PLAYER_HUD_WIDTH: 200,
            PLAYER_HUD_HEIGHT: 15
    },
    INVENTORY: {
      HOTBAR_SLOTS: 6,
      HOTBAR_SLOT_SIZE: 44,
      HOTBAR_SLOT_GAP: 8,
      get HOTBAR_X() { return 16; }, // bottom-left corner padding
      get HOTBAR_Y() { return GAME_CONFIG.SCREEN_HEIGHT - 16; }, // bottom padding
    }
    },
    
    // Enemy Spawning Configuration
    SPAWNING: {
        MAX_ENEMIES: 3,
        SPAWN_INTERVAL: 400, // Distance between spawn points
        TRIGGER_DISTANCE: 200, // Distance from player when spawn triggers
        SPAWN_OFFSET_FROM_EDGE: 50 // Offset from top/bottom of walkable area
    },
    
    // Enemy Combat Configuration
    ENEMY_COMBAT: {
        ATTACK_COOLDOWN: 2000, // Time between attacks (ms)
        ACTION_COOLDOWN: 1500, // Time between AI decisions (ms)
        ATTACK_WINDUP_TIME: 800, // Telegraph time before attack (ms)
        ATTACK_DURATION: 600, // How long attack animation lasts (ms)
        TELEGRAPH_TINT: 0xff6666 // Color enemy flashes during windup
    },
    
    // Player Leveling Configuration
    LEVELING: {
        BASE_EXPERIENCE_TO_LEVEL: 100, // XP needed for level 2
        EXPERIENCE_MULTIPLIER: 1.5, // Exponential growth factor
        BONUSES_PER_LEVEL: {
            HEALTH: 10,
            DAMAGE: 2,
            SPEED: 5
        },
        SPEED_CAP: 300, // Maximum speed from leveling
        ENEMY_EXPERIENCE_VALUES: {
            BASIC_ENEMY: 25, // XP from killing a basic enemy
            TOUGH_ENEMY: 50, // XP from killing a tougher enemy (future)
            BOSS_ENEMY: 100  // XP from killing a boss (future)
        }
    }
} as const;

// Calculated values that might be useful
export const CALCULATED_VALUES = {
    get ASPECT_RATIO() { return GAME_CONFIG.SCREEN_WIDTH / GAME_CONFIG.SCREEN_HEIGHT; },
    get CENTER_X() { return GAME_CONFIG.SCREEN_WIDTH / 2; },
    get CENTER_Y() { return GAME_CONFIG.SCREEN_HEIGHT / 2; },
    get GROUND_CENTER_Y() { return GAME_CONFIG.GROUND_START_Y + (GAME_CONFIG.GROUND_HEIGHT / 2); },
} as const;

// Environment-specific constants
export const FOREST_CONFIG = {
    BACKGROUND_COLOR: 0x4a5d23, // Forest green
    
    LAYERS: {
        FAR: {
            TEXTURE: 'forest_back',
            SCROLL_FACTOR: GAME_CONFIG.PARALLAX.FAR_SCROLL_FACTOR,
            ALPHA: GAME_CONFIG.PARALLAX.FAR_ALPHA,
            DEPTH: 0
        },
        MIDDLE: {
            TEXTURE: 'forest_middle', 
            SCROLL_FACTOR: GAME_CONFIG.PARALLAX.MIDDLE_SCROLL_FACTOR,
            ALPHA: GAME_CONFIG.PARALLAX.MIDDLE_ALPHA,
            DEPTH: 1
        },
        GROUND: {
            TEXTURE: 'forest_front',
            SCROLL_FACTOR: GAME_CONFIG.PARALLAX.GROUND_SCROLL_FACTOR,
            ALPHA: GAME_CONFIG.PARALLAX.GROUND_ALPHA,
            DEPTH: 2
        }
    }
} as const;

// Depth constants for consistent layering
export const DEPTH_LAYERS = {
    BACKGROUND_FAR: -1,
    BACKGROUND_NEAR: 0,
    ENVIRONMENT_BACK: 0,
    ENVIRONMENT_MIDDLE: 1, 
    ENVIRONMENT_GROUND: 2,
    GAME_OBJECTS: 100,
    PLAYER: 100,
    ENEMIES: 101,
    PROJECTILES: 102,
    EFFECTS: 150,
    UI_BACKGROUND: 200,
    UI_TEXT: 300,
    UI_DEBUG: 1000
} as const;

// Type definitions for better TypeScript support
export type GameConfig = typeof GAME_CONFIG;
export type ForestConfig = typeof FOREST_CONFIG;
export type DepthLayers = typeof DEPTH_LAYERS; 