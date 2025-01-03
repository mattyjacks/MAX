// Final Boss - The Necromancer
class Necromancer {
    constructor(x, y) {
        this.x = safeNumber(x);
        this.y = safeNumber(y);
        this.width = 80;
        this.height = 120;
        this.health = 1000;
        this.maxHealth = 1000;
        this.phase = 1; // Boss has 3 phases
        this.phaseThresholds = [700, 400, 100]; // Health thresholds for phase changes
        
        // Movement
        this.velocityX = 0;
        this.velocityY = 0;
        this.speed = 2;
        this.teleportCooldown = 5000;
        this.lastTeleport = 0;
        
        // Attack patterns
        this.attacks = {
            shadowBolt: {
                damage: 15,
                cooldown: 1000,
                lastUse: 0
            },
            summonZombies: {
                count: 2,
                cooldown: 8000,
                lastUse: 0
            },
            deathBeam: {
                damage: 25,
                duration: 2000,
                cooldown: 10000,
                lastUse: 0,
                active: false,
                angle: 0
            }
        };
        
        // Visual effects
        this.color = '#4a0080';
        this.effects = [];
        this.isInvulnerable = false;
        this.invulnerabilityTime = 500;
        
        debugLog('Necromancer boss spawned', 'entity', 'warning');
    }
    
    update() {
        try {
            if (!gameObjects.player) return false;
            
            // Update position with bounds checking
            this.x = clampNumber(this.x + this.velocityX, 0, canvas.width - this.width);
            this.y = clampNumber(this.y + this.velocityY, 0, canvas.height - this.height);
            
            // Check phase transitions
            this.checkPhaseTransition();
            
            // Update based on current phase
            switch(this.phase) {
                case 1:
                    this.updatePhaseOne();
                    break;
                case 2:
                    this.updatePhaseTwo();
                    break;
                case 3:
                    this.updatePhaseThree();
                    break;
            }
            
            // Try to teleport if cooldown is ready
            this.tryTeleport();
            
            return true;
        } catch (err) {
            debugLog(`Boss update error: ${err.message}`, 'state', 'warning');
            return false;
        }
    }
    
    checkPhaseTransition() {
        const prevPhase = this.phase;
        this.phase = this.phaseThresholds.findIndex(threshold => this.health <= threshold) + 1;
        
        if (this.phase !== prevPhase) {
            debugLog(`Boss entering phase ${this.phase}!`, 'state', 'warning');
            this.onPhaseChange();
        }
    }
    
    onPhaseChange() {
        // Become temporarily invulnerable during transition
        this.isInvulnerable = true;
        setTimeout(() => this.isInvulnerable = false, 2000);
        
        // Create phase transition effect
        for (let i = 0; i < 12; i++) {
            const angle = (Math.PI * 2 * i) / 12;
            const distance = 100;
            gameObjects.effects.push(new CollisionEffect(
                this.x + Math.cos(angle) * distance,
                this.y + Math.sin(angle) * distance,
                'impact'
            ));
        }
        
        // Screen shake
        camera.shake(10);
        
        // Reset attack cooldowns
        Object.values(this.attacks).forEach(attack => attack.lastUse = 0);
    }
    
    updatePhaseOne() {
        // Basic attack pattern - shadow bolts and occasional zombie summons
        this.moveTowardsPlayer(0.5);
        this.tryShadowBolt();
        this.trySummonZombies();
    }
    
    updatePhaseTwo() {
        // More aggressive - faster attacks and movement
        this.moveTowardsPlayer(0.8);
        this.tryShadowBolt(0.7); // Reduced cooldown
        this.trySummonZombies(3); // More zombies
        this.tryDeathBeam();
    }
    
    updatePhaseThree() {
        // Final phase - all out assault
        this.moveTowardsPlayer(1.2);
        this.tryShadowBolt(0.5);
        this.trySummonZombies(4);
        this.tryDeathBeam(1.5); // Faster beam rotation
    }
    
