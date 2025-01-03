// Core game manager responsible for game state and lifecycle
import { Player } from '../entities/Player.js';
import { dataWarehouse } from '../datastore/DataWarehouse.js';
import { AudioManager } from './AudioManager.js';
import { UIManager } from './UIManager.js';
import { LevelManager } from './LevelManager.js';
import { InputManager } from './InputManager.js';
import { ScoreManager } from './ScoreManager.js';
import { AchievementManager } from './AchievementManager.js';

class GameManager {
    constructor() {
        this.isRunning = false;
        this.isPaused = false;
        this.sessionId = null;
        this.gameStartTime = 0;
        this.currentLevel = 1;
        
        // Managers
        this.audioManager = new AudioManager();
        this.uiManager = new UIManager();
        this.levelManager = new LevelManager();
        this.inputManager = new InputManager();
        this.scoreManager = new ScoreManager();
        this.achievementManager = new AchievementManager();
        
        // Game objects
        this.player = null;
        this.gameObjects = {
            zombies: [],
            bullets: [],
            powerups: [],
            effects: []
        };
    }
    
    async initialize() {
        try {
            // Initialize data warehouse
            await dataWarehouse.initialize();
            
            // Generate session ID
            this.sessionId = crypto.randomUUID();
            
            // Initialize managers
            await Promise.all([
                this.audioManager.initialize(),
                this.uiManager.initialize(),
                this.levelManager.initialize(),
                this.inputManager.initialize(),
                this.scoreManager.initialize(),
                this.achievementManager.initialize()
            ]);
            
            // Load player stats
            const stats = await dataWarehouse.getPlayerStats('local_player');
            window.playerStats = stats;
            
            // Create player
            this.player = new Player(canvas.width/2, canvas.height/2);
            
            console.log('Game initialized successfully');
        } catch (error) {
            console.error('Failed to initialize game:', error);
            throw error;
        }
    }
    
    start() {
        this.isRunning = true;
        this.gameStartTime = Date.now();
        this.gameLoop();
    }
    
    pause() {
        this.isPaused = true;
        this.uiManager.showPauseMenu();
    }
    
    resume() {
        this.isPaused = false;
        this.uiManager.hidePauseMenu();
    }
    
    async handleGameOver() {
        this.isRunning = false;
        
        // Save high score and stats
        try {
            await this.scoreManager.saveScore({
                sessionId: this.sessionId,
                level: this.currentLevel,
                achievements: this.achievementManager.getUnlockedAchievements(),
                stats: this.collectGameStats()
            });
        } catch (error) {
            console.error('Failed to save score:', error);
        }
        
        this.uiManager.showGameOver();
    }
    
    collectGameStats() {
        return {
            accuracy: this.player.calculateAccuracy(),
            timePlayedMs: Date.now() - this.gameStartTime,
            zombiesKilled: this.scoreManager.zombiesDefeated,
            highestCombo: window.playerStats.highestCombo,
            levelsCompleted: this.currentLevel - 1
        };
    }
    
    gameLoop() {
        if (!this.isRunning || this.isPaused) return;
        
        this.update();
        this.render();
        
        requestAnimationFrame(() => this.gameLoop());
    }
    
    update() {
        // Update all game objects
        this.player.update();
        this.gameObjects.zombies.forEach(zombie => zombie.update());
        this.gameObjects.bullets.forEach(bullet => bullet.update());
        this.gameObjects.powerups.forEach(powerup => powerup.update());
        this.gameObjects.effects.forEach(effect => effect.update());
        
        // Check collisions
        this.checkCollisions();
        
        // Update managers
        this.levelManager.update();
        this.scoreManager.update();
        this.achievementManager.update();
    }
    
    render() {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Render all game objects
        this.levelManager.render();
        this.player.render();
        this.gameObjects.zombies.forEach(zombie => zombie.render());
        this.gameObjects.bullets.forEach(bullet => bullet.render());
        this.gameObjects.powerups.forEach(powerup => powerup.render());
        this.gameObjects.effects.forEach(effect => effect.render());
        
        // Update UI
        this.uiManager.render();
    }
    
    checkCollisions() {
        // Player-Zombie collisions
        this.gameObjects.zombies.forEach(zombie => {
            if (this.player.checkCollision(zombie)) {
                this.player.takeDamage(zombie.damage);
            }
        });
        
        // Bullet-Zombie collisions
        this.gameObjects.bullets.forEach(bullet => {
            this.gameObjects.zombies.forEach(zombie => {
                if (bullet.checkZombieCollision(zombie)) {
                    zombie.takeDamage(bullet.damage);
                    bullet.destroy();
                }
            });
        });
        
        // Player-Powerup collisions
        this.gameObjects.powerups.forEach(powerup => {
            if (this.player.checkCollision(powerup)) {
                powerup.collect(this.player);
            }
        });
    }
}

// Export singleton instance
export const gameManager = new GameManager();
