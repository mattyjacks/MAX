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
canvas.width = 800;
canvas.height = 600;

// Game state
let level = 1;
let score = 0;
let isGameRunning = false;
let selectedUpgrade = null;
let isUpgradeMenuActive = false;
let audioInitialized = false;
let gameStarted = false;
let mouseX = 0;
let mouseY = 0;
let damageNumbers = [];

// Track mouse position
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
});

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

// Platform configuration
const PLATFORMS = {
    MAIN: {
        x: 200,
        y: canvas.height - 150,
        width: 400,
        height: 20
    },
    LEFT: {
        x: 50,
        y: canvas.height - 250,
        width: 100,
        height: 20
    },
    RIGHT: {
        x: 650,
        y: canvas.height - 250,
        width: 100,
        height: 20
    }
};

// Extended gun types with randomization
function createGunStats(baseGun) {
    const randomFactor = (min, max) => 1 + (Math.random() * (max - min) + min);
    return {
        ...baseGun,
        damage: Math.floor(baseGun.damage * randomFactor(-0.2, 0.2)),
        fireRate: Math.floor(baseGun.fireRate * randomFactor(-0.2, 0.2)),
        range: baseGun.range * randomFactor(-0.1, 0.1),
        magazineSize: Math.floor(baseGun.magazineSize * randomFactor(-0.2, 0.2))
    };
}

const GunTypes = {
    PISTOL: {
        name: 'Pistol',
        damage: 25,
        knockback: 5,
        fireRate: 250,
        reloadSpeed: 1000,
        magazineSize: 12,
        color: '#FFD700',
        particleColor: '#FFA500',
        bulletSpeed: 10,
        spread: 0,
        range: 300
    },
    SHOTGUN: {
        name: 'Shotgun',
        damage: 15,
        knockback: 8,
        fireRate: 800,
        reloadSpeed: 1500,
        magazineSize: 6,
        color: '#FF4500',
        particleColor: '#8B0000',
        bulletSpeed: 8,
        spread: 0.3,
        pellets: 5,
        range: 200
    },
    MACHINE_GUN: {
        name: 'Machine Gun',
        damage: 15,
        knockback: 3,
        fireRate: 100,
        reloadSpeed: 2000,
        magazineSize: 30,
        color: '#4169E1',
        particleColor: '#0000FF',
        bulletSpeed: 12,
        spread: 0.1,
        range: 400
    }
};

// Powerups
const PowerUpTypes = {
    DOUBLE_JUMP: {
        name: 'Double Jump',
        color: '#87CEEB',
        effect: player => player.maxJumps = 2
    },
    TRIPLE_JUMP: {
        name: 'Triple Jump',
        color: '#4682B4',
        effect: player => player.maxJumps = 3
    },
    FAST_CROUCH: {
        name: 'Fast Crouch',
        color: '#32CD32',
        effect: player => player.crouchSpeedMultiplier = 0.8
    },
    SPEED_BOOST: {
        name: 'Speed Boost',
        color: '#FF69B4',
        effect: player => player.speed *= 1.3
    }
};

// Game objects
let gameObjects = {
    player: null,
    zombies: [],
    bullets: [],
    droppedGuns: [],
    platforms: [],
    powerups: []
};

// Enhanced Particle System
class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    createBulletTrail(x, y, color) {
        for (let i = 0; i < 3; i++) {
            this.particles.push(new Particle(
                x + (Math.random() - 0.5) * 5,
                y + (Math.random() - 0.5) * 5,
                color,
                Math.random() * Math.PI * 2,
                Math.random() * 2
            ));
        }
    }

    createExplosion(x, y, color, count = 10) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i;
            this.particles.push(new Particle(
                x,
                y,
                color,
                angle,
                3 + Math.random() * 2,
                1.5
            ));
        }
    }

    update() {
        this.particles = this.particles.filter(particle => {
            particle.update();
            return particle.life > 0;
        });
    }

    draw(ctx) {
        this.particles.forEach(particle => particle.draw(ctx));
    }
}

