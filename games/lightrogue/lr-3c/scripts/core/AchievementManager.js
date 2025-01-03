// Achievement system for tracking and unlocking achievements
export class AchievementManager {
    constructor() {
        this.achievements = {
            // Score achievements
            score_10k: {
                id: 'score_10k',
                name: 'Score Hunter',
                description: 'Score 10,000 points in a single game',
                icon: '🎯'
            },
            score_50k: {
                id: 'score_50k',
                name: 'Score Master',
                description: 'Score 50,000 points in a single game',
                icon: '🎯🎯'
            },
            score_100k: {
                id: 'score_100k',
                name: 'Score Legend',
                description: 'Score 100,000 points in a single game',
                icon: '🎯🎯🎯'
            },
            
            // Combo achievements
            combo_10: {
                id: 'combo_10',
                name: 'Combo Starter',
                description: 'Achieve a 10x combo',
                icon: '⚡'
            },
            combo_25: {
                id: 'combo_25',
                name: 'Combo Pro',
                description: 'Achieve a 25x combo',
                icon: '⚡⚡'
            },
            combo_50: {
                id: 'combo_50',
                name: 'Combo Master',
                description: 'Achieve a 50x combo',
                icon: '⚡⚡⚡'
            },
            
            // Kill achievements
            kills_100: {
                id: 'kills_100',
                name: 'Zombie Hunter',
                description: 'Defeat 100 zombies',
                icon: '💀'
            },
            kills_500: {
                id: 'kills_500',
                name: 'Zombie Slayer',
                description: 'Defeat 500 zombies',
                icon: '💀💀'
            },
            kills_1000: {
                id: 'kills_1000',
                name: 'Zombie Legend',
                description: 'Defeat 1,000 zombies',
                icon: '💀💀💀'
            },
            
            // Level achievements
            level_5: {
                id: 'level_5',
                name: 'Rising Star',
                description: 'Reach level 5',
                icon: '⭐'
            },
            level_10: {
                id: 'level_10',
                name: 'Veteran',
                description: 'Reach level 10',
                icon: '⭐⭐'
            },
            level_20: {
                id: 'level_20',
                name: 'Elite',
                description: 'Reach level 20',
                icon: '⭐⭐⭐'
            },
            
            // Special achievements
            no_damage: {
                id: 'no_damage',
                name: 'Untouchable',
                description: 'Complete a level without taking damage',
                icon: '🛡️'
            },
            perfect_accuracy: {
                id: 'perfect_accuracy',
                name: 'Sharpshooter',
                description: 'Achieve 100% accuracy in a level',
                icon: '🎯'
            },
            speed_run: {
                id: 'speed_run',
                name: 'Speed Demon',
                description: 'Complete a level in under 60 seconds',
                icon: '⚡'
            }
        };
        
        this.unlockedAchievements = new Set();
    }
    
    initialize() {
        this.loadUnlockedAchievements();
        return Promise.resolve();
    }
    
    loadUnlockedAchievements() {
        const saved = localStorage.getItem('unlockedAchievements');
        if (saved) {
            this.unlockedAchievements = new Set(JSON.parse(saved));
        }
    }
    
    saveUnlockedAchievements() {
        localStorage.setItem(
            'unlockedAchievements',
            JSON.stringify([...this.unlockedAchievements])
        );
    }
    
    unlockAchievement(achievementId) {
        if (this.hasAchievement(achievementId)) return false;
        
        const achievement = this.achievements[achievementId];
        if (!achievement) return false;
        
        this.unlockedAchievements.add(achievementId);
        this.saveUnlockedAchievements();
        this.showAchievementNotification(achievement);
        
        return true;
    }
    
    unlockAchievements(achievementIds) {
        achievementIds.forEach(id => this.unlockAchievement(id));
    }
    
    hasAchievement(achievementId) {
        return this.unlockedAchievements.has(achievementId);
    }
    
    getUnlockedAchievements() {
        return [...this.unlockedAchievements];
    }
    
    getAchievementProgress() {
        const total = Object.keys(this.achievements).length;
        const unlocked = this.unlockedAchievements.size;
        return {
            total,
            unlocked,
            percentage: (unlocked / total) * 100
        };
    }
    
    showAchievementNotification(achievement) {
        const notification = document.createElement('div');
        notification.className = 'achievement-notification';
        notification.innerHTML = `
            <div class="achievement-icon">${achievement.icon}</div>
            <div class="achievement-details">
                <div class="achievement-name">${achievement.name}</div>
                <div class="achievement-description">${achievement.description}</div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        // Remove after animation
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 500);
        }, 3000);
        
        // Play achievement sound
        audioManager.playSound('achievement');
    }
    
    showAchievementsMenu() {
        const container = document.createElement('div');
        container.className = 'achievements-menu';
        
        const progress = this.getAchievementProgress();
        
        container.innerHTML = `
            <div class="achievements-header">
                <h2>Achievements</h2>
                <div class="achievements-progress">
                    ${progress.unlocked}/${progress.total} (${progress.percentage.toFixed(1)}%)
                </div>
            </div>
            <div class="achievements-grid">
                ${Object.values(this.achievements).map(achievement => `
                    <div class="achievement-card ${this.hasAchievement(achievement.id) ? 'unlocked' : 'locked'}">
                        <div class="achievement-icon">${achievement.icon}</div>
                        <div class="achievement-name">${achievement.name}</div>
                        <div class="achievement-description">${achievement.description}</div>
                    </div>
                `).join('')}
            </div>
            <button class="close-button" onclick="this.parentElement.remove()">Close</button>
        `;
        
        document.body.appendChild(container);
    }
}

// Export singleton instance
export const achievementManager = new AchievementManager();
