// UI system for managing game interface and HUD
export class UIManager {
    constructor() {
        this.elements = {};
        this.notifications = [];
        this.isMenuOpen = false;
        this.isPaused = false;
        this.showFPS = false;
        this.showDebug = false;
        this.lastFrameTime = 0;
        this.frameCount = 0;
        this.currentFPS = 0;
    }
    
    initialize() {
        this.createHUD();
        this.createPauseMenu();
        this.createMainMenu();
        this.createSettingsMenu();
        this.setupEventListeners();
        return Promise.resolve();
    }
    
    createHUD() {
        // Score display
        this.elements.score = document.createElement('div');
        this.elements.score.className = 'hud-score';
        document.body.appendChild(this.elements.score);
        
        // Health bar
        this.elements.healthBar = document.createElement('div');
        this.elements.healthBar.className = 'hud-health-bar';
        document.body.appendChild(this.elements.healthBar);
        
        // Level display
        this.elements.level = document.createElement('div');
        this.elements.level.className = 'hud-level';
        document.body.appendChild(this.elements.level);
        
        // Combo meter
        this.elements.combo = document.createElement('div');
        this.elements.combo.className = 'hud-combo';
        document.body.appendChild(this.elements.combo);
        
        // Debug info
        this.elements.debug = document.createElement('div');
        this.elements.debug.className = 'hud-debug';
        this.elements.debug.style.display = 'none';
        document.body.appendChild(this.elements.debug);
    }
    
    createPauseMenu() {
        this.elements.pauseMenu = document.createElement('div');
        this.elements.pauseMenu.className = 'pause-menu';
        this.elements.pauseMenu.style.display = 'none';
        
        this.elements.pauseMenu.innerHTML = `
            <div class="menu-content">
                <h2>Paused</h2>
                <button class="resume-button">Resume</button>
                <button class="settings-button">Settings</button>
                <button class="quit-button">Quit to Menu</button>
            </div>
        `;
        
        document.body.appendChild(this.elements.pauseMenu);
    }
    
    createMainMenu() {
        this.elements.mainMenu = document.createElement('div');
        this.elements.mainMenu.className = 'main-menu';
        
        this.elements.mainMenu.innerHTML = `
            <div class="menu-content">
                <h1>Light Rogue</h1>
                <button class="play-button">Play</button>
                <button class="tutorial-button">Tutorial</button>
                <button class="settings-button">Settings</button>
                <button class="achievements-button">Achievements</button>
                <button class="credits-button">Credits</button>
            </div>
        `;
        
        document.body.appendChild(this.elements.mainMenu);
    }
    
    createSettingsMenu() {
        this.elements.settingsMenu = document.createElement('div');
        this.elements.settingsMenu.className = 'settings-menu';
        this.elements.settingsMenu.style.display = 'none';
        
        this.elements.settingsMenu.innerHTML = `
            <div class="menu-content">
                <h2>Settings</h2>
                <div class="settings-section">
                    <h3>Audio</h3>
                    <div class="setting-item">
                        <label>Master Volume</label>
                        <input type="range" class="master-volume" min="0" max="100" value="100">
                    </div>
                    <div class="setting-item">
                        <label>Music Volume</label>
                        <input type="range" class="music-volume" min="0" max="100" value="70">
                    </div>
                    <div class="setting-item">
                        <label>SFX Volume</label>
                        <input type="range" class="sfx-volume" min="0" max="100" value="80">
                    </div>
                </div>
                <div class="settings-section">
                    <h3>Graphics</h3>
                    <div class="setting-item">
                        <label>Screen Shake</label>
                        <input type="checkbox" class="screen-shake" checked>
                    </div>
                    <div class="setting-item">
                        <label>Show FPS</label>
                        <input type="checkbox" class="show-fps">
                    </div>
                    <div class="setting-item">
                        <label>Particle Effects</label>
                        <input type="checkbox" class="particle-effects" checked>
                    </div>
                </div>
                <div class="settings-section">
                    <h3>Controls</h3>
                    <button class="rebind-controls">Rebind Controls</button>
                </div>
                <button class="close-button">Close</button>
            </div>
        `;
        
        document.body.appendChild(this.elements.settingsMenu);
    }
    
    setupEventListeners() {
        // Pause menu buttons
        this.elements.pauseMenu.querySelector('.resume-button').onclick = () => this.resumeGame();
        this.elements.pauseMenu.querySelector('.settings-button').onclick = () => this.showSettings();
        this.elements.pauseMenu.querySelector('.quit-button').onclick = () => this.quitToMenu();
        
        // Main menu buttons
        this.elements.mainMenu.querySelector('.play-button').onclick = () => this.startGame();
        this.elements.mainMenu.querySelector('.tutorial-button').onclick = () => this.showTutorial();
        this.elements.mainMenu.querySelector('.settings-button').onclick = () => this.showSettings();
        this.elements.mainMenu.querySelector('.achievements-button').onclick = () => this.showAchievements();
        this.elements.mainMenu.querySelector('.credits-button').onclick = () => this.showCredits();
        
        // Settings menu
        const settingsMenu = this.elements.settingsMenu;
        settingsMenu.querySelector('.master-volume').onchange = (e) => this.updateVolume('master', e.target.value);
        settingsMenu.querySelector('.music-volume').onchange = (e) => this.updateVolume('music', e.target.value);
        settingsMenu.querySelector('.sfx-volume').onchange = (e) => this.updateVolume('sfx', e.target.value);
        settingsMenu.querySelector('.screen-shake').onchange = (e) => this.toggleScreenShake(e.target.checked);
        settingsMenu.querySelector('.show-fps').onchange = (e) => this.toggleFPS(e.target.checked);
        settingsMenu.querySelector('.particle-effects').onchange = (e) => this.toggleParticles(e.target.checked);
        settingsMenu.querySelector('.rebind-controls').onclick = () => this.showControlsRebinding();
        settingsMenu.querySelector('.close-button').onclick = () => this.hideSettings();
    }
    