// Enhanced Particle class
class Particle {
    constructor(x, y, color, angle, speed, size = 1) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.life = 1;
        this.size = size;
        this.velocity = {
            x: Math.cos(angle) * speed,
            y: Math.sin(angle) * speed
        };
    }

    update() {
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.life -= 0.02;
        this.velocity.x *= 0.98;
        this.velocity.y *= 0.98;
        this.size *= 0.95;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.life;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

// Initialize particle system
const particleSystem = new ParticleSystem();

// Add a utility function for screen wrapping
function wrapPosition(obj) {
    if (obj.x + obj.width < 0) {
        obj.x = canvas.width;
    } else if (obj.x > canvas.width) {
        obj.x = -obj.width;
    }
}

// Update Player class
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 50;
        this.velocity = { x: 0, y: 0 };
        this.speed = 5;
        this.maxSpeed = 8;
        this.acceleration = 1;
        this.friction = {
            ground: 0.85, // Ground friction
            air: 0.95,    // Air friction
            crouch: 0.75  // Crouch friction (slower movement)
        };
        this.jumpForce = -12;
        this.maxJumpForce = -20;
        this.jumpTime = 0;
        this.maxJumpTime = 250;
        this.isJumping = false;
        this.isCrouching = false;
        this.normalHeight = 50;
        this.crouchHeight = 25;
        this.gun = createGunStats(GunTypes.PISTOL);
        this.lastShot = 0;
        this.ammo = this.gun.magazineSize;
        this.isReloading = false;
        this.maxJumps = 1;
        this.jumps = 0;
        this.crouchSpeedMultiplier = 0.6;
        this.health = 100;
        this.maxHealth = 100;
        this.isInvulnerable = false;
        this.invulnerabilityTime = 1000;
        this.lastHit = 0;
        this.borderRadius = 5;
        
        // Movement state
        this.isOnGround = false;
        this.movementDirection = 0;
        this.airControl = 0.3; // Air control multiplier
    }

    applyImpulse(x, y) {
        this.velocity.x += x;
        this.velocity.y += y;
    }

    applyFriction() {
        const frictionCoeff = this.isOnGround ? 
            (this.isCrouching ? this.friction.crouch : this.friction.ground) : 
            this.friction.air;
        
        this.velocity.x *= frictionCoeff;
        
        // Stop completely if velocity is very small
        if (Math.abs(this.velocity.x) < 0.01) {
            this.velocity.x = 0;
        }
    }

    handleMovement(direction) {
        this.movementDirection = direction;
        
        // Calculate acceleration based on current state
        let accelerationMultiplier = this.isOnGround ? 1 : this.airControl;
        if (this.isCrouching) {
            accelerationMultiplier *= this.crouchSpeedMultiplier;
        }

        // Apply acceleration
        const acceleration = this.acceleration * accelerationMultiplier * direction;
        this.applyImpulse(acceleration, 0);

        // Clamp horizontal velocity to max speed
        const maxCurrentSpeed = this.maxSpeed * (this.isCrouching ? this.crouchSpeedMultiplier : 1);
        if (Math.abs(this.velocity.x) > maxCurrentSpeed) {
            this.velocity.x = Math.sign(this.velocity.x) * maxCurrentSpeed;
        }
    }

    checkGroundCollision() {
        // Check ground collision
        if (this.y + this.height > canvas.height - 50) {
            this.y = canvas.height - 50 - this.height;
            this.velocity.y = 0;
            this.isOnGround = true;
            this.jumps = 0;
            return true;
        }

        // Check platform collisions
        for (const platform of gameObjects.platforms) {
            if (this.x + this.width > platform.x && 
                this.x < platform.x + platform.width &&
                this.y + this.height > platform.y &&
                this.y < platform.y + platform.height) {
                
                // Only count as ground if we're coming from above
                if (this.y + this.height - this.velocity.y <= platform.y) {
                    this.y = platform.y - this.height;
                    this.velocity.y = 0;
                    this.isOnGround = true;
                    this.jumps = 0;
                    return true;
                }
                // Side and bottom collisions
                else if (this.x + this.width - this.velocity.x <= platform.x) {
                    this.x = platform.x - this.width;
                    this.velocity.x = 0;
                } else if (this.x - this.velocity.x >= platform.x + platform.width) {
                    this.x = platform.x + platform.width;
                    this.velocity.x = 0;
                } else {
                    this.y = platform.y + platform.height;
                    this.velocity.y = 0;
                }
            }
        }
        return false;
    }

    jump() {
        if (this.jumps < this.maxJumps) {
            this.velocity.y = this.jumpForce;
            this.jumps++;
            this.jumpTime = Date.now();
            this.isOnGround = false;
            playSound('jump');
        }
    }

    update() {
        // Apply gravity
        this.velocity.y += 0.6;

        // Update position
        this.x += this.velocity.x;
        this.y += this.velocity.y;

        // Screen wrapping for x-axis only
        if (this.x + this.width < 0) {
            this.x = canvas.width;
        } else if (this.x > canvas.width) {
            this.x = -this.width;
        }

        // Ground and platform collision check
        if (!this.checkGroundCollision()) {
            this.isOnGround = false;
        }

        // Apply friction
        this.applyFriction();

        // Update health bar
        healthBarFill.style.width = (this.health / this.maxHealth * 100) + '%';
        healthElement.textContent = Math.ceil(this.health);

        // Handle invulnerability frames
        if (this.isInvulnerable && Date.now() - this.lastHit > this.invulnerabilityTime) {
            this.isInvulnerable = false;
        }
    }

    draw() {
        ctx.fillStyle = this.isInvulnerable ? '#AAA' : '#4CAF50';
        ctx.strokeStyle = '#45a049';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.roundRect(this.x, this.y, this.width, this.height, this.borderRadius);
        ctx.fill();
        ctx.stroke();

        // Draw gun
        const angle = Math.atan2(
            mouseY - (this.y + this.height/2),
            mouseX - (this.x + this.width/2)
        );
        
        ctx.save();
        ctx.translate(this.x + this.width/2, this.y + this.height/2);
        ctx.rotate(angle);
        
        ctx.fillStyle = this.gun.color;
        ctx.fillRect(0, -2, 20, 4);
        
        ctx.restore();

        // Draw ammo counter
        ctx.fillStyle = '#FFF';
        ctx.font = '12px Arial';
        ctx.fillText(`${this.ammo}`, this.x + this.width/2 - 5, this.y - 5);
    }

    shoot(mouseX, mouseY) {
        if (this.isReloading || Date.now() - this.lastShot < this.gun.fireRate) return;
        
        if (this.ammo <= 0) {
            this.reload();
            return;
        }

        const angle = Math.atan2(
            mouseY - (this.y + this.height/2),
            mouseX - (this.x + this.width/2)
        );

        // Add recoil impulse
        const recoilForce = 0.5;
        this.applyImpulse(
            -Math.cos(angle) * recoilForce,
            -Math.sin(angle) * recoilForce
        );

        // Create bullet with spread
        const spread = (Math.random() - 0.5) * this.gun.spread;
        const bulletAngle = angle + spread;
        
        if (this.gun.pellets) {
            for (let i = 0; i < this.gun.pellets; i++) {
                const pelletSpread = (Math.random() - 0.5) * this.gun.spread;
                const pelletAngle = angle + pelletSpread;
                gameObjects.bullets.push(new Bullet(
                    this.x + this.width/2,
                    this.y + this.height/2,
                    pelletAngle,
                    this.gun
                ));
            }
        } else {
            gameObjects.bullets.push(new Bullet(
                this.x + this.width/2,
                this.y + this.height/2,
                bulletAngle,
                this.gun
            ));
        }

        this.ammo--;
        this.lastShot = Date.now();
        playSound('shoot');
    }

    reload() {
        if (!this.isReloading) {
            this.isReloading = true;
            setTimeout(() => {
                this.ammo = this.gun.magazineSize;
                this.isReloading = false;
            }, this.gun.reloadSpeed);
        }
    }

    takeDamage(amount) {
        if (!this.isInvulnerable) {
            this.health = Math.max(0, this.health - amount);
            this.isInvulnerable = true;
            this.lastHit = Date.now();
            
            // Knockback on damage
            const knockbackForce = 3;
            this.velocity.y = -knockbackForce;
            this.velocity.x = (this.x < canvas.width/2 ? knockbackForce : -knockbackForce);
        }
    }
}

