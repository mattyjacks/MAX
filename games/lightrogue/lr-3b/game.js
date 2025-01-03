// Global game state variables - make them window properties for test access
window.gameStarted = false;
window.isGameRunning = false;
window.currentLevel = 1;
window.score = 0;
window.gameLoopId = null;
window.zombiesDefeated = 0;

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
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

// Set canvas size
canvas.width = 1400;
canvas.height = 800;

// Game state
let level = 1;
let isUpgradeMenuActive = false;
let selectedUpgrade = null;
let audioInitialized = false;
let mouseX = 0;
let mouseY = 0;
let damageNumbers = [];

// Platform configuration
const PLATFORMS = {
    GROUND: {
        x: 0,
        y: canvas.height - 50,
        width: canvas.width,
        height: 50
    },
    MAIN_LEFT: {
        x: 100,
        y: canvas.height - 200,
        width: 300,
        height: 20
    },
    MAIN_CENTER: {
        x: canvas.width/2 - 200,
        y: canvas.height - 300,
        width: 400,
        height: 20
    },
    MAIN_RIGHT: {
        x: canvas.width - 400,
        y: canvas.height - 200,
        width: 300,
        height: 20
    },
    TOP_LEFT: {
        x: 200,
        y: canvas.height - 500,
        width: 200,
        height: 20
    },
    TOP_CENTER: {
        x: canvas.width/2 - 100,
        y: canvas.height - 600,
        width: 200,
        height: 20
    },
    TOP_RIGHT: {
        x: canvas.width - 400,
        y: canvas.height - 500,
        width: 200,
        height: 20
    },
    SIDE_LEFT: {
        x: 50,
        y: canvas.height - 350,
        width: 100,
        height: 20
    },
    SIDE_RIGHT: {
        x: canvas.width - 150,
        y: canvas.height - 350,
        width: 100,
        height: 20
    }
};

// Audio elements
const audioElements = {
    jump: document.getElementById('jumpSound'),
    shoot: document.getElementById('shootSound'),
    zombie: document.getElementById('zombieSound')
};

// Initialize audio
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

// Play sound with error handling
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

// Debug logging function with categories
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

// Add safe object check helper
function safeObject(obj, defaultValue = {}) {
    return obj === null || obj === undefined ? defaultValue : obj;
}

// Add safe array check helper
function safeArray(arr, defaultValue = []) {
    return Array.isArray(arr) ? arr : defaultValue;
}

// Add safe number check helper
function safeNumber(num, defaultValue = 0) {
    return isNaN(num) || num === null || num === undefined ? defaultValue : Number(num);
}

// Add bounds checking helper
function clampNumber(num, min, max) {
    return Math.max(min, Math.min(max, safeNumber(num)));
}

// Gun class
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

// Player class
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
        debugLog(`Player initialized at (${this.x}, ${this.y})`, 'entity');
    }

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

// Zombie class
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

// Platform class
class Platform {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    draw() {
        ctx.fillStyle = '#555';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

// DroppedGun class
class DroppedGun {
    constructor(x, y, gun) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 15;
        this.gun = gun;
    }

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

// Bullet class
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

    draw() {
        ctx.fillStyle = '#FFF';
        ctx.fillRect(this.x - this.width/2, this.y - this.height/2, this.width, this.height);
    }
}

// DamageNumber class
class DamageNumber {
    constructor(x, y, damage) {
        this.x = x;
        this.y = y;
        this.damage = damage;
        this.alpha = 1;
        this.velocity = -2;
    }

    update() {
        this.y += this.velocity;
        this.alpha -= 0.02;
        return this.alpha > 0;
    }

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

// CollisionEffect class
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

    update() {
        this.lifetime++;
        this.particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.size *= 0.9;
        });
        return this.lifetime < this.maxLifetime;
    }

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

// Camera class
class Camera {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.shakeAmount = 0;
        this.shakeDecay = 0.9;
    }

    shake(amount) {
        this.shakeAmount = amount;
    }

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

// Game objects
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
function init() {
    debugLog('Initializing game state');
    
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

    draw() {
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}
