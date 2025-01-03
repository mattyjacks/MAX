// Global game state variables - These are attached to window for test access and global state management
window.gameStarted = false;      // Tracks if the game has been started
window.isGameRunning = false;    // Tracks if game loop is currently active
window.currentLevel = 1;         // Current game level
window.score = 0;                // Player's current score
window.gameLoopId = null;        // Stores the game loop animation frame ID
window.zombiesDefeated = 0;      // Total number of zombies defeated
window.achievements = [];         // List of unlocked achievements
window.playerStats = {           // Persistent player statistics for progression
    totalKills: 0,               // Total enemies defeated across all games
    highestCombo: 0,             // Highest combo achieved
    fastestLevelComplete: Infinity, // Fastest level completion time
    totalPlayTime: 0,            // Total time spent playing
    gamesPlayed: 0               // Number of games played
};

// Import data warehouse
import { dataWarehouse } from './datastore/DataWarehouse.js';

// Initialize DOM elements - Cache DOM queries for better performance
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');          // Get 2D rendering context
const tooltip = document.getElementById('tooltip');
const levelElement = document.getElementById('level');
const scoreElement = document.getElementById('score');
const healthElement = document.getElementById('health');
const healthBarFill = document.querySelector('.health-bar-fill');
const upgradeMenu = document.getElementById('upgradeMenu');
const upgradeGrid = document.querySelector('.upgrade-grid');
const confirmUpgradeBtn = document.getElementById('confirmUpgrade');
const startScreen = document.getElementById('startScreen');
const startButton = document.getElementById('startButton');

// Set canvas size - Define game viewport dimensions
canvas.width = 1400;   // Game width in pixels
canvas.height = 800;   // Game height in pixels

// Game state variables - Local state management
let level = 1;                    // Current level number
let isUpgradeMenuActive = false;  // Tracks if upgrade menu is open
let selectedUpgrade = null;       // Currently selected upgrade option
let audioInitialized = false;     // Tracks if audio system is ready
let mouseX = 0;                   // Current mouse X position
let mouseY = 0;                   // Current mouse Y position
let damageNumbers = [];           // Array of floating damage numbers
let combo = 0;                    // Current combo counter
let comboTimer = null;            // Timer for combo system
let levelStartTime = 0;           // Timestamp when level started
let gameStartTime = 0;            // Timestamp when game started
let killStreak = 0;              // Current kill streak counter
let lastKillTime = 0;            // Timestamp of last kill

// Achievement definitions - Define all possible achievements
const ACHIEVEMENTS = {
    // First zombie kill achievement
    FIRST_BLOOD: { 
        id: 'first_blood',
        name: 'First Blood',
        description: 'Defeat your first zombie'
    },
    // Combo system achievement
    COMBO_MASTER: {
        id: 'combo_master',
        name: 'Combo Master',
        description: 'Get a 10x combo'
    },
    // Speed running achievement
    SPEED_DEMON: {
        id: 'speed_demon',
        name: 'Speed Demon',
        description: 'Complete a level in under 30 seconds'
    },
    // Perfect level achievement
    SURVIVOR: {
        id: 'survivor',
        name: 'Survivor',
        description: 'Complete a level without taking damage'
    },
    // Accuracy achievement
    MARKSMAN: {
        id: 'marksman',
        name: 'Marksman',
        description: 'Achieve 90% accuracy in a level'
    }
};

// Platform configuration - Define game world platforms
const PLATFORMS = {
    // Ground platform
    GROUND: {
        x: 0,
        y: canvas.height - 50,
        width: canvas.width,
        height: 50
    },
    // Main left platform
    MAIN_LEFT: {
        x: 100,
        y: canvas.height - 200,
        width: 300,
        height: 20
    },
    // Main center platform
    MAIN_CENTER: {
        x: canvas.width/2 - 200,
        y: canvas.height - 300,
        width: 400,
        height: 20
    },
    // Main right platform
    MAIN_RIGHT: {
        x: canvas.width - 400,
        y: canvas.height - 200,
        width: 300,
        height: 20
    },
    // Top left platform
    TOP_LEFT: {
        x: 200,
        y: canvas.height - 500,
        width: 200,
        height: 20
    },
    // Top center platform
    TOP_CENTER: {
        x: canvas.width/2 - 100,
        y: canvas.height - 600,
        width: 200,
        height: 20
    },
    // Top right platform
    TOP_RIGHT: {
        x: canvas.width - 400,
        y: canvas.height - 500,
        width: 200,
        height: 20
    },
    // Side left platform
    SIDE_LEFT: {
        x: 50,
        y: canvas.height - 350,
        width: 100,
        height: 20
    },
    // Side right platform
    SIDE_RIGHT: {
        x: canvas.width - 150,
        y: canvas.height - 350,
        width: 100,
        height: 20
    }
};

// Audio elements - Initialize audio assets
const audioElements = {
    // Jump sound effect
    jump: document.getElementById('jumpSound'),
    // Shoot sound effect
    shoot: document.getElementById('shootSound'),
    // Zombie sound effect
    zombie: document.getElementById('zombieSound')
};

// Initialize audio - Prepare audio assets for playback
function initializeAudio() {
    if (audioInitialized) return;
    
    // Set volume for all audio elements
    Object.values(audioElements).forEach(audio => {
        audio.volume = 0.3;
        // Create a promise that resolves when the audio can play
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                audio.pause();
                audio.currentTime = 0;
            }).catch(error => {
                console.log("Audio play failed, but that's okay for initialization:", error);
            });
        }
    });
    
    audioInitialized = true;
}

// Play sound with error handling - Play a sound effect with error handling
function playSound(soundName) {
    if (!audioInitialized) return;
    
    const audio = audioElements[soundName];
    if (!audio) return;

    // Reset and play
    audio.currentTime = 0;
    const playPromise = audio.play();
    
    if (playPromise !== undefined) {
        playPromise.catch(error => {
            console.log("Sound play failed:", error);
        });
    }
}

// Debug logging function with categories - Log messages with categories and colors
function debugLog(message, category = 'info', type = 'info') {
    try {
        const colors = {
            info: '#4a9eff',
            success: '#4caf50',
            warning: '#ff9800',
            error: '#f44336',
            physics: '#2196f3',
            combat: '#e91e63',
            input: '#9c27b0',
            render: '#00bcd4',
            state: '#ff5722',
            loop: '#795548',
            collision: '#ff9800'
        };
        const color = colors[category] || colors.info;
        const prefix = type === 'error' ? '❌ ERROR: ' : 
                      type === 'warning' ? '⚠️ WARNING: ' : 
                      type === 'success' ? '✅ SUCCESS: ' : '';
        
        console.log(
            `%c[${String(category).toUpperCase()}] ${prefix}${String(message)}`,
            `color: ${color}; font-weight: bold;`
        );
    } catch (err) {
        console.log('[LOGGER ERROR]', message);
    }
}

