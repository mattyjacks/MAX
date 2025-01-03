// Score and achievement tracking system
import { dataWarehouse } from '../datastore/DataWarehouse.js';

export class ScoreManager {
    constructor() {
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.zombiesDefeated = 0;
        this.lastKillTime = 0;
        this.comboTimeout = 2000; // 2 seconds to maintain combo
        this.comboMultiplier = 1;
        this.scoreMultiplier = 1;
    }
    
    initialize() {
        return Promise.resolve();
    }
    
    addScore(points) {
        const now = Date.now();
        
        // Update combo
        if (now - this.lastKillTime < this.comboTimeout) {
            this.combo++;
            this.comboMultiplier = 1 + Math.floor(this.combo / 5) * 0.1; // +10% every 5 combo
        } else {
            this.combo = 1;
            this.comboMultiplier = 1;
        }
        
        // Update max combo
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        
        // Calculate final score
        const finalPoints = Math.round(points * this.comboMultiplier * this.scoreMultiplier);
        this.score += finalPoints;
        
        // Update last kill time
        this.lastKillTime = now;
        
        // Show score popup
        this.showScorePopup(finalPoints);
        
        // Check for achievements
        this.checkScoreAchievements();
        
        return finalPoints;
    }
    
    addZombieKill(zombieType = 'basic') {
        this.zombiesDefeated++;
        
        let points;
        switch(zombieType) {
            case 'boss':
                points = 1000;
                break;
            case 'special':
                points = 250;
                break;
            default:
                points = 100;
        }
        
        return this.addScore(points);
    }
    
    showScorePopup(points) {
        const scoreText = new DamageNumber(
            gameManager.player.x,
            gameManager.player.y - 40,
            `+${points}`
        );
        
        if (this.combo > 1) {
            scoreText.text += ` x${this.combo}`;
        }
        
        scoreText.color = '#FFD700';
        gameManager.gameObjects.effects.push(scoreText);
    }
    
    checkScoreAchievements() {
        const achievements = [];
        
        // Score achievements
        if (this.score >= 10000 && !this.hasAchievement('score_10k')) {
            achievements.push('score_10k');
        }
        if (this.score >= 50000 && !this.hasAchievement('score_50k')) {
            achievements.push('score_50k');
        }
        if (this.score >= 100000 && !this.hasAchievement('score_100k')) {
            achievements.push('score_100k');
        }
        
        // Combo achievements
        if (this.combo >= 10 && !this.hasAchievement('combo_10')) {
            achievements.push('combo_10');
        }
        if (this.combo >= 25 && !this.hasAchievement('combo_25')) {
            achievements.push('combo_25');
        }
        if (this.combo >= 50 && !this.hasAchievement('combo_50')) {
            achievements.push('combo_50');
        }
        
        // Kills achievements
        if (this.zombiesDefeated >= 100 && !this.hasAchievement('kills_100')) {
            achievements.push('kills_100');
        }
        if (this.zombiesDefeated >= 500 && !this.hasAchievement('kills_500')) {
            achievements.push('kills_500');
        }
        if (this.zombiesDefeated >= 1000 && !this.hasAchievement('kills_1000')) {
            achievements.push('kills_1000');
        }
        
        // Unlock new achievements
        if (achievements.length > 0) {
            gameManager.achievementManager.unlockAchievements(achievements);
        }
    }
    
    hasAchievement(id) {
        return gameManager.achievementManager.hasAchievement(id);
    }
    
    async saveScore() {
        try {
            await dataWarehouse.saveHighScore(this.score, {
                userId: 'local_player',
                gameVersion: '1.0',
                sessionId: gameManager.sessionId,
                gameMode: 'standard',
                difficulty: 'normal',
                achievements: gameManager.achievementManager.getUnlockedAchievements(),
                stats: {
                    zombiesKilled: this.zombiesDefeated,
                    maxCombo: this.maxCombo,
                    finalLevel: gameManager.levelManager.currentLevel,
                    accuracy: gameManager.player.calculateAccuracy(),
                    timePlayedMs: Date.now() - gameManager.gameStartTime
                }
            });
            
            console.log('Score saved successfully');
            return true;
        } catch (error) {
            console.error('Failed to save score:', error);
            return false;
        }
    }
    
    async getHighScores() {
        try {
            return await dataWarehouse.getHighScores({
                gameMode: 'standard',
                limit: 10
            });
        } catch (error) {
            console.error('Failed to load high scores:', error);
            return [];
        }
    }
    
    reset() {
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.zombiesDefeated = 0;
        this.lastKillTime = 0;
        this.comboMultiplier = 1;
        this.scoreMultiplier = 1;
    }
}

// Export singleton instance
export const scoreManager = new ScoreManager();