// Update Zombie class
class Zombie {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 50;
        this.speed = 2;
        this.health = 100;
        this.jumpForce = -10;
        this.velocity = { x: 0, y: 0 };
        this.jumpCooldown = 2000;
        this.lastJump = 0;
        this.borderRadius = 5;
    }

    update() {
        // Apply gravity
        this.velocity.y += 0.6;

        // Move towards player
        const dx = gameObjects.player.x - this.x;
        const dy = gameObjects.player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Attack player when close
        if (distance < 50) {
            gameObjects.player.takeDamage(10);
            playSound('zombie');
        }

        // Movement and jumping
        const direction = dx > 0 ? 1 : -1;
        this.velocity.x = this.speed * direction;

        // Jump if player is above and cooldown is ready
        if (dy < -50 && Date.now() - this.lastJump > this.jumpCooldown && this.isOnGround()) {
            this.velocity.y = this.jumpForce;
            this.lastJump = Date.now();
        }

        // Prevent intersection with other zombies
        gameObjects.zombies.forEach(other => {
            if (other !== this) {
                const zdx = this.x - other.x;
                const zdy = this.y - other.y;
                const dist = Math.sqrt(zdx * zdx + zdy * zdy);
                if (dist < this.width) {
                    this.x += (zdx / dist) * 2;
                    other.x -= (zdx / dist) * 2;
                }
            }
        });

        // Apply velocities
        this.x += this.velocity.x;
        this.y += this.velocity.y;

        // Screen wrapping
        wrapPosition(this);

        // Ground and platform collisions
        this.handleCollisions();
    }

    isOnGround() {
        return this.y + this.height >= canvas.height - 50 || 
               gameObjects.platforms.some(platform => 
                   this.x + this.width > platform.x && 
                   this.x < platform.x + platform.width &&
                   Math.abs(this.y + this.height - platform.y) < 5
               );
    }

    handleCollisions() {
        // Ground collision
        if (this.y + this.height > canvas.height - 50) {
            this.y = canvas.height - 50 - this.height;
            this.velocity.y = 0;
        }

        // Platform collision
        gameObjects.platforms.forEach(platform => {
            if (this.x + this.width > platform.x && 
                this.x < platform.x + platform.width &&
                this.y + this.height > platform.y &&
                this.y < platform.y + platform.height) {
                this.y = platform.y - this.height;
                this.velocity.y = 0;
            }
        });
    }

    draw() {
        ctx.fillStyle = '#FF0000';
        ctx.strokeStyle = '#800000';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.roundRect(this.x, this.y, this.width, this.height, this.borderRadius);
        ctx.fill();
        ctx.stroke();
    }

    takeDamage(damage) {
        this.health -= damage;
        if (this.health <= 0) {
            score += 100;
            scoreElement.textContent = score;
            playSound('zombie');
            
            // Increase gun drop chance to 40%
            if (Math.random() < 0.4) {
                const gunTypes = Object.values(GunTypes);
                const randomGun = createGunStats(gunTypes[Math.floor(Math.random() * gunTypes.length)]);
                gameObjects.droppedGuns.push(new DroppedGun(this.x, this.y, randomGun));
            }
            return true; // Zombie died
        }
        return false; // Zombie still alive
    }
}

// Update Bullet class
class Bullet {
    constructor(x, y, angle, gun) {
        this.x = x;
        this.y = y;
        this.speed = gun.bulletSpeed;
        this.angle = angle;
        this.gun = gun;
        this.width = 5;
        this.height = 5;
        this.distanceTraveled = 0;
    }

    update() {
        const dx = Math.cos(this.angle) * this.speed;
        const dy = Math.sin(this.angle) * this.speed;
        this.x += dx;
        this.y += dy;
        this.distanceTraveled += Math.sqrt(dx * dx + dy * dy);

        // Screen wrapping
        wrapPosition(this);

        // Create particle trail
        particleSystem.createBulletTrail(this.x, this.y, this.gun.particleColor);
    }

    draw() {
        ctx.fillStyle = this.gun.color || '#FFF';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    isOutOfRange() {
        return this.distanceTraveled > this.gun.range;
    }
}

// Dropped Gun class
class DroppedGun {
    constructor(x, y, gun) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 10;
        this.gun = gun;
    }

    draw() {
        ctx.fillStyle = this.gun.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
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
        ctx.fillStyle = '#AAA';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

// Damage number class
class DamageNumber {
    constructor(x, y, damage) {
        this.x = x;
        this.y = y;
        this.damage = damage;
        this.alpha = 1;
        this.velocity = -2;
        this.lifetime = 60; // frames
    }

    update() {
        this.y += this.velocity;
        this.lifetime--;
        this.alpha = this.lifetime / 60;
        return this.lifetime > 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = '#ff4444';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.damage, this.x, this.y);
        ctx.restore();
    }
}

// Available upgrades
const upgrades = {
    maxHealth: {
        name: "Max Health",
        description: "Increase maximum health by 25",
        apply: (player) => {
            player.maxHealth += 25;
            player.health = player.maxHealth;
            healthElement.textContent = player.health;
        }
    },
    speed: {
        name: "Movement Speed",
        description: "Increase movement speed by 20%",
        apply: (player) => {
            player.speed *= 1.2;
        }
    },
    jumpForce: {
        name: "Jump Power",
        description: "Increase jump force by 15%",
        apply: (player) => {
            player.jumpForce *= 1.15;
            player.maxJumpForce *= 1.15;
        }
    },
    gunDamage: {
        name: "Gun Damage",
        description: "Increase gun damage by 25%",
        apply: (player) => {
            player.gun.damage = Math.ceil(player.gun.damage * 1.25);
        }
    },
    fireRate: {
        name: "Fire Rate",
        description: "Decrease fire rate cooldown by 20%",
        apply: (player) => {
            player.gun.fireRate = Math.max(50, Math.floor(player.gun.fireRate * 0.8));
        }
    },
    magazineSize: {
        name: "Magazine Size",
        description: "Increase magazine size by 50%",
        apply: (player) => {
            player.gun.magazineSize = Math.ceil(player.gun.magazineSize * 1.5);
            player.ammo = player.gun.magazineSize;
        }
    },
    doubleJump: {
        name: "Double Jump",
        description: "Gain ability to jump twice",
        apply: (player) => {
            player.maxJumps = 2;
        },
        condition: (player) => player.maxJumps === 1
    }
};

// Initialize game
function init() {
    // Reset game state
    level = 1;
    score = 0;
    isGameRunning = true;
    selectedUpgrade = null;
    isUpgradeMenuActive = false;
    gameStarted = true;
    damageNumbers = [];
    
    // Reset UI
    levelElement.textContent = level;
    scoreElement.textContent = score;
    healthElement.textContent = '100';
    healthBarFill.style.width = '100%';
    upgradeMenu.style.display = 'none';
    tooltip.style.display = 'none';
    
    // Reset game objects
    gameObjects = {
        player: new Player(canvas.width/2, canvas.height - 100),
        zombies: [],
        bullets: [],
        droppedGuns: [],
        platforms: [],
        powerups: []
    };

    // Create platforms
    gameObjects.platforms.push(new Platform(PLATFORMS.MAIN.x, PLATFORMS.MAIN.y, PLATFORMS.MAIN.width, PLATFORMS.MAIN.height));
    gameObjects.platforms.push(new Platform(PLATFORMS.LEFT.x, PLATFORMS.LEFT.y, PLATFORMS.LEFT.width, PLATFORMS.LEFT.height));
    gameObjects.platforms.push(new Platform(PLATFORMS.RIGHT.x, PLATFORMS.RIGHT.y, PLATFORMS.RIGHT.width, PLATFORMS.RIGHT.height));
    
    // Spawn initial zombies
    spawnZombies();
}

// Show upgrade menu function
function showUpgradeMenu() {
    isUpgradeMenuActive = true;
    upgradeMenu.style.display = 'block';
    upgradeGrid.innerHTML = '';
    selectedUpgrade = null;
    confirmUpgradeBtn.disabled = true;

    // Get three random unique upgrades
    const availableUpgrades = Object.entries(upgrades)
        .filter(([_, upgrade]) => !upgrade.condition || upgrade.condition(gameObjects.player))
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);

    availableUpgrades.forEach(([key, upgrade]) => {
        const upgradeElement = document.createElement('div');
        upgradeElement.className = 'upgrade-item';
        upgradeElement.innerHTML = `
            <h3>${upgrade.name}</h3>
            <p>${upgrade.description}</p>
        `;
        upgradeElement.addEventListener('click', () => {
            document.querySelectorAll('.upgrade-item').forEach(item => item.classList.remove('selected'));
            upgradeElement.classList.add('selected');
            selectedUpgrade = key;
            confirmUpgradeBtn.disabled = false;
        });
        upgradeGrid.appendChild(upgradeElement);
    });
}

confirmUpgradeBtn.addEventListener('click', () => {
    if (selectedUpgrade && upgrades[selectedUpgrade]) {
        upgrades[selectedUpgrade].apply(gameObjects.player);
        upgradeMenu.style.display = 'none';
        isUpgradeMenuActive = false;
        isGameRunning = true;
        spawnZombies();
        requestAnimationFrame(gameLoop); // Restart game loop
    }
});

// Spawn zombies for current level
function spawnZombies() {
    const zombieCount = Math.min(level * 2, 20); // Cap at 20 zombies per level
    const spawnPoints = [
        { x: 50, y: canvas.height - 100 },
        { x: canvas.width - 50, y: canvas.height - 100 },
        { x: canvas.width/2, y: canvas.height - 300 }
    ];

    for (let i = 0; i < zombieCount; i++) {
        const spawnPoint = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
        const x = spawnPoint.x + (Math.random() - 0.5) * 100; // Add some random offset
        const y = spawnPoint.y;
        gameObjects.zombies.push(new Zombie(x, y));
    }
}

