// Player entity with movement, combat, and progression systems
import { Entity } from './Entity.js';
import { Gun } from '../weapons/Gun.js';
import { CollisionEffect } from '../effects/CollisionEffect.js';
import { DamageNumber } from '../ui/DamageNumber.js';

export class Player extends Entity {
    constructor(x = 0, y = 0) {
        super(x, y);
        
        // Basic properties
        this.width = 40;
        this.height = 40;
        this.speed = 5;
        this.jumpForce = -15;
        this.health = 100;
        this.maxHealth = 100;
        
        // Combat properties
        this.gun = new Gun('pistol');
        this.damage = 10;
        this.invulnerable = false;
        this.invulnerabilityTime = 1000;
        this.lastDamageTime = 0;
        
        // Movement properties
        this.velocityX = 0;
        this.velocityY = 0;
        this.grounded = false;
        this.facingRight = true;
        
        // Progression properties
        this.level = 1;
        this.experience = 0;
        this.skillPoints = 0;
        
        // Combat statistics
        this.shotsFired = 0;
        this.shotsHit = 0;
        this.totalDamageDealt = 0;
        this.totalDamageTaken = 0;
        
        debugLog(`Player initialized at (${this.x}, ${this.y})`, 'entity');
    }
    
    update() {
        this.handleMovement();
        this.handleCombat();
        this.checkBounds();
        this.updateInvulnerability();
    }
    
    handleMovement() {
        // Apply gravity
        this.velocityY += GRAVITY;
        
        // Handle horizontal movement
        if (keys['a'] || keys['arrowleft']) {
            this.velocityX = -this.speed;
            this.facingRight = false;
        } else if (keys['d'] || keys['arrowright']) {
            this.velocityX = this.speed;
            this.facingRight = true;
        } else {
            this.velocityX = 0;
        }
        
        // Handle jumping
        if ((keys[' '] || keys['w'] || keys['arrowup']) && this.grounded) {
            this.velocityY = this.jumpForce;
            this.grounded = false;
            playSound('jump');
        }
        
        // Apply movement
        this.x += this.velocityX;
        this.y += this.velocityY;
        
        // Check platform collisions
        this.grounded = false;
        Object.values(PLATFORMS).forEach(platform => {
            if (this.checkCollision(platform)) {
                this.handlePlatformCollision(platform);
            }
        });
    }
    
    handleCombat() {
        if (this.gun) {
            this.gun.update();
            if (isMouseDown && this.gun.canShoot()) {
                this.shoot();
            }
        }
    }
    
    shoot() {
        if (!this.gun) return;
        
        const bullet = this.gun.shoot(this.x, this.y, this.aimAngle);
        if (bullet) {
            gameObjects.bullets.push(bullet);
            this.shotsFired++;
            playSound('shoot');
        }
    }
    
    takeDamage(amount) {
        if (this.invulnerable) return;
        
        this.health = Math.max(0, this.health - amount);
        this.totalDamageTaken += amount;
        this.lastDamageTime = Date.now();
        this.invulnerable = true;
        
        // Show damage number
        const damageNumber = new DamageNumber(this.x, this.y - 20, amount);
        gameObjects.effects.push(damageNumber);
        
        // Create hit effect
        const hitEffect = new CollisionEffect(this.x, this.y, 'hit');
        gameObjects.effects.push(hitEffect);
        
        // Screen shake
        camera.shake(5);
        
        if (this.health <= 0) {
            gameManager.handleGameOver();
        }
    }
    
    gainExperience(amount) {
        this.experience += amount;
        const nextLevelExp = this.level * 100;
        
        if (this.experience >= nextLevelExp) {
            this.levelUp();
        }
    }
    
    levelUp() {
        this.level++;
        this.skillPoints++;
        this.experience -= this.level * 100;
        this.showLevelUpEffect();
    }
    
    showLevelUpEffect() {
        const levelUpText = new DamageNumber(this.x, this.y - 50, 'LEVEL UP!');
        levelUpText.color = '#FFD700';
        levelUpText.size = 24;
        gameObjects.effects.push(levelUpText);
        
        const levelUpEffect = new CollisionEffect(this.x, this.y, 'levelup');
        gameObjects.effects.push(levelUpEffect);
    }
    
    calculateAccuracy() {
        return this.shotsFired > 0 ? (this.shotsHit / this.shotsFired) * 100 : 0;
    }
    
    render() {
        // Draw player
        ctx.fillStyle = this.invulnerable ? '#ff6666' : '#ff0000';
        ctx.fillRect(this.x - this.width/2, this.y - this.height/2, this.width, this.height);
        
        // Draw gun
        if (this.gun) {
            this.gun.render(this.x, this.y, this.aimAngle);
        }
    }
}