// Add safe object check helper - Return a default value if the object is null or undefined
function safeObject(obj, defaultValue = {}) {
    return obj === null || obj === undefined ? defaultValue : obj;
}

// Add safe array check helper - Return a default value if the array is not an array
function safeArray(arr, defaultValue = []) {
    return Array.isArray(arr) ? arr : defaultValue;
}

// Add safe number check helper - Return a default value if the number is NaN or null or undefined
function safeNumber(num, defaultValue = 0) {
    return isNaN(num) || num === null || num === undefined ? defaultValue : Number(num);
}

// Add bounds checking helper - Clamp a number within a range
function clampNumber(num, min, max) {
    return Math.max(min, Math.min(max, safeNumber(num)));
}

// Gun class - Represents a gun with properties and methods
class Gun {
    constructor(type, image) {
        this.type = type;
        this.image = image;
        
        // Gun stats
        switch(type) {
            case 'pistol':
                this.damage = 25;
                this.fireRate = 250;
                this.spread = 0.1;
                break;
            case 'shotgun':
                this.damage = 15;
                this.fireRate = 800;
                this.spread = 0.3;
                break;
            case 'smg':
                this.damage = 15;
                this.fireRate = 100;
                this.spread = 0.2;
                break;
            case 'assaultrifle':
                this.damage = 20;
                this.fireRate = 150;
                this.spread = 0.15;
                break;
            case 'sniperrifle':
                this.damage = 100;
                this.fireRate = 1000;
                this.spread = 0.02;
                break;
        }
    }
}

// Player class - Represents the player with properties and methods
class Player {
    constructor(x = 0, y = 0) {
        this.x = safeNumber(x);
        this.y = safeNumber(y);
        this.width = 40;
        this.height = 60;
        this.normalHeight = 60;
        this.crouchHeight = 30;
        this.velocityX = 0;
        this.velocityY = 0;
        this.speed = 5;
        this.jumpForce = -15;
        this.health = 100;
        this.maxHealth = 100;
        this.invulnerable = false;
        this.invulnerabilityTime = 1000;
        this.lastHitTime = 0;
        this.gun = new Gun('pistol');
        this.experience = 0;
        this.level = 1;
        this.skillPoints = 0;
        this.skills = {
            health: 0,
            damage: 0,
            speed: 0,
            criticalHit: 0
        };
        this.stats = {
            shotsFired: 0,
            shotsHit: 0,
            damageTaken: 0,
            damageDealt: 0
        };
        debugLog(`Player initialized at (${this.x}, ${this.y})`, 'entity');
    }
    
    // Gain experience points
    gainExperience(amount) {
        this.experience += amount;
        const nextLevelExp = this.level * 100;
        if (this.experience >= nextLevelExp) {
            this.levelUp();
        }
    }
    
    // Level up the player
    levelUp() {
        this.level++;
        this.skillPoints++;
        this.experience -= this.level * 100;
        this.showLevelUpAnimation();
        playSound('levelUp');
    }
    
    // Show level up animation
    showLevelUpAnimation() {
        const levelUpText = new DamageNumber(this.x, this.y - 50, 'LEVEL UP!');
        levelUpText.color = '#FFD700';
        levelUpText.scale = 2;
        damageNumbers.push(levelUpText);
    }

    // Check collision with a platform
    checkCollision(platform) {
        const collision = this.x < platform.x + platform.width &&
            this.x + this.width > platform.x &&
            this.y + this.height > platform.y &&
            this.y < platform.y + platform.height;
        
        if (collision) {
            debugLog(`Player collision with platform at (${platform.x}, ${platform.y})`, 'collision');
            debugLog(`Player bounds: (${this.x}, ${this.y}, ${this.width}, ${this.height})`, 'collision');
            debugLog(`Platform bounds: (${platform.x}, ${platform.y}, ${platform.width}, ${platform.height})`, 'collision');
            
            // Add collision effect
            const effectX = this.x + this.width/2;
            const effectY = this.y + this.height;
            gameObjects.effects.push(new CollisionEffect(effectX, effectY, 'land'));
            
            // Screen shake on hard landings
            if (Math.abs(this.velocityY) > 10) {
                camera.shake(Math.min(Math.abs(this.velocityY) * 0.5, 10));
            }
        }
        
        return collision;
    }

    // Update player state
    update() {
        try {
            // Apply gravity with safety bounds
            this.velocityY = clampNumber(this.velocityY + 0.7, -20, 20);
            
            // Update position with bounds checking
            this.x = clampNumber(this.x + this.velocityX, 0, canvas.width - this.width);
            this.y = clampNumber(this.y + this.velocityY, 0, canvas.height - this.height);
            
            debugLog(`Player position: (${this.x.toFixed(2)}, ${this.y.toFixed(2)})`, 'physics');
            
            // Platform collisions with error checking
            let onGround = false;
            safeArray(gameObjects.platforms).forEach(platform => {
                if (platform && this.checkCollision(platform)) {
                    onGround = true;
                }
            });
            
            // Update invulnerability safely
            if (this.invulnerable && Date.now() - safeNumber(this.lastHitTime) >= this.invulnerabilityTime) {
                this.invulnerable = false;
                debugLog('Player invulnerability ended', 'state', 'info');
            }
            
            return true;
        } catch (err) {
            debugLog(`Player update error: ${err.message}`, 'state', 'warning');
            return false;
        }
    }

    // Auto-shoot at a target position
    autoShoot(targetX, targetY) {
        debugLog('Attempting auto-shoot', 'combat');
        if (!this.gun || !this.gun.canShoot()) {
            debugLog('Cannot shoot - gun cooldown', 'combat');
            return;
        }

        const angle = Math.atan2(targetY - this.y, targetX - this.x);
        debugLog(`Shooting angle: ${angle * (180/Math.PI)}°`, 'combat');
        
        // Calculate bullet velocity
        const bulletSpeed = 15;
        const bulletVelX = Math.cos(angle) * bulletSpeed;
        const bulletVelY = Math.sin(angle) * bulletSpeed;
        
        // Create bullet
        const bullet = new Bullet(
            this.x + this.width/2,
            this.y + this.height/2,
            bulletVelX,
            bulletVelY,
            this.gun
        );
        
        gameObjects.bullets.push(bullet);
        debugLog('Bullet created', 'combat');
        
        this.gun.lastShotTime = Date.now();
    }

