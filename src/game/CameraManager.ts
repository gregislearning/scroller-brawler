import { Scene, Math as PhaserMath } from 'phaser';
import { Player } from './Player';

export interface CameraConfig {
    // Look-ahead settings
    lookAheadFactor: number;          // How far ahead to look (0.0-1.0)
    lookAheadMaxDistance: number;     // Maximum look-ahead distance in pixels
    
    // Deadzone settings
    deadzoneWidth: number;            // Horizontal deadzone size
    deadzoneHeight: number;           // Vertical deadzone size
    
    // Smoothing settings
    followSpeed: number;              // Camera follow smoothness (0.0-1.0)
    returnSpeed: number;              // Speed returning to player when idle
    
    // Boundary settings
    worldWidth: number;               // Level width for boundary clamping
    worldHeight: number;              // Level height for boundary clamping
    
    // Effect settings
    shakeEnabled: boolean;            // Enable camera shake effects
    shakeIntensity: number;          // Base shake intensity multiplier
}

export class CameraManager {
    private scene: Scene;
    private camera: Phaser.Cameras.Scene2D.Camera;
    private player: Player;
    private config: CameraConfig;
    
    // Camera state
    private targetX: number = 0;
    private targetY: number = 0;
    // private lastPlayerDirection: number = 1; // 1 for right, -1 for left (unused for forward-lock)
    private isPlayerMoving: boolean = false;
    private idleTimer: number = 0;
    private maxCameraCenterX: number = 0; // Forward-only: never allow camera to go behind this
    
    // Deadzone bounds (relative to camera center)
    private deadzone: {
        left: number;
        right: number;
        top: number;
        bottom: number;
    };

    constructor(scene: Scene, camera: Phaser.Cameras.Scene2D.Camera, player: Player, config: Partial<CameraConfig> = {}) {
        this.scene = scene;
        this.camera = camera;
        this.player = player;
        
        // Default configuration with sensible values for our scaled character
        this.config = {
            lookAheadFactor: 0.4,
            lookAheadMaxDistance: 200,
            deadzoneWidth: 300,
            deadzoneHeight: 150,
            followSpeed: 0.08,
            returnSpeed: 0.05,
            worldWidth: 3000,
            worldHeight: 768,
            shakeEnabled: true,
            shakeIntensity: 1.0,
            ...config
        };
        
        this.setupCamera();
        this.calculateDeadzone();
        this.setupPlayerEventListeners();
    }
    
    private setupCamera(): void {
        // Set camera bounds to match world
        this.camera.setBounds(0, 0, this.config.worldWidth, this.config.worldHeight);
        
        // Initialize camera position to player
        this.targetX = this.player.x;
        this.targetY = this.player.y;
        
        // Set initial camera position
        this.camera.centerOn(this.targetX, this.targetY);
        this.maxCameraCenterX = this.camera.worldView.centerX;
    }
    
    private calculateDeadzone(): void {
        const halfWidth = this.config.deadzoneWidth / 2;
        const halfHeight = this.config.deadzoneHeight / 2;
        
        this.deadzone = {
            left: -halfWidth,
            right: halfWidth,
            top: -halfHeight,
            bottom: halfHeight
        };
    }
    
    private setupPlayerEventListeners(): void {
        // Listen for player damage to trigger impact shake
        this.player.on('damage', () => {
            if (this.config.shakeEnabled) {
                this.shakeCamera(150, 0.015);
            }
        });
    }
    
    public update(): void {
        this.updatePlayerMovementState();
        this.updateTargetPosition();
        this.applyCameraMovement();
    }
    
    private updatePlayerMovementState(): void {
        const velocity = this.player.body!.velocity;
        const wasMoving = this.isPlayerMoving;
        
        // Check if player is moving (with small threshold to avoid jitter)
        this.isPlayerMoving = Math.abs(velocity.x) > 10 || Math.abs(velocity.y) > 10;
        
        // Update direction when moving horizontally
        // Direction tracking disabled (forward lock)
        
        // Reset idle timer when movement starts
        if (!wasMoving && this.isPlayerMoving) {
            this.idleTimer = 0;
        }
        
        // Increment idle timer when not moving
        if (!this.isPlayerMoving) {
            this.idleTimer += this.scene.time.now - this.scene.time.now;
        }
    }
    
