// Level management system for procedural generation and progression
import { Zombie } from '../entities/Zombie.js';
import { Necromancer } from '../entities/Necromancer.js';
import { PowerUp } from '../entities/PowerUp.js';

export class LevelManager {
    constructor() {
        this.currentLevel = 1;
        this.enemiesPerLevel = 5;
        this.enemySpawnRate = 2000;
        this.lastSpawnTime = 0;
        this.spawnPoints = [];
        this.platforms = [];
        this.powerUpChance = 0.1;
        this.bossLevels = [5, 10, 15, 20];
    }
    
    initialize() {
        this.generateSpawnPoints();
        this.generatePlatforms();
        return Promise.resolve();
    }
    
    generateSpawnPoints() {
        // Create spawn points around the edges of the screen
        const margin = 100;
        const spacing = 200;
        
        // Top edge
        for (let x = margin; x < canvas.width - margin; x += spacing) {
            this.spawnPoints.push({ x, y: -50 });
        }
        
        // Bottom edge
        for (let x = margin; x < canvas.width - margin; x += spacing) {
            this.spawnPoints.push({ x, y: canvas.height + 50 });
        }
        
        // Left edge
        for (let y = margin; y < canvas.height - margin; y += spacing) {
            this.spawnPoints.push({ x: -50, y });
        }
        
        // Right edge
        for (let y = margin; y < canvas.height - margin; y += spacing) {
            this.spawnPoints.push({ x: canvas.width + 50, y });
        }
    }
    
    generatePlatforms() {
        // Clear existing platforms
        this.platforms = [];
        
        // Generate main ground platform
        this.platforms.push({
            x: 0,
            y: canvas.height - 50,
            width: canvas.width,
            height: 50
        });
        
        // Generate floating platforms based on level
        const platformCount = 3 + Math.floor(this.currentLevel / 2);
        const minWidth = 100;
        const maxWidth = 300;
        const minHeight = 20;
        const maxHeight = 30;
        
        for (let i = 0; i < platformCount; i++) {
            const width = minWidth + Math.random() * (maxWidth - minWidth);
            const height = minHeight + Math.random() * (maxHeight - minHeight);
            const x = Math.random() * (canvas.width - width);
            const y = 100 + Math.random() * (canvas.height - 300);
            
            this.platforms.push({ x, y, width, height });
        }
    }
    
    update() {
        this.spawnEnemies();
        this.checkLevelCompletion();
    }
    
    spawnEnemies() {
        const now = Date.now();
        if (now - this.lastSpawnTime < this.enemySpawnRate) return;
        
        const enemyCount = gameManager.gameObjects.zombies.length;
        const maxEnemies = this.enemiesPerLevel + Math.floor(this.currentLevel * 1.5);
        
        if (enemyCount < maxEnemies) {
            const spawnPoint = this.getRandomSpawnPoint();
            
            if (this.isBossLevel()) {
                this.spawnBoss(spawnPoint);
            } else {
                this.spawnZombie(spawnPoint);
            }
            
            this.lastSpawnTime = now;
        }
    }
    
    spawnZombie(spawnPoint) {
        const zombie = new Zombie(spawnPoint.x, spawnPoint.y);
        zombie.health *= 1 + (this.currentLevel - 1) * 0.2;
        zombie.damage *= 1 + (this.currentLevel - 1) * 0.1;
        zombie.speed *= 1 + (this.currentLevel - 1) * 0.05;
        gameManager.gameObjects.zombies.push(zombie);
    }
    
    spawnBoss(spawnPoint) {
        const boss = new Necromancer(spawnPoint.x, spawnPoint.y);
        boss.health *= 1 + (this.currentLevel - 1) * 0.3;
        boss.damage *= 1 + (this.currentLevel - 1) * 0.2;
        gameManager.gameObjects.zombies.push(boss);
    }
    
    spawnPowerUp() {
        if (Math.random() > this.powerUpChance) return;
        
        const x = Math.random() * (canvas.width - 40) + 20;
        const y = Math.random() * (canvas.height - 40) + 20;
        const powerUp = new PowerUp(x, y);
        gameManager.gameObjects.powerups.push(powerUp);
    }
    
    getRandomSpawnPoint() {
        const index = Math.floor(Math.random() * this.spawnPoints.length);
        return this.spawnPoints[index];
    }
    
    checkLevelCompletion() {
        const enemyCount = gameManager.gameObjects.zombies.length;
        const defeatedCount = gameManager.scoreManager.zombiesDefeated;
        
        if (enemyCount === 0 && defeatedCount >= this.enemiesPerLevel) {
            this.completeLevel();
        }
    }
    
    completeLevel() {
        this.currentLevel++;
        this.enemiesPerLevel += 2;
        this.enemySpawnRate = Math.max(500, this.enemySpawnRate - 100);
        this.powerUpChance = Math.min(0.3, this.powerUpChance + 0.02);
        
        // Generate new level layout
        this.generatePlatforms();
        
        // Spawn power-ups for the new level
        this.spawnPowerUp();
        
        // Update UI
        gameManager.uiManager.showLevelComplete(this.currentLevel);
        
        // Play level complete sound
        audioManager.playSound('levelup');
    }
    
    isBossLevel() {
        return this.bossLevels.includes(this.currentLevel);
    }
    
    render() {
        // Render platforms
        ctx.fillStyle = '#666666';
        this.platforms.forEach(platform => {
            ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        });
    }
}

// Export singleton instance
export const levelManager = new LevelManager();