    // Take damage from an enemy
    takeDamage(amount) {
        if (!this.invulnerable) {
            this.health = Math.max(0, this.health - amount);
            this.invulnerable = true;
            this.lastHitTime = Date.now();
            
            // Add impact effect
            const effectX = this.x + this.width/2;
            const effectY = this.y + this.height/2;
            gameObjects.effects.push(new CollisionEffect(effectX, effectY, 'impact'));
            
            // Heavy screen shake on damage
            camera.shake(8);
            
            debugLog(`Player took ${amount} damage, health: ${this.health}`, 'combat', 'error');
        }
    }
}

// Zombie class - Represents a zombie with properties and methods
class Zombie {
    constructor(x = 0, y = 0) {
        this.x = safeNumber(x);
        this.y = safeNumber(y);
        this.width = 40;
        this.height = 60;
        this.health = 100;
        this.maxHealth = 100;
        this.damage = 10;
        this.speed = 3;
        this.velocityX = 0;
        this.velocityY = 0;
        this.isGrounded = false;
        this.gravity = 0.7;
        this.jumpForce = -15;
        this.lastJump = Date.now();
        this.lastAttack = Date.now();
        this.jumpCooldown = 1000;
        this.attackCooldown = 500;
        debugLog(`Zombie spawned at (${this.x}, ${this.y})`, 'entity');
    }

    // Check collision with a platform
    checkCollision(platform) {
        const collision = this.x < platform.x + platform.width &&
            this.x + this.width > platform.x &&
            this.y + this.height > platform.y &&
            this.y < platform.y + platform.height;
            
        if (collision) {
            debugLog(`Zombie collision with platform at (${platform.x}, ${platform.y})`, 'collision');
            debugLog(`Zombie bounds: (${this.x}, ${this.y}, ${this.width}, ${this.height})`, 'collision');
        }
        
        return collision;
    }

    // Check collision with the player
    checkPlayerCollision() {
        if (!gameObjects.player) return false;
        
        const collision = this.x < gameObjects.player.x + gameObjects.player.width &&
            this.x + this.width > gameObjects.player.x &&
            this.y + this.height > gameObjects.player.y &&
            this.y < gameObjects.player.y + gameObjects.player.height;
            
        if (collision) {
            debugLog('Zombie collided with player!', 'collision', 'error');
            debugLog(`Zombie bounds: (${this.x}, ${this.y}, ${this.width}, ${this.height})`, 'collision');
            debugLog(`Player bounds: (${gameObjects.player.x}, ${gameObjects.player.y}, ${gameObjects.player.width}, ${gameObjects.player.height})`, 'collision');
        }
        
        return collision;
    }

    // Update zombie state
    update() {
        try {
            if (!gameObjects.player) {
                debugLog('No player found for zombie to track', 'state', 'info');
                return false;
            }

            // Apply gravity with safety bounds
            this.velocityY = clampNumber(this.velocityY + this.gravity, -20, 20);
            
            // Calculate direction to player safely
            const dx = safeNumber(gameObjects.player.x - this.x);
            const dy = safeNumber(gameObjects.player.y - this.y);
            const direction = Math.sign(dx);
            
            // Smooth acceleration with safety bounds
            const targetVelocityX = direction * this.speed;
            this.velocityX = clampNumber(
                this.velocityX + (targetVelocityX - this.velocityX) * 0.1,
                -this.speed,
                this.speed
            );
            
            // Update position with bounds checking
            this.x = clampNumber(this.x + this.velocityX, 0, canvas.width - this.width);
            this.y = clampNumber(this.y + this.velocityY, 0, canvas.height - this.height);
            
            // Platform collisions with error checking
            this.isGrounded = false;
            safeArray(gameObjects.platforms).forEach(platform => {
                if (platform && this.checkCollision(platform)) {
                    this.isGrounded = true;
                }
            });
            
            // Safe attack timing
            const now = Date.now();
            if (this.checkPlayerCollision() && 
                !gameObjects.player.invulnerable && 
                now - safeNumber(this.lastAttack) >= this.attackCooldown) {
                
                gameObjects.player.takeDamage(this.damage);
                this.lastAttack = now;
            }
            
            return true;
        } catch (err) {
            debugLog(`Zombie update error: ${err.message}`, 'state', 'warning');
            return false;
        }
    }

    // Take damage from the player
    takeDamage(amount) {
        this.health = Math.max(0, this.health - amount);
        
        // Add impact effect
        const effectX = this.x + this.width/2;
        const effectY = this.y + this.height/2;
        gameObjects.effects.push(new CollisionEffect(effectX, effectY, 'impact'));
        
        // Small screen shake
        camera.shake(3);
        
        if (this.health <= 0) {
            // Death effect
            for (let i = 0; i < 3; i++) {
                gameObjects.effects.push(new CollisionEffect(
                    this.x + Math.random() * this.width,
                    this.y + Math.random() * this.height,
                    'impact'
                ));
            }
            camera.shake(5);
            window.zombiesDefeated++;
            return true; // Dead
        }
        return false;
    }
}

// Platform class - Represents a platform with properties and methods
class Platform {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    // Draw the platform
    draw() {
        ctx.fillStyle = '#555';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

// DroppedGun class - Represents a dropped gun with properties and methods
class DroppedGun {
    constructor(x, y, gun) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 15;
        this.gun = gun;
    }

    // Draw the dropped gun
    draw() {
        if (this.gun && this.gun.image) {
            const scale = 2;
            const width = this.gun.image.width * scale;
            const height = this.gun.image.height * scale;
            ctx.save();
            ctx.translate(this.x + width/2, this.y + height/2);
            ctx.drawImage(this.gun.image, -width/2, -height/2, width, height);
            ctx.restore();
        }
    }
}

// Bullet class - Represents a bullet with properties and methods
class Bullet {
    constructor(x, y, velocityX, velocityY, damage) {
        this.x = x;
        this.y = y;
        this.velocityX = velocityX;
        this.velocityY = velocityY;
        this.damage = damage;
        this.width = 4;
        this.height = 4;
    }