    private updateTargetPosition(): void {
        const playerX = this.player.x;
        const playerY = this.player.y;
        const velocity = this.player.body!.velocity;
        
        // Calculate look-ahead based on velocity and direction
        let lookAheadX = 0;
        let lookAheadY = 0;
        
        if (this.isPlayerMoving) {
            // Horizontal look-ahead
            const velocityFactor = Math.min(Math.abs(velocity.x) / this.player.speed, 1.0);
            lookAheadX = velocity.x * this.config.lookAheadFactor * velocityFactor;
            lookAheadX = PhaserMath.Clamp(lookAheadX, -this.config.lookAheadMaxDistance, this.config.lookAheadMaxDistance);
            
            // Vertical look-ahead (smaller than horizontal)
            lookAheadY = velocity.y * this.config.lookAheadFactor * 0.5;
            lookAheadY = PhaserMath.Clamp(lookAheadY, -this.config.lookAheadMaxDistance * 0.5, this.config.lookAheadMaxDistance * 0.5);
        }
        
        // Calculate desired camera center with look-ahead
        const desiredX = playerX + lookAheadX;
        const desiredY = playerY + lookAheadY;
        
        // Get current camera center
        const currentCameraX = this.camera.worldView.centerX;
        const currentCameraY = this.camera.worldView.centerY;
        
        // Calculate player position relative to camera center
        const relativeX = playerX - currentCameraX;
        const relativeY = playerY - currentCameraY;
        
        // Check if player is outside deadzone
        const outsideDeadzoneX = relativeX < this.deadzone.left || relativeX > this.deadzone.right;
        const outsideDeadzoneY = relativeY < this.deadzone.top || relativeY > this.deadzone.bottom;
        
        // Update target position based on deadzone
        if (outsideDeadzoneX || this.isPlayerMoving) {
            this.targetX = desiredX;
        }
        
        if (outsideDeadzoneY || this.isPlayerMoving) {
            this.targetY = desiredY;
        }
        
        // Apply world boundaries to prevent showing empty areas
        const halfScreenWidth = this.camera.width / 2;
        const halfScreenHeight = this.camera.height / 2;
        
        this.targetX = PhaserMath.Clamp(
            this.targetX,
            halfScreenWidth,
            this.config.worldWidth - halfScreenWidth
        );
        
        this.targetY = PhaserMath.Clamp(
            this.targetY,
            halfScreenHeight,
            this.config.worldHeight - halfScreenHeight
        );

        // Forward-only camera: never target behind the furthest camera center reached
        this.targetX = Math.max(this.targetX, this.maxCameraCenterX);
    }
    
    private applyCameraMovement(): void {
        const currentX = this.camera.worldView.centerX;
        const currentY = this.camera.worldView.centerY;
        
        // Choose interpolation speed based on movement state
        const speed = this.isPlayerMoving ? this.config.followSpeed : this.config.returnSpeed;
        
        // Smoothly interpolate to target position
        let newX = PhaserMath.Linear(currentX, this.targetX, speed);
        const newY = PhaserMath.Linear(currentY, this.targetY, speed);
        
        // Prevent backward movement: clamp to furthest center reached
        if (newX < this.maxCameraCenterX) {
            newX = this.maxCameraCenterX;
        }

        // Apply the camera movement
        this.camera.centerOn(newX, newY);

        // Update forward progress tracker
        this.maxCameraCenterX = Math.max(this.maxCameraCenterX, newX);
    }
    
    public shakeCamera(duration: number = 100, intensity: number = 0.01): void {
        if (!this.config.shakeEnabled) return;
        
        const adjustedIntensity = intensity * this.config.shakeIntensity;
        this.camera.shake(duration, adjustedIntensity);
    }
    
    public zoomTo(zoom: number, duration: number = 500): void {
        this.camera.zoomTo(zoom, duration);
    }
    
    public flashCamera(color: number = 0xffffff, duration: number = 100): void {
        this.camera.flash(duration, color);
    }
    
    public fadeCamera(duration: number = 500, red: number = 0, green: number = 0, blue: number = 0): void {
        this.camera.fade(duration, red, green, blue);
    }
    
    // Configuration getters/setters for runtime adjustment
    public setLookAheadFactor(factor: number): void {
        this.config.lookAheadFactor = PhaserMath.Clamp(factor, 0, 1);
    }
    
    public setDeadzoneSize(width: number, height: number): void {
        this.config.deadzoneWidth = width;
        this.config.deadzoneHeight = height;
        this.calculateDeadzone();
    }
    
    public setFollowSpeed(speed: number): void {
        this.config.followSpeed = PhaserMath.Clamp(speed, 0, 1);
    }
    
    public getConfig(): CameraConfig {
        return { ...this.config };
    }
    
    // Debug visualization (can be enabled for development)
    public enableDebugVisuals(): void {
        // This would draw deadzone bounds and target positions for debugging
        // Implementation would involve graphics overlay
    }
} 