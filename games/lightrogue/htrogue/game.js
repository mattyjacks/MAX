const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const tooltip = document.getElementById('tooltip');

// Set canvas size
canvas.width = 800;
canvas.height = 600;

// Game state
let level = 1;
let gameObjects = {
    player: null,
    zombies: [],
    bullets: [],
    droppedGuns: [],
    platforms: []
};

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

// Extended gun types
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
        spread: 0
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
        pellets: 5
    },
    RAILGUN: {
        name: 'Railgun',
        damage: 100,
        knockback: 15,
        fireRate: 1200,
        reloadSpeed: 2000,
        magazineSize: 3,
        color: '#4169E1',
        particleColor: '#0000FF',
        bulletSpeed: 20,
        spread: 0,
        piercing: true
    },
    FORCE_PUSH: {
        name: 'Force Push',
        damage: 5,
        knockback: 25,
        fireRate: 500,
        reloadSpeed: 800,
        magazineSize: 8,
        color: '#98FB98',
        particleColor: '#90EE90',
        bulletSpeed: 15,
        spread: 0.5,
        pushForce: true
    },
    SHOCK_RIFLE: {
        name: 'Shock Rifle',
        damage: 45,
        knockback: 10,
        fireRate: 600,
        reloadSpeed: 1200,
        magazineSize: 10,
        color: '#9370DB',
        particleColor: '#8A2BE2',
        bulletSpeed: 12,
        spread: 0,
        shockwave: true
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

// Sound effects
const sounds = {
    jump: document.getElementById('jumpSound'),
    shoot: document.getElementById('shootSound'),
    zombie: document.getElementById('zombieSound'),
    pickup: document.getElementById('pickupSound')
};

function playSound(sound) {
    const audio = sounds[sound];
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(e => console.log('Audio play failed:', e));
    }
}

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

// Player class
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 50;
        this.velocity = { x: 0, y: 0 };
        this.speed = 5;
        this.jumpForce = -12;
        this.isCrouching = false;
        this.normalHeight = 50;
        this.crouchHeight = 25;
        this.gun = { ...GunTypes.PISTOL };
        this.lastShot = 0;
        this.ammo = this.gun.magazineSize;
        this.isReloading = false;
        this.maxJumps = 1;
        this.jumps = 0;
        this.crouchSpeedMultiplier = 1;
    }

    update() {
        // Apply gravity
        this.velocity.y += 0.6;
        
        // Apply velocities
        this.x += this.velocity.x;
        this.y += this.velocity.y;

        // Screen wrapping
        wrapPosition(this);

        // Ground collision
        if (this.y + this.height > canvas.height - 50) {
            this.y = canvas.height - 50 - this.height;
            this.velocity.y = 0;
            this.jumps = 0;
        }

        // Platform collision
        gameObjects.platforms.forEach(platform => {
            if (this.x + this.width > platform.x && this.x < platform.x + platform.width &&
                this.y + this.height > platform.y && this.y < platform.y + platform.height) {
                this.y = platform.y - this.height;
                this.velocity.y = 0;
                this.jumps = 0;
            }
        });

        // Movement friction
        this.velocity.x *= 0.9;
    }

    draw() {
        ctx.fillStyle = '#00FF00';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    shoot(mouseX, mouseY) {
        if (this.isReloading || Date.now() - this.lastShot < this.gun.fireRate || this.ammo <= 0) return;

        playSound('shoot');

        const angle = Math.atan2(mouseY - (this.y + this.height/2), mouseX - (this.x + this.width/2));
        
        if (this.gun.pellets) {
            // Shotgun spread
            for (let i = 0; i < this.gun.pellets; i++) {
                const spreadAngle = angle + (Math.random() - 0.5) * this.gun.spread;
                gameObjects.bullets.push(new Bullet(
                    this.x + this.width/2,
                    this.y + this.height/2,
                    spreadAngle,
                    this.gun
                ));
            }
        } else {
            gameObjects.bullets.push(new Bullet(
                this.x + this.width/2,
                this.y + this.height/2,
                angle + (Math.random() - 0.5) * (this.gun.spread || 0),
                this.gun
            ));
        }

        particleSystem.createBulletTrail(
            this.x + this.width/2,
            this.y + this.height/2,
            this.gun.particleColor
        );

        this.ammo--;
        this.lastShot = Date.now();

        if (this.ammo <= 0) this.reload();
    }

    reload() {
        if (this.isReloading) return;
        this.isReloading = true;
        setTimeout(() => {
            this.ammo = this.gun.magazineSize;
            this.isReloading = false;
        }, this.gun.reloadSpeed);
    }
}

// Zombie class
class Zombie {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 50;
        this.speed = 2;
        this.health = 100;
    }

    update() {
        // Move towards player
        const dx = gameObjects.player.x - this.x;
        const direction = dx > 0 ? 1 : -1;
        this.x += this.speed * direction;

        // Screen wrapping
        wrapPosition(this);

        // Simple ground collision
        if (this.y + this.height < canvas.height - 50) {
            this.y += 5; // Simple gravity
        }
    }

    draw() {
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    takeDamage(damage, knockback, angle) {
        this.health -= damage;
        this.x += Math.cos(angle) * knockback;
        this.y += Math.sin(angle) * knockback;
        
        if (this.health <= 0) {
            // 20% chance to drop a random gun
            if (Math.random() < 0.2) {
                const gunTypes = Object.values(GunTypes);
                const randomGun = { ...gunTypes[Math.floor(Math.random() * gunTypes.length)] };
                gameObjects.droppedGuns.push(new DroppedGun(this.x, this.y, randomGun));
            }
        }
    }
}

// Bullet class
class Bullet {
    constructor(x, y, angle, gun) {
        this.x = x;
        this.y = y;
        this.speed = gun.bulletSpeed;
        this.angle = angle;
        this.gun = gun;
        this.width = 5;
        this.height = 5;
    }

    update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;

        // Screen wrapping
        wrapPosition(this);

        // Create particle trail
        particleSystem.createBulletTrail(
            this.x,
            this.y,
            this.gun.particleColor
        );
    }

    draw() {
        ctx.fillStyle = this.gun.color;
        ctx.fillRect(this.x - this.width/2, this.y - this.height/2, this.width, this.height);
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

// Initialize game
function init() {
    gameObjects.player = new Player(canvas.width/2, canvas.height - 100);
    spawnZombies();
    gameObjects.platforms.push(new Platform(PLATFORMS.MAIN.x, PLATFORMS.MAIN.y, PLATFORMS.MAIN.width, PLATFORMS.MAIN.height));
    gameObjects.platforms.push(new Platform(PLATFORMS.LEFT.x, PLATFORMS.LEFT.y, PLATFORMS.LEFT.width, PLATFORMS.LEFT.height));
    gameObjects.platforms.push(new Platform(PLATFORMS.RIGHT.x, PLATFORMS.RIGHT.y, PLATFORMS.RIGHT.width, PLATFORMS.RIGHT.height));
}

// Spawn zombies for current level
function spawnZombies() {
    const zombieCount = level * 2;
    for (let i = 0; i < zombieCount; i++) {
        const x = Math.random() * (canvas.width - 30);
        gameObjects.zombies.push(new Zombie(x, canvas.height - 100));
    }
}

// Input handling
const keys = {};
window.addEventListener('keydown', e => keys[e.key] = true);
window.addEventListener('keyup', e => keys[e.key] = false);

canvas.addEventListener('mousedown', e => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    gameObjects.player.shoot(mouseX, mouseY);
});

// Game loop
function gameLoop() {
    // Clear canvas
    ctx.fillStyle = '#333';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw ground
    ctx.fillStyle = '#666';
    ctx.fillRect(0, canvas.height - 50, canvas.width, 50);

    // Draw platforms
    gameObjects.platforms.forEach(platform => platform.draw());

    // Handle player movement
    if (keys['a']) gameObjects.player.velocity.x = -gameObjects.player.speed * gameObjects.player.crouchSpeedMultiplier;
    if (keys['d']) gameObjects.player.velocity.x = gameObjects.player.speed * gameObjects.player.crouchSpeedMultiplier;
    if (keys['w'] && gameObjects.player.jumps < gameObjects.player.maxJumps) {
        playSound('jump');
        gameObjects.player.velocity.y = gameObjects.player.jumpForce;
        gameObjects.player.jumps++;
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
        let hit = false;
        gameObjects.zombies = gameObjects.zombies.filter(zombie => {
            if (bullet.x > zombie.x && bullet.x < zombie.x + zombie.width &&
                bullet.y > zombie.y && bullet.y < zombie.y + zombie.height) {
                zombie.takeDamage(bullet.gun.damage, bullet.gun.knockback, bullet.angle);
                hit = true;
                return zombie.health > 0;
            }
            return true;
        });
        // Only remove bullets if they hit something, not for going off screen
        return !hit;
    });

    // Check for gun pickups
    gameObjects.droppedGuns = gameObjects.droppedGuns.filter(gun => {
        if (gameObjects.player.x < gun.x + gun.width && gameObjects.player.x + gameObjects.player.width > gun.x &&
            gameObjects.player.y < gun.y + gun.height && gameObjects.player.y + gameObjects.player.height > gun.y) {
            if (keys['e']) {
                playSound('pickup');
                gameObjects.player.gun = gun.gun;
                gameObjects.player.ammo = gun.gun.magazineSize;
                return false;
            }
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

    // Draw game objects
    gameObjects.player.draw();
    gameObjects.zombies.forEach(zombie => zombie.draw());
    gameObjects.bullets.forEach(bullet => bullet.draw());
    particleSystem.draw(ctx);
    gameObjects.droppedGuns.forEach(gun => gun.draw());

    // Draw level counter
    ctx.fillStyle = '#FFF';
    ctx.font = '20px Arial';
    ctx.fillText(`Level: ${level}`, canvas.width - 100, 30);

    // Check level completion
    if (gameObjects.zombies.length === 0) {
        level++;
        spawnZombies();
    }

    requestAnimationFrame(gameLoop);
}

// Start game
init();
gameLoop();