    // Check collision with a zombie
    checkZombieCollision(zombie) {
        const collision = this.x > zombie.x && 
            this.x < zombie.x + zombie.width &&
            this.y > zombie.y && 
            this.y < zombie.y + zombie.height;
            
        if (collision) {
            debugLog(`Bullet hit zombie at (${zombie.x}, ${zombie.y})`, 'collision', 'success');
            debugLog(`Bullet position: (${this.x}, ${this.y})`, 'collision');
            debugLog(`Zombie bounds: (${zombie.x}, ${zombie.y}, ${zombie.width}, ${zombie.height})`, 'collision');
        }
        
        return collision;
    }

    // Update bullet state
    update() {
        const prevX = this.x;
        const prevY = this.y;
        
        this.x += this.velocityX;
        this.y += this.velocityY;
        
        debugLog(`Bullet moved from (${prevX}, ${prevY}) to (${this.x}, ${this.y})`, 'physics');
        
        // Check world bounds
        if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
            debugLog(`Bullet out of bounds at (${this.x}, ${this.y})`, 'collision', 'warning');
            return false;
        }
        
        // Check zombie collisions
        if (gameObjects.zombies) {
            for (let i = 0; i < gameObjects.zombies.length; i++) {
                const zombie = gameObjects.zombies[i];
                if (!zombie) continue;
                
                if (this.checkZombieCollision(zombie)) {
                    debugLog(`Bullet dealing ${this.damage} damage to zombie ${i}`, 'collision', 'success');
                    if (zombie.takeDamage(this.damage)) {
                        debugLog(`Zombie ${i} killed by bullet`, 'collision', 'success');
                    }
                    return false;
                }
            }
        }
        
        return true;
    }

    // Draw the bullet
    draw() {
        ctx.fillStyle = '#FFF';
        ctx.fillRect(this.x - this.width/2, this.y - this.height/2, this.width, this.height);
    }
}

// DamageNumber class - Represents a floating damage number with properties and methods
class DamageNumber {
    constructor(x, y, damage) {
        this.x = x;
        this.y = y;
        this.damage = damage;
        this.alpha = 1;
        this.velocity = -2;
    }

    // Update damage number state
    update() {
        this.y += this.velocity;
        this.alpha -= 0.02;
        return this.alpha > 0;
    }

    // Draw the damage number
    draw() {
        if (ctx) {
            ctx.save();
            ctx.globalAlpha = this.alpha;
            ctx.fillStyle = '#ff4444';
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(Math.round(this.damage), this.x, this.y);
            ctx.restore();
        }
    }
}

// CollisionEffect class - Represents a collision effect with properties and methods
class CollisionEffect {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type; // 'impact', 'bounce', 'land'
        this.particles = [];
        this.lifetime = 0;
        this.maxLifetime = 20;
        this.createParticles();
    }

    // Create particles for the collision effect
    createParticles() {
        const particleCount = this.type === 'impact' ? 8 : 
                            this.type === 'bounce' ? 12 : 6;
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const speed = Math.random() * 3 + 2;
            this.particles.push({
                x: this.x,
                y: this.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Math.random() * 3 + 2,
                color: this.type === 'impact' ? '#ff4444' :
                       this.type === 'bounce' ? '#44ff44' : '#ffffff'
            });
        }
    }

    // Update collision effect state
    update() {
        this.lifetime++;
        this.particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.size *= 0.9;
        });
        return this.lifetime < this.maxLifetime;
    }

    // Draw the collision effect
    draw(ctx) {
        const alpha = 1 - (this.lifetime / this.maxLifetime);
        ctx.globalAlpha = alpha;
        this.particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
    }
}

// Camera class - Represents the game camera with properties and methods
class Camera {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.shakeAmount = 0;
        this.shakeDecay = 0.9;
    }

    // Shake the camera
    shake(amount) {
        this.shakeAmount = amount;
    }

    // Update camera state
    update() {
        if (this.shakeAmount > 0) {
            this.x = (Math.random() - 0.5) * this.shakeAmount;
            this.y = (Math.random() - 0.5) * this.shakeAmount;
            this.shakeAmount *= this.shakeDecay;
            if (this.shakeAmount < 0.1) this.shakeAmount = 0;
        } else {
            this.x = 0;
            this.y = 0;
        }
    }
}

const camera = new Camera();

// Game objects - Initialize game objects
let gameObjects = {
    player: null,
    zombies: [],
    bullets: [],
    droppedGuns: [],
    platforms: [],
    powerups: [],
    effects: [],
    boss: null
};

// Reset game state completely
function resetGame() {
    debugLog('Resetting game state completely');
    
    // Reset all game variables
    level = 1;
    score = 0;
    isGameRunning = false;
    gameStarted = false;
    selectedUpgrade = null;
    isUpgradeMenuActive = false;
    damageNumbers = [];
    window.testMode = false;
    
    // Reset UI elements
    levelElement.textContent = '1';
    scoreElement.textContent = '0';
    healthElement.textContent = '100';
    healthBarFill.style.width = '100%';
    upgradeMenu.style.display = 'none';
    tooltip.style.display = 'none';
    
    // Clear game objects
    if (gameObjects) {
        gameObjects = {
            player: null,
            zombies: [],
            bullets: [],
            droppedGuns: [],
            platforms: [],
            powerups: [],
            effects: [],
            boss: null
        };
    }
    
    // Clear any running animations
    if (gameLoopId) {
        cancelAnimationFrame(gameLoopId);
        gameLoopId = null;
    }
    
    // Reset keyboard state
    keyboard.keys = {};
    
    // Show start button
    startButton.style.display = 'block';
    
    // Clear canvas
    if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#222';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    debugLog('Game reset complete', 'success');
}

// Start game function
function startGame() {
    debugLog('Starting new game');
    resetGame();
    init();
    startButton.style.display = 'none';
    gameStarted = true;
    isGameRunning = true;
    gameLoopId = requestAnimationFrame(gameLoop);
}

// Initialize game
async function init() {
    debugLog('Initializing game state');
    
    // Initialize data warehouse
    await dataWarehouse.initialize();
    
    // Generate session ID
    window.sessionId = crypto.randomUUID();
    
    // Load player stats
    const stats = await dataWarehouse.getPlayerStats('local_player');
    window.playerStats = stats;
    
    // Reset game objects
    gameObjects = {
        player: new Player(canvas.width/2, canvas.height - 100),
        zombies: [],
        bullets: [],
        droppedGuns: [],
        platforms: [],
        powerups: [],
        effects: [],
        boss: null
    };

    // Set infinite health in test mode
    if (window.testMode) {
        debugLog('Test mode active: Player has infinite health', 'warning');
        gameObjects.player.health = Infinity;
    }

    debugLog('Creating platforms');
    // Create platforms
    Object.values(PLATFORMS).forEach(platform => {
        gameObjects.platforms.push(new Platform(platform.x, platform.y, platform.width, platform.height));
    });
    
    debugLog('Spawning initial zombies');
    // Spawn initial zombies
    spawnZombies();
}

// Spawn zombies function
function spawnZombies() {
    const zombieCount = Math.min(level * 3, 30);
    debugLog(`Spawning ${zombieCount} zombies for level ${level}`);
    
    const spawnPoints = [
        { x: 100, y: canvas.height - 300 },
        { x: canvas.width - 100, y: canvas.height - 300 },
        { x: canvas.width/2, y: canvas.height - 400 },
        { x: 300, y: canvas.height - 600 },
        { x: canvas.width - 300, y: canvas.height - 600 }
    ];

    for (let i = 0; i < zombieCount; i++) {
        const spawnPoint = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
        const x = spawnPoint.x + (Math.random() - 0.5) * 200;
        const y = spawnPoint.y;
        gameObjects.zombies.push(new Zombie(x, y));
    }
}

// Show upgrade menu function
function showUpgradeMenu() {
    debugLog('Showing upgrade menu');
    isUpgradeMenuActive = true;
    upgradeMenu.style.display = 'block';
    
    // Clear previous upgrades
    const upgradeGrid = document.querySelector('.upgrade-grid');
    upgradeGrid.innerHTML = '';
    
    // Available upgrades
    const upgrades = [
        {
            name: "Max Health",
            description: "Increase maximum health by 25",
            apply: () => {
                debugLog('Applying Max Health upgrade', 'success');
                gameObjects.player.maxHealth += 25;
                gameObjects.player.health = gameObjects.player.maxHealth;
                healthElement.textContent = gameObjects.player.health;
                healthBarFill.style.width = '100%';
            }
        },
        {
            name: "Movement Speed",
            description: "Increase movement speed by 20%",
            apply: () => {
                debugLog('Applying Movement Speed upgrade', 'success');
                gameObjects.player.speed *= 1.2;
            }
        },
        {
            name: "Jump Power",
            description: "Increase jump force by 15%",
            apply: () => {
                debugLog('Applying Jump Power upgrade', 'success');
                gameObjects.player.jumpForce *= 1.15;
            }
        },
        {
            name: "Gun Damage",
            description: "Increase gun damage by 25%",
            apply: () => {
                debugLog('Applying Gun Damage upgrade', 'success');
                gameObjects.player.gun.damage = Math.ceil(gameObjects.player.gun.damage * 1.25);
            }
        },
        {
            name: "Fire Rate",
            description: "Decrease fire rate cooldown by 20%",
            apply: () => {
                debugLog('Applying Fire Rate upgrade', 'success');
                gameObjects.player.gun.fireRate = Math.max(50, Math.floor(gameObjects.player.gun.fireRate * 0.8));
            }
        }
    ];
    
    debugLog(`Generated ${upgrades.length} possible upgrades`);
    
    // Select 3 random upgrades
    const availableUpgrades = [...upgrades];
    const selectedUpgrades = [];
    for (let i = 0; i < 3; i++) {
        const index = Math.floor(Math.random() * availableUpgrades.length);
        selectedUpgrades.push(availableUpgrades.splice(index, 1)[0]);
    }
    
    debugLog(`Selected ${selectedUpgrades.length} random upgrades to show`);

    // Create upgrade items
    selectedUpgrades.forEach(upgrade => {
        const item = document.createElement('div');
        item.className = 'upgrade-item';
        item.innerHTML = `
            <h3>${upgrade.name}</h3>
            <p>${upgrade.description}</p>
        `;
        
        item.addEventListener('click', () => {
            debugLog(`Selected upgrade: ${upgrade.name}`);
            document.querySelectorAll('.upgrade-item').forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
            selectedUpgrade = upgrade;
            document.getElementById('confirmUpgrade').disabled = false;
        });
        
        upgradeGrid.appendChild(item);
    });
}

function confirmUpgrade() {
    if (!selectedUpgrade) {
        debugLog('No upgrade selected', 'warning');
        return;
    }
    
    debugLog(`Confirming upgrade: ${selectedUpgrade.name}`);
    selectedUpgrade.apply();
    selectedUpgrade = null;
    
    // Hide upgrade menu
    upgradeMenu.style.display = 'none';
    isUpgradeMenuActive = false;
    
    // Start next level
    level++;
    debugLog(`Advancing to level ${level}`, 'success');
    levelElement.textContent = level;
    
    // Reset game state
    init();
}

// Keyboard state
const keyboard = {
    keys: {},
    isDown: function(key) {
        return this.keys[key] === true;
    }
};

// Event listeners
window.addEventListener('keydown', (e) => {
    keyboard.keys[e.key] = true;
});

window.addEventListener('keyup', (e) => {
    keyboard.keys[e.key] = false;
});

// Track mouse position
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
});

// Input handling
canvas.addEventListener('mousedown', e => {
    if (!gameStarted || !isGameRunning) return;
    
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
});

// Game loop
let frameCount = 0;

function gameLoop() {
    try {
        frameCount++;
        debugLog(`Frame ${frameCount} started`, 'loop');
        
        if (!gameStarted || !isGameRunning) {
            debugLog('Game not running - stopping loop', 'loop', 'warning');
            if (gameLoopId) {
                cancelAnimationFrame(gameLoopId);
                gameLoopId = null;
            }
            return;
        }
        
        // Start frame timing
        const frameStart = performance.now();
        debugLog('Starting frame updates', 'loop');
        
        // Update game state
        if (gameObjects.player) {
            debugLog('Updating player state', 'state');
            gameObjects.player.update();
        } else {
            debugLog('No player object found', 'state', 'error');
        }
        
        // Update zombies safely with error recovery
        gameObjects.zombies = safeArray(gameObjects.zombies).filter(zombie => {
            try {
                return zombie && zombie.update();
            } catch (err) {
                debugLog(`Zombie update failed: ${err.message}`, 'state', 'warning');
                return false;
            }
        });
        
        // Update bullets safely with error recovery
        gameObjects.bullets = safeArray(gameObjects.bullets).filter(bullet => {
            try {
                return bullet && bullet.update();
            } catch (err) {
                debugLog(`Bullet update failed: ${err.message}`, 'state', 'warning');
                return false;
            }
        });
        
        // Update effects safely
        gameObjects.effects = safeArray(gameObjects.effects).filter(effect => {
            try {
                return effect && effect.update();
            } catch (err) {
                debugLog(`Effect update failed: ${err.message}`, 'state', 'warning');
                return false;
            }
        });
        
        // Update boss if present
        if (gameObjects.boss) {
            const bossDefeated = !gameObjects.boss.update();
            if (bossDefeated) {
                debugLog('Boss defeated! Game complete!', 'state', 'success');
                showVictoryScreen();
                return;
            }
        }
        
        // Safe camera update
        if (camera) {
            camera.update();
        }
        
        // Draw everything safely
        if (ctx) {
            ctx.save();
            if (camera) {
                ctx.translate(safeNumber(camera.x), safeNumber(camera.y));
            }
            
            // Draw game objects safely
            safeArray(gameObjects.platforms).forEach(platform => {
                try {
                    if (platform && platform.draw) {
                        platform.draw(ctx);
                    }
                } catch (err) {
                    debugLog(`Platform draw failed: ${err.message}`, 'render', 'warning');
                }
            });
            
            safeArray(gameObjects.zombies).forEach(zombie => {
                try {
                    if (zombie && zombie.draw) {
                        zombie.draw(ctx);
                    }
                } catch (err) {
                    debugLog(`Zombie draw failed: ${err.message}`, 'render', 'warning');
                }
            });
            
            if (gameObjects.player && gameObjects.player.draw) {
                try {
                    gameObjects.player.draw(ctx);
                } catch (err) {
                    debugLog(`Player draw failed: ${err.message}`, 'render', 'warning');
                }
            }
            
            if (gameObjects.boss && gameObjects.boss.draw) {
                gameObjects.boss.draw(ctx);
            }
            
            ctx.restore();
        }
        
        // Calculate frame time safely
        const frameTime = safeNumber(performance.now() - frameStart);
        debugLog(`Frame completed in ${frameTime.toFixed(2)}ms`, 'loop', 'info');
        
        // Request next frame safely
        if (typeof requestAnimationFrame === 'function') {
            gameLoopId = requestAnimationFrame(gameLoop);
        }
        
    } catch (err) {
        debugLog(`Game loop error: ${err.message}`, 'loop', 'warning');
        // Attempt to recover by requesting next frame
        if (typeof requestAnimationFrame === 'function') {
            gameLoopId = requestAnimationFrame(gameLoop);
        }
    }
}

// Event listeners
document.addEventListener('keydown', (e) => {
    if (e.key === 'r' || e.key === 'R') {
        resetGame();
    }
});

// Start button click handler
startButton.addEventListener('click', startGame);

// Add boss to gameObjects
gameObjects.boss = null;

// Modify startLevel function to include boss fight
function startLevel(level) {
    debugLog(`Starting level ${level}`, 'state');
    currentLevel = level;
    resetGameState();
    
    // Create platforms
    createPlatforms();
    
    // Create player
    gameObjects.player = new Player(canvas.width/2, canvas.height - 150);
    
    if (level === 4) {
        // Boss fight
        debugLog('Initializing boss fight!', 'state', 'warning');
        gameObjects.boss = new Necromancer(canvas.width/2, 100);
    } else {
        // Normal level - spawn zombies
        const zombieCount = Math.min(3 + level * 2, 12);
        for (let i = 0; i < zombieCount; i++) {
            const x = Math.random() * (canvas.width - 40);
            const y = Math.random() * (canvas.height - 200);
            gameObjects.zombies.push(new Zombie(x, y));
        }
    }
    
    isGameRunning = true;
    gameStarted = true;
}

// Show upgrade menu function
function showUpgradeMenu() {
    debugLog('Showing upgrade menu');
    isUpgradeMenuActive = true;
    upgradeMenu.style.display = 'block';
    
    // Clear previous upgrades
    const upgradeGrid = document.querySelector('.upgrade-grid');
    upgradeGrid.innerHTML = '';
    
    // Available upgrades
    const upgrades = [
        {
            name: "Max Health",
            description: "Increase maximum health by 25",
            apply: () => {
                debugLog('Applying Max Health upgrade', 'success');
                gameObjects.player.maxHealth += 25;
                gameObjects.player.health = gameObjects.player.maxHealth;
                healthElement.textContent = gameObjects.player.health;
                healthBarFill.style.width = '100%';
            }
        },
        {
            name: "Movement Speed",
            description: "Increase movement speed by 20%",
            apply: () => {
                debugLog('Applying Movement Speed upgrade', 'success');
                gameObjects.player.speed *= 1.2;
            }
        },
        {
            name: "Jump Power",
            description: "Increase jump force by 15%",
            apply: () => {
                debugLog('Applying Jump Power upgrade', 'success');
                gameObjects.player.jumpForce *= 1.15;
            }
        },
        {
            name: "Gun Damage",
            description: "Increase gun damage by 25%",
            apply: () => {
                debugLog('Applying Gun Damage upgrade', 'success');
                gameObjects.player.gun.damage = Math.ceil(gameObjects.player.gun.damage * 1.25);
            }
        },
        {
            name: "Fire Rate",
            description: "Decrease fire rate cooldown by 20%",
            apply: () => {
                debugLog('Applying Fire Rate upgrade', 'success');
                gameObjects.player.gun.fireRate = Math.max(50, Math.floor(gameObjects.player.gun.fireRate * 0.8));
            }
        }
    ];
    
    debugLog(`Generated ${upgrades.length} possible upgrades`);
    
    // Select 3 random upgrades
    const availableUpgrades = [...upgrades];
    const selectedUpgrades = [];
    for (let i = 0; i < 3; i++) {
        const index = Math.floor(Math.random() * availableUpgrades.length);
        selectedUpgrades.push(availableUpgrades.splice(index, 1)[0]);
    }
    
    debugLog(`Selected ${selectedUpgrades.length} random upgrades to show`);

    // Create upgrade items
    selectedUpgrades.forEach(upgrade => {
        const item = document.createElement('div');
        item.className = 'upgrade-item';
        item.innerHTML = `
            <h3>${upgrade.name}</h3>
            <p>${upgrade.description}</p>
        `;
        
        item.addEventListener('click', () => {
            debugLog(`Selected upgrade: ${upgrade.name}`);
            document.querySelectorAll('.upgrade-item').forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
            selectedUpgrade = upgrade;
            document.getElementById('confirmUpgrade').disabled = false;
        });
        
        upgradeGrid.appendChild(item);
    });
}