// Input handling
const keys = {};
window.addEventListener('keydown', e => {
    keys[e.key.toLowerCase()] = true;
    if (e.key === 'r' && !isGameRunning) {
        startGame();
    }
});
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

canvas.addEventListener('mousedown', e => {
    if (!gameStarted || !isGameRunning) return;
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
    gameObjects.player.shoot(mouseX, mouseY);
});

// Game loop
function gameLoop() {
    if (!gameStarted || !isGameRunning) return;
    
    // Clear canvas
    ctx.fillStyle = '#333';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw ground
    ctx.fillStyle = '#666';
    ctx.fillRect(0, canvas.height - 50, canvas.width, 50);

    // Draw platforms
    gameObjects.platforms.forEach(platform => platform.draw());

    // Update and draw damage numbers
    damageNumbers = damageNumbers.filter(number => {
        const alive = number.update();
        if (alive) number.draw(ctx);
        return alive;
    });

    // Handle player movement
    if (keys['a']) gameObjects.player.handleMovement(-1);
    if (keys['d']) gameObjects.player.handleMovement(1);
    if (!keys['a'] && !keys['d']) gameObjects.player.handleMovement(0);
    
    if (keys['w'] && !gameObjects.player.isJumping) {
        gameObjects.player.jump();
    }
    if (keys['s']) {
        gameObjects.player.isCrouching = true;
        gameObjects.player.height = gameObjects.player.crouchHeight;
    } else {
        gameObjects.player.isCrouching = false;
        gameObjects.player.height = gameObjects.player.normalHeight;
    }

    // Update game objects
    gameObjects.player.update();
    gameObjects.zombies.forEach(zombie => zombie.update());
    gameObjects.bullets.forEach(bullet => bullet.update());
    particleSystem.update();

    // Check bullet collisions
    gameObjects.bullets = gameObjects.bullets.filter(bullet => {
        if (bullet.isOutOfRange()) return false;

        let hit = false;
        for (let i = gameObjects.zombies.length - 1; i >= 0; i--) {
            const zombie = gameObjects.zombies[i];
            if (bullet.x > zombie.x && bullet.x < zombie.x + zombie.width &&
                bullet.y > zombie.y && bullet.y < zombie.y + zombie.height) {
                // Create damage number
                damageNumbers.push(new DamageNumber(
                    zombie.x + zombie.width/2,
                    zombie.y,
                    bullet.gun.damage
                ));
                
                if (zombie.takeDamage(bullet.gun.damage)) {
                    gameObjects.zombies.splice(i, 1);
                    score += 100;
                    scoreElement.textContent = score;
                }
                hit = true;
                break;
            }
        }
        return !hit;
    });

    // Draw game objects
    gameObjects.player.draw();
    gameObjects.zombies.forEach(zombie => zombie.draw());
    gameObjects.bullets.forEach(bullet => bullet.draw());
    particleSystem.draw(ctx);
    gameObjects.droppedGuns.forEach(gun => gun.draw());

    // Check for gun pickups
    gameObjects.droppedGuns = gameObjects.droppedGuns.filter(gun => {
        if (gameObjects.player.x < gun.x + gun.width && 
            gameObjects.player.x + gameObjects.player.width > gun.x &&
            gameObjects.player.y < gun.y + gun.height && 
            gameObjects.player.y + gameObjects.player.height > gun.y) {
            
            // Show tooltip
            tooltip.style.display = 'block';
            tooltip.style.left = `${gun.x + canvas.getBoundingClientRect().left}px`;
            tooltip.style.top = `${gun.y + canvas.getBoundingClientRect().top - 100}px`;
            tooltip.innerHTML = `
                Current Gun: ${gameObjects.player.gun.name}<br>
                New Gun: ${gun.gun.name}<br>
                Damage: ${gameObjects.player.gun.damage} → ${gun.gun.damage}<br>
                Fire Rate: ${gameObjects.player.gun.fireRate} → ${gun.gun.fireRate}<br>
                Press E to pickup
            `;
        } else {
            tooltip.style.display = 'none';
        }
        return true;
    });

    // Level progression
    if (gameObjects.zombies.length === 0) {
        level++;
        levelElement.textContent = level;
        isGameRunning = false;
        showUpgradeMenu();
    }

    // Game over check
    if (gameObjects.player.health <= 0) {
        isGameRunning = false;
        gameStarted = false;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#FF0000';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2);
        ctx.font = '24px Arial';
        ctx.fillText(`Score: ${score}`, canvas.width/2, canvas.height/2 + 40);
        ctx.fillText('Press R to restart', canvas.width/2, canvas.height/2 + 80);
        return;
    }

    requestAnimationFrame(gameLoop);
}

// Start game function
function startGame() {
    // Initialize audio on user interaction
    initializeAudio();
    
    // Hide start screen and show canvas
    startScreen.style.display = 'none';
    canvas.style.display = 'block';
    
    // Initialize game
    init();
    
    // Start game loop
    requestAnimationFrame(gameLoop);
}

// Start button click handler
startButton.addEventListener('click', startGame);