    moveTowardsPlayer(speedMultiplier = 1) {
        const dx = gameObjects.player.x - this.x;
        const dy = gameObjects.player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 200) { // Keep some distance
            this.velocityX = (dx / distance) * this.speed * speedMultiplier;
            this.velocityY = (dy / distance) * this.speed * speedMultiplier;
        } else {
            this.velocityX = 0;
            this.velocityY = 0;
        }
    }
    
    tryTeleport() {
        if (Date.now() - this.lastTeleport >= this.teleportCooldown) {
            // Create disappear effect
            gameObjects.effects.push(new CollisionEffect(this.x + this.width/2, this.y + this.height/2, 'impact'));
            
            // Teleport to new position
            const margin = 100;
            this.x = Math.random() * (canvas.width - this.width - margin * 2) + margin;
            this.y = Math.random() * (canvas.height - this.height - margin * 2) + margin;
            
            // Create appear effect
            gameObjects.effects.push(new CollisionEffect(this.x + this.width/2, this.y + this.height/2, 'impact'));
            
            this.lastTeleport = Date.now();
            debugLog('Boss teleported', 'combat');
        }
    }
    
    tryShadowBolt(cooldownMultiplier = 1) {
        const attack = this.attacks.shadowBolt;
        if (Date.now() - attack.lastUse >= attack.cooldown * cooldownMultiplier) {
            // Calculate direction to player
            const dx = gameObjects.player.x - this.x;
            const dy = gameObjects.player.y - this.y;
            const angle = Math.atan2(dy, dx);
            
            // Create shadow bolt
            gameObjects.bullets.push(new ShadowBolt(
                this.x + this.width/2,
                this.y + this.height/2,
                angle,
                attack.damage
            ));
            
            attack.lastUse = Date.now();
            debugLog('Boss fired shadow bolt', 'combat');
        }
    }
    
    trySummonZombies(count = 2) {
        const attack = this.attacks.summonZombies;
        if (Date.now() - attack.lastUse >= attack.cooldown) {
            for (let i = 0; i < count; i++) {
                const angle = (Math.PI * 2 * i) / count;
                const distance = 100;
                const x = this.x + Math.cos(angle) * distance;
                const y = this.y + Math.sin(angle) * distance;
                
                gameObjects.zombies.push(new Zombie(x, y));
                gameObjects.effects.push(new CollisionEffect(x, y, 'impact'));
            }
            
            attack.lastUse = Date.now();
            debugLog(`Boss summoned ${count} zombies`, 'combat');
        }
    }
    
    tryDeathBeam(speedMultiplier = 1) {
        const attack = this.attacks.deathBeam;
        if (Date.now() - attack.lastUse >= attack.cooldown) {
            attack.active = true;
            attack.angle = 0;
            
            // Create rotating death beam for 2 seconds
            const startTime = Date.now();
            const interval = setInterval(() => {
                if (Date.now() - startTime >= attack.duration) {
                    clearInterval(interval);
                    attack.active = false;
                    attack.lastUse = Date.now();
                    return;
                }
                
                // Update beam angle
                attack.angle += 0.1 * speedMultiplier;
                
                // Check if beam hits player
                const dx = gameObjects.player.x - this.x;
                const dy = gameObjects.player.y - this.y;
                const playerAngle = Math.atan2(dy, dx);
                const angleDiff = Math.abs(playerAngle - attack.angle) % (Math.PI * 2);
                
                if (angleDiff < 0.1) {
                    gameObjects.player.takeDamage(attack.damage);
                }
                
                // Create beam particles
                const distance = 400;
                const x = this.x + Math.cos(attack.angle) * distance;
                const y = this.y + Math.sin(attack.angle) * distance;
                gameObjects.effects.push(new CollisionEffect(x, y, 'impact'));
                
            }, 50);
            
            debugLog('Boss started death beam', 'combat');
        }
    }
    
    takeDamage(amount) {
        if (this.isInvulnerable) return false;
        
        this.health = Math.max(0, this.health - amount);
        
        // Visual feedback
        gameObjects.effects.push(new CollisionEffect(
            this.x + this.width/2,
            this.y + this.height/2,
            'impact'
        ));
        
        // Screen shake based on damage
        camera.shake(amount * 0.2);
        
        if (this.health <= 0) {
            // Death sequence
            for (let i = 0; i < 20; i++) {
                setTimeout(() => {
                    gameObjects.effects.push(new CollisionEffect(
                        this.x + Math.random() * this.width,
                        this.y + Math.random() * this.height,
                        'impact'
                    ));
                }, i * 100);
            }
            camera.shake(20);
            debugLog('Boss defeated!', 'combat', 'success');
            return true;
        }
        
        return false;
    }
    
    draw(ctx) {
        // Draw boss
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Draw health bar
        const healthBarWidth = 200;
        const healthBarHeight = 20;
        const healthBarX = (canvas.width - healthBarWidth) / 2;
        const healthBarY = 20;
        
        ctx.fillStyle = '#333';
        ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
        
        const healthPercent = this.health / this.maxHealth;
        ctx.fillStyle = `hsl(${healthPercent * 120}, 100%, 50%)`;
        ctx.fillRect(healthBarX, healthBarY, healthBarWidth * healthPercent, healthBarHeight);
        
        // Draw phase indicator
        ctx.fillStyle = '#fff';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Phase ${this.phase}`, canvas.width/2, healthBarY + healthBarHeight + 20);
        
        // Draw death beam if active
        if (this.attacks.deathBeam.active) {
            ctx.beginPath();
            ctx.moveTo(this.x + this.width/2, this.y + this.height/2);
            const beamLength = 1000;
            const endX = this.x + Math.cos(this.attacks.deathBeam.angle) * beamLength;
            const endY = this.y + Math.sin(this.attacks.deathBeam.angle) * beamLength;
            ctx.lineTo(endX, endY);
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 5;
            ctx.stroke();
        }
    }
}

class ShadowBolt {
    constructor(x, y, angle, damage) {
        this.x = x;
        this.y = y;
        this.speed = 8;
        this.velocityX = Math.cos(angle) * this.speed;
        this.velocityY = Math.sin(angle) * this.speed;
        this.damage = damage;
        this.radius = 8;
    }
    
    update() {
        this.x += this.velocityX;
        this.y += this.velocityY;
        
        // Create trail effect
        gameObjects.effects.push(new CollisionEffect(this.x, this.y, 'impact'));
        
        // Check if out of bounds
        if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
            return false;
        }
        
        // Check player collision
        if (gameObjects.player) {
            const dx = this.x - (gameObjects.player.x + gameObjects.player.width/2);
            const dy = this.y - (gameObjects.player.y + gameObjects.player.height/2);
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < this.radius + 20) {
                gameObjects.player.takeDamage(this.damage);
                return false;
            }
        }
        
        return true;
    }
    
    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#800080';
        ctx.fill();
        
        // Glow effect
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(128, 0, 128, 0.3)';
        ctx.fill();
    }
}