function confirmUpgrade() {
    if (!selectedUpgrade) {
        debugLog('No upgrade selected', 'warning');
        return;
    }
    
    debugLog(`Confirming upgrade: ${selectedUpgrade.name}`);
    selectedUpgrade.apply();
    selectedUpgrade = null;
    
    // Hide upgrade menu
    upgradeMenu.style.display = 'none';
    isUpgradeMenuActive = false;
    
    // Start next level
    level++;
    debugLog(`Advancing to level ${level}`, 'success');
    levelElement.textContent = level;
    
    // Reset game state
    init();
}

// Add game over screen with replay
function showGameOverScreen(victory = false) {
    isGameRunning = false;
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '1000';
    overlay.id = 'gameOverlay';

    const content = document.createElement('div');
    content.style.backgroundColor = '#222';
    content.style.padding = '2rem';
    content.style.borderRadius = '1rem';
    content.style.boxShadow = '0 0 20px rgba(255, 255, 255, 0.2)';
    content.style.textAlign = 'center';
    content.style.color = '#fff';
    content.style.maxWidth = '80%';
    content.style.animation = 'fadeIn 0.5s ease-out';

    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .game-btn {
            background: #4CAF50;
            border: none;
            padding: 1rem 2rem;
            margin: 0.5rem;
            border-radius: 0.5rem;
            color: white;
            font-size: 1.2rem;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        .game-btn:hover {
            transform: scale(1.05);
            background: #45a049;
        }
        .score-text {
            font-size: 2rem;
            margin: 1rem 0;
            color: #4CAF50;
        }
        .stats-container {
            display: flex;
            justify-content: space-around;
            margin: 1rem 0;
        }
        .stat-item {
            text-align: center;
            padding: 0.5rem;
        }
    `;
    document.head.appendChild(style);

    content.innerHTML = `
        <h1 style="font-size: 2.5rem; margin-bottom: 1rem;">${victory ? 'Victory!' : 'Game Over'}</h1>
        <div class="score-text">Score: ${score}</div>
        <div class="stats-container">
            <div class="stat-item">
                <div>Level Reached</div>
                <div style="font-size: 1.5rem">${currentLevel}</div>
            </div>
            <div class="stat-item">
                <div>Zombies Defeated</div>
                <div style="font-size: 1.5rem">${zombiesDefeated || 0}</div>
            </div>
        </div>
        <div style="margin-top: 2rem;">
            <button class="game-btn" onclick="resetAndStartGame()">Play Again</button>
            <button class="game-btn" style="background: #2196F3;" onclick="showMainMenu()">Main Menu</button>
        </div>
    `;

    overlay.appendChild(content);
    document.body.appendChild(overlay);
}

// Function to reset and start a new game
function resetAndStartGame() {
    // Remove overlay if exists
    const overlay = document.getElementById('gameOverlay');
    if (overlay) {
        overlay.remove();
    }
    
    // Reset all game state
    window.gameStarted = false;
    window.isGameRunning = false;
    window.currentLevel = 1;
    window.score = 0;
    zombiesDefeated = 0;
    
    // Reset game objects
    resetGameState();
    
    // Start fresh game
    startGame();
}

// Show main menu
function showMainMenu() {
    const overlay = document.getElementById('gameOverlay');
    if (overlay) {
        overlay.remove();
    }
    
    // Reset everything
    resetAndStartGame();
    
    // Show start button and hide game canvas
    startButton.style.display = 'block';
    canvas.style.display = 'none';
}

// Modify the player death handler
function handlePlayerDeath() {
    debugLog('Player died!', 'state', 'error');
    showGameOverScreen(false);
}

// Modify victory screen to use new overlay
function showVictoryScreen() {
    debugLog('Victory achieved!', 'state', 'success');
    showGameOverScreen(true);
}

// Necromancer class
class Necromancer {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 100;
        this.height = 100;
        this.health = 500;
        this.maxHealth = 500;
        this.damage = 20;
        this.speed = 2;
        this.velocityX = 0;
        this.velocityY = 0;
        this.isGrounded = false;
        this.gravity = 0.7;
        this.jumpForce = -15;
        this.lastJump = Date.now();
        this.lastAttack = Date.now();
        this.jumpCooldown = 1000;
        this.attackCooldown = 500;
        debugLog(`Necromancer spawned at (${this.x}, ${this.y})`, 'entity');
    }

    // Check collision with a platform
    checkCollision(platform) {
        const collision = this.x < platform.x + platform.width &&
            this.x + this.width > platform.x &&
            this.y + this.height > platform.y &&
            this.y < platform.y + platform.height;
            
        if (collision) {
            debugLog(`Necromancer collision with platform at (${platform.x}, ${platform.y})`, 'collision');
            debugLog(`Necromancer bounds: (${this.x}, ${this.y}, ${this.width}, ${this.height})`, 'collision');
        }
        
        return collision;
    }

    // Check collision with the player
    checkPlayerCollision() {
        if (!gameObjects.player) return false;
        
        const collision = this.x < gameObjects.player.x + gameObjects.player.width &&
            this.x + this.width > gameObjects.player.x &&
            this.y + this.height > gameObjects.player.y &&
            this.y < gameObjects.player.y + gameObjects.player.height;
            
        if (collision) {
            debugLog('Necromancer collided with player!', 'collision', 'error');
            debugLog(`Necromancer bounds: (${this.x}, ${this.y}, ${this.width}, ${this.height})`, 'collision');
            debugLog(`Player bounds: (${gameObjects.player.x}, ${gameObjects.player.y}, ${gameObjects.player.width}, ${gameObjects.player.height})`, 'collision');
        }
        
        return collision;
    }

    // Update necromancer state
    update() {
        try {
            if (!gameObjects.player) {
                debugLog('No player found for Necromancer to track', 'state', 'info');
                return false;
            }

            // Apply gravity with safety bounds
            this.velocityY = clampNumber(this.velocityY + this.gravity, -20, 20);
            
            // Calculate direction to player safely
            const dx = safeNumber(gameObjects.player.x - this.x);
            const dy = safeNumber(gameObjects.player.y - this.y);
            const direction = Math.sign(dx);
            
            // Smooth acceleration with safety bounds
            const targetVelocityX = direction * this.speed;
            this.velocityX = clampNumber(
                this.velocityX + (targetVelocityX - this.velocityX) * 0.1,
                -this.speed,
                this.speed
            );
            
            // Update position with bounds checking
            this.x = clampNumber(this.x + this.velocityX, 0, canvas.width - this.width);
            this.y = clampNumber(this.y + this.velocityY, 0, canvas.height - this.height);
            
            // Platform collisions with error checking
            this.isGrounded = false;
            safeArray(gameObjects.platforms).forEach(platform => {
                if (platform && this.checkCollision(platform)) {
                    this.isGrounded = true;
                }
            });
            
            // Safe attack timing
            const now = Date.now();
            if (this.checkPlayerCollision() && 
                !gameObjects.player.invulnerable && 
                now - safeNumber(this.lastAttack) >= this.attackCooldown) {
                
                gameObjects.player.takeDamage(this.damage);
                this.lastAttack = now;
            }
            
            return true;
        } catch (err) {
            debugLog(`Necromancer update error: ${err.message}`, 'state', 'warning');
            return false;
        }
    }

    // Take damage from the player
    takeDamage(amount) {
        this.health = Math.max(0, this.health - amount);
        
        // Add impact effect
        const effectX = this.x + this.width/2;
        const effectY = this.y + this.height/2;
        gameObjects.effects.push(new CollisionEffect(effectX, effectY, 'impact'));
        
        // Small screen shake
        camera.shake(3);
        
        if (this.health <= 0) {
            // Death effect
            for (let i = 0; i < 3; i++) {
                gameObjects.effects.push(new CollisionEffect(
                    this.x + Math.random() * this.width,
                    this.y + Math.random() * this.height,
                    'impact'
                ));
            }
            camera.shake(5);
            return true; // Dead
        }
        return false;
    }

    // Draw the necromancer
    draw() {
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

function updateCombo() {
    const now = Date.now();
    if (now - lastKillTime < 2000) {
        combo++;
        if (combo > playerStats.highestCombo) {
            playerStats.highestCombo = combo;
            checkAchievement('COMBO_MASTER');
        }
    } else {
        combo = 1;
    }
    lastKillTime = now;
    clearTimeout(comboTimer);
    comboTimer = setTimeout(() => {
        combo = 0;
    }, 2000);
}

function checkAchievement(achievementId) {
    const achievement = ACHIEVEMENTS[achievementId];
    if (achievement && !achievements.includes(achievementId)) {
        achievements.push(achievementId);
        showAchievementNotification(achievement);
    }
}

function showAchievementNotification(achievement) {
    const notification = document.createElement('div');
    notification.className = 'achievement';
    notification.innerHTML = `
        <h3>Achievement Unlocked!</h3>
        <p>${achievement.name}</p>
        <p>${achievement.description}</p>
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.classList.add('show'), 100);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

function startLevel(level) {
    levelStartTime = Date.now();
    gameObjects.zombies = [];
    gameObjects.bullets = [];
    gameObjects.effects = [];
    gameObjects.droppedGuns = [];
    
    const zombieCount = Math.floor(5 + (level * 1.5));
    const specialZombieChance = Math.min(0.1 + (level * 0.05), 0.5);
    
    for (let i = 0; i < zombieCount; i++) {
        const isSpecial = Math.random() < specialZombieChance;
        const zombie = new Zombie(
            Math.random() * (canvas.width - 100) + 50,
            0
        );
        if (isSpecial) {
            zombie.health *= 1.5;
            zombie.damage *= 1.2;
            zombie.speed *= 1.2;
            zombie.isSpecial = true;
        }
        gameObjects.zombies.push(zombie);
    }
    
    if (level % 5 === 0) {
        const necromancer = new Necromancer(canvas.width / 2, 0);
        gameObjects.zombies.push(necromancer);
    }
}

function gameLoop() {
    if (!isGameRunning) return;
    
    const now = Date.now();
    const levelTime = (now - levelStartTime) / 1000;
    
    // Update game objects
    updatePlayer();
    updateZombies();
    updateBullets();
    updateEffects();
    camera.update();
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw game objects
    drawBackground();
    drawPlatforms();
    drawPlayer();
    drawZombies();
    drawBullets();
    drawEffects();
    drawUI();
    
    // Check level completion
    if (gameObjects.zombies.length === 0) {
        const levelCompleteTime = (Date.now() - levelStartTime) / 1000;
        if (levelCompleteTime < playerStats.fastestLevelComplete) {
            playerStats.fastestLevelComplete = levelCompleteTime;
            if (levelCompleteTime < 30) {
                checkAchievement('SPEED_DEMON');
            }
        }
        
        if (player.stats.damageTaken === 0) {
            checkAchievement('SURVIVOR');
        }
        
        const accuracy = player.stats.shotsHit / player.stats.shotsFired;
        if (accuracy >= 0.9) {
            checkAchievement('MARKSMAN');
        }
        
        showLevelComplete();
        startLevel(++level);
    }
    
    requestAnimationFrame(gameLoop);
}

// Handle game over
async function handleGameOver() {
    isGameRunning = false;
    
    // Save high score and stats
    try {
        await dataWarehouse.saveHighScore(score, {
            userId: 'local_player',
            gameVersion: '1.0',
            sessionId: window.sessionId,
            gameMode: 'standard',
            difficulty: 'normal',
            achievements: window.achievements,
            stats: {
                accuracy: calculateAccuracy(),
                timePlayedMs: Date.now() - gameStartTime,
                zombiesKilled: window.zombiesDefeated,
                highestCombo: window.playerStats.highestCombo,
                levelsCompleted: level - 1
            }
        });
        
        console.log('Score saved successfully');
    } catch (error) {
        console.error('Failed to save score:', error);
    }
    
    // Show game over screen
    showGameOver();
}

// Show high scores
async function showHighScores() {
    try {
        const scores = await dataWarehouse.getHighScores({ 
            gameMode: 'standard',
            limit: 10
        });
        
        // Create high scores display
        const highScoresDiv = document.createElement('div');
        highScoresDiv.id = 'highScores';
        highScoresDiv.innerHTML = `
            <h2>High Scores</h2>
            <div class="scores-list">
                ${scores.map((score, index) => `
                    <div class="score-entry">
                        <span class="rank">#${index + 1}</span>
                        <span class="score">${score.score}</span>
                        <span class="stats">
                            Zombies: ${score.stats.zombiesKilled} | 
                            Combo: ${score.stats.highestCombo}
                        </span>
                        <span class="date">${new Date(score.timestamp).toLocaleDateString()}</span>
                    </div>
                `).join('')}
            </div>
            <button onclick="closeHighScores()">Close</button>
        `;
        
        document.body.appendChild(highScoresDiv);
    } catch (error) {
        console.error('Failed to load high scores:', error);
    }
}