    update() {
        this.updateFPS();
        this.updateHUD();
        this.updateNotifications();
    }
    
    updateFPS() {
        const now = performance.now();
        const delta = now - this.lastFrameTime;
        
        this.frameCount++;
        
        if (delta >= 1000) {
            this.currentFPS = Math.round((this.frameCount * 1000) / delta);
            this.frameCount = 0;
            this.lastFrameTime = now;
        }
        
        if (this.showFPS) {
            this.elements.debug.textContent = `FPS: ${this.currentFPS}`;
        }
    }
    
    updateHUD() {
        if (!gameManager.player) return;
        
        // Update score
        this.elements.score.textContent = `Score: ${gameManager.scoreManager.score}`;
        
        // Update health bar
        const healthPercent = (gameManager.player.health / gameManager.player.maxHealth) * 100;
        this.elements.healthBar.style.width = `${healthPercent}%`;
        this.elements.healthBar.style.backgroundColor = this.getHealthColor(healthPercent);
        
        // Update level
        this.elements.level.textContent = `Level ${gameManager.levelManager.currentLevel}`;
        
        // Update combo
        if (gameManager.scoreManager.combo > 1) {
            this.elements.combo.textContent = `${gameManager.scoreManager.combo}x Combo!`;
            this.elements.combo.style.display = 'block';
        } else {
            this.elements.combo.style.display = 'none';
        }
    }
    
    updateNotifications() {
        this.notifications = this.notifications.filter(notification => {
            const elapsed = Date.now() - notification.startTime;
            if (elapsed >= notification.duration) {
                notification.element.remove();
                return false;
            }
            return true;
        });
    }
    
    showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        this.notifications.push({
            element: notification,
            startTime: Date.now(),
            duration: duration
        });
        
        // Animate in
        setTimeout(() => notification.classList.add('show'), 100);
    }
    
    getHealthColor(percent) {
        if (percent > 60) return '#2ecc71';
        if (percent > 30) return '#f1c40f';
        return '#e74c3c';
    }
    
    togglePause() {
        if (this.isPaused) {
            this.resumeGame();
        } else {
            this.pauseGame();
        }
    }
    
    pauseGame() {
        this.isPaused = true;
        this.elements.pauseMenu.style.display = 'flex';
        gameManager.pause();
    }
    
    resumeGame() {
        this.isPaused = false;
        this.elements.pauseMenu.style.display = 'none';
        gameManager.resume();
    }
    
    showMainMenu() {
        this.elements.mainMenu.style.display = 'flex';
        this.elements.pauseMenu.style.display = 'none';
        this.elements.settingsMenu.style.display = 'none';
    }
    
    hideMainMenu() {
        this.elements.mainMenu.style.display = 'none';
    }
    
    showSettings() {
        this.elements.settingsMenu.style.display = 'flex';
    }
    
    hideSettings() {
        this.elements.settingsMenu.style.display = 'none';
    }
    
    showGameOver() {
        const gameOver = document.createElement('div');
        gameOver.className = 'game-over';
        
        gameOver.innerHTML = `
            <div class="menu-content">
                <h2>Game Over</h2>
                <div class="stats">
                    <p>Score: ${gameManager.scoreManager.score}</p>
                    <p>Level: ${gameManager.levelManager.currentLevel}</p>
                    <p>Zombies Defeated: ${gameManager.scoreManager.zombiesDefeated}</p>
                    <p>Max Combo: ${gameManager.scoreManager.maxCombo}x</p>
                </div>
                <button class="retry-button">Try Again</button>
                <button class="menu-button">Main Menu</button>
            </div>
        `;
        
        document.body.appendChild(gameOver);
        
        gameOver.querySelector('.retry-button').onclick = () => {
            gameOver.remove();
            gameManager.startNewGame();
        };
        
        gameOver.querySelector('.menu-button').onclick = () => {
            gameOver.remove();
            this.quitToMenu();
        };
    }
    
    showLevelComplete(level) {
        this.showNotification(`Level ${level} Complete!`, 'success', 2000);
    }
    
    showAchievements() {
        gameManager.achievementManager.showAchievementsMenu();
    }
    
    showCredits() {
        const credits = document.createElement('div');
        credits.className = 'credits';
        
        credits.innerHTML = `
            <div class="menu-content">
                <h2>Credits</h2>
                <div class="credits-content">
                    <h3>Development Team</h3>
                    <p>Game Design & Programming</p>
                    <p>Art & Animation</p>
                    <p>Sound & Music</p>
                    
                    <h3>Special Thanks</h3>
                    <p>Our amazing community</p>
                    <p>Beta testers</p>
                    <p>Family & Friends</p>
                </div>
                <button class="close-button">Close</button>
            </div>
        `;
        
        document.body.appendChild(credits);
        
        credits.querySelector('.close-button').onclick = () => credits.remove();
    }
    
    showControlsRebinding() {
        // Implementation for control rebinding UI
    }
    
    quitToMenu() {
        gameManager.reset();
        this.showMainMenu();
    }
}

// Export singleton instance
export const uiManager = new UIManager();
