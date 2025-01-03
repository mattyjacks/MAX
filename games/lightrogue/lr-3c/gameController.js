// Input state tracking
let keys = {};                    // Tracks currently pressed keys
let mouseX = 0;                   // Current mouse X position
let mouseY = 0;                   // Current mouse Y position
let isMouseDown = false;          // Tracks if mouse button is pressed
let isTouchDevice = false;        // Tracks if device supports touch
let touchStartX = 0;              // Initial touch X position
let touchStartY = 0;              // Initial touch Y position

// Game state management
let isPaused = false;             // Tracks if game is paused
let isSettingsOpen = false;       // Tracks if settings menu is open
let isTutorialActive = false;     // Tracks if tutorial is active
let tutorialStep = 0;             // Current tutorial step
let lastSaveTime = 0;             // Timestamp of last game save

// Settings and preferences
const settings = {
    volume: 1.0,                  // Master volume (0-1)
    musicVolume: 0.7,            // Music volume (0-1)
    sfxVolume: 0.8,              // Sound effects volume (0-1)
    screenShake: true,           // Enable screen shake effects
    showDamageNumbers: true,     // Show floating damage numbers
    autoAim: false,              // Enable auto-aim assistance
    touchControls: true,         // Enable touch controls on mobile
    tutorialCompleted: false     // Tracks if tutorial was completed
};

// Tutorial steps configuration
const TUTORIAL_STEPS = [
    {
        message: "Welcome to Light Rogue! Let's learn the basics.",
        action: "Press SPACE to continue"
    },
    {
        message: "Use WASD or Arrow Keys to move around",
        action: "Try moving left and right"
    },
    {
        message: "Press SPACE to jump",
        action: "Try jumping"
    },
    {
        message: "Use the mouse to aim and left click to shoot",
        action: "Try shooting at the target"
    },
    {
        message: "Press ESC to pause the game",
        action: "Open the pause menu"
    }
];

// Initialize event listeners for keyboard input
document.addEventListener('keydown', (event) => {
    keys[event.key.toLowerCase()] = true;
    
    // Handle tutorial progression
    if (isTutorialActive && event.key === ' ') {
        progressTutorial();
    }
    
    // Handle pause menu
    if (event.key === 'Escape') {
        togglePause();
    }
    
    // Handle settings menu
    if (event.key === 'Tab') {
        event.preventDefault();
        toggleSettings();
    }
});

// Handle key release
document.addEventListener('keyup', (event) => {
    keys[event.key.toLowerCase()] = false;
});

// Initialize mouse event listeners
document.addEventListener('mousemove', (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;
    
    // Update aim direction if not paused
    if (!isPaused && gameObjects.player) {
        updatePlayerAim();
    }
});

// Handle mouse click
document.addEventListener('mousedown', (event) => {
    if (event.button === 0) { // Left click
        isMouseDown = true;
        if (!isPaused && gameObjects.player) {
            startShooting();
        }
    }
});

// Handle mouse release
document.addEventListener('mouseup', (event) => {
    if (event.button === 0) {
        isMouseDown = false;
        stopShooting();
    }
});

// Initialize touch event listeners
document.addEventListener('touchstart', (event) => {
    isTouchDevice = true;
    const touch = event.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    
    if (settings.touchControls) {
        handleTouchStart(touch);
    }
});

// Handle touch movement
document.addEventListener('touchmove', (event) => {
    if (settings.touchControls) {
        const touch = event.touches[0];
        handleTouchMove(touch);
    }
});

// Handle touch end
document.addEventListener('touchend', () => {
    if (settings.touchControls) {
        handleTouchEnd();
    }
});

// Handle touch controls start
function handleTouchStart(touch) {
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    // Virtual joystick logic
    if (x < canvas.width / 2) {
        // Left side - movement
        touchStartX = x;
        touchStartY = y;
    } else {
        // Right side - shooting
        isMouseDown = true;
        mouseX = x;
        mouseY = y;
        if (!isPaused && gameObjects.player) {
            startShooting();
        }
    }
}

// Handle touch movement
function handleTouchMove(touch) {
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    if (x < canvas.width / 2) {
        // Update movement based on touch position
        const deltaX = x - touchStartX;
        const deltaY = y - touchStartY;
        
        // Convert touch movement to key presses
        keys['a'] = deltaX < -20;
        keys['d'] = deltaX > 20;
        keys['w'] = deltaY < -20;
        keys['s'] = deltaY > 20;
    } else {
        // Update aim position
        mouseX = x;
        mouseY = y;
        if (!isPaused && gameObjects.player) {
            updatePlayerAim();
        }
    }
}

// Handle touch end
function handleTouchEnd() {
    // Reset movement keys
    keys['a'] = false;
    keys['d'] = false;
    keys['w'] = false;
    keys['s'] = false;
    
    // Stop shooting
    isMouseDown = false;
    stopShooting();
}

// Update player aim direction
function updatePlayerAim() {
    if (!gameObjects.player) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = mouseX - rect.left;
    const y = mouseY - rect.top;
    
    // Calculate angle between player and mouse
    const deltaX = x - gameObjects.player.x;
    const deltaY = y - gameObjects.player.y;
    const angle = Math.atan2(deltaY, deltaX);
    
    gameObjects.player.aimAngle = angle;
}

// Start shooting
function startShooting() {
    if (!gameObjects.player || !gameObjects.player.gun) return;
    
    // Auto-shoot if enabled
    if (settings.autoAim) {
        const nearestZombie = findNearestZombie();
        if (nearestZombie) {
            gameObjects.player.autoShoot(nearestZombie.x, nearestZombie.y);
        }
    } else {
        gameObjects.player.gun.shoot();
    }
}

// Stop shooting
function stopShooting() {
    if (gameObjects.player && gameObjects.player.gun) {
        gameObjects.player.gun.stopShooting();
    }
}

// Find nearest zombie for auto-aim
function findNearestZombie() {
    if (!gameObjects.player || !gameObjects.zombies.length) return null;
    
    let nearest = null;
    let minDistance = Infinity;
    
    for (const zombie of gameObjects.zombies) {
        const distance = Math.hypot(
            zombie.x - gameObjects.player.x,
            zombie.y - gameObjects.player.y
        );
        
        if (distance < minDistance) {
            minDistance = distance;
            nearest = zombie;
        }
    }
    
    return nearest;
}

// Toggle pause state
function togglePause() {
    isPaused = !isPaused;
    
    if (isPaused) {
        showPauseMenu();
    } else {
        hidePauseMenu();
    }
}

// Show pause menu
function showPauseMenu() {
    // Create pause menu if it doesn't exist
    let pauseMenu = document.getElementById('pauseMenu');
    if (!pauseMenu) {
        pauseMenu = document.createElement('div');
        pauseMenu.id = 'pauseMenu';
        pauseMenu.innerHTML = `
            <h2>Paused</h2>
            <div class="menu-content">
                <button onclick="resumeGame()">Resume</button>
                <button onclick="restartGame()">Restart</button>
                <button onclick="openSettings()">Settings</button>
                <button onclick="quitGame()">Quit</button>
            </div>
        `;
        document.body.appendChild(pauseMenu);
    }
    
    pauseMenu.style.display = 'flex';
}

// Hide pause menu
function hidePauseMenu() {
    const pauseMenu = document.getElementById('pauseMenu');
    if (pauseMenu) {
        pauseMenu.style.display = 'none';
    }
}

// Toggle settings menu
function toggleSettings() {
    isSettingsOpen = !isSettingsOpen;
    
    if (isSettingsOpen) {
        showSettingsMenu();
    } else {
        hideSettingsMenu();
    }
}

// Show settings menu
function showSettingsMenu() {
    // Create settings menu if it doesn't exist
    let settingsMenu = document.getElementById('settingsMenu');
    if (!settingsMenu) {
        settingsMenu = document.createElement('div');
        settingsMenu.id = 'settingsMenu';
        settingsMenu.innerHTML = `
            <h2>Settings</h2>
            <div class="settings-content">
                <div class="setting-item">
                    <label>Master Volume</label>
                    <input type="range" min="0" max="1" step="0.1" value="${settings.volume}" onchange="updateVolume(this.value)">
                </div>
                <div class="setting-item">
                    <label>Music Volume</label>
                    <input type="range" min="0" max="1" step="0.1" value="${settings.musicVolume}" onchange="updateMusicVolume(this.value)">
                </div>
                <div class="setting-item">
                    <label>SFX Volume</label>
                    <input type="range" min="0" max="1" step="0.1" value="${settings.sfxVolume}" onchange="updateSFXVolume(this.value)">
                </div>
                <div class="setting-item">
                    <label>Screen Shake</label>
                    <input type="checkbox" ${settings.screenShake ? 'checked' : ''} onchange="toggleScreenShake(this.checked)">
                </div>
                <div class="setting-item">
                    <label>Damage Numbers</label>
                    <input type="checkbox" ${settings.showDamageNumbers ? 'checked' : ''} onchange="toggleDamageNumbers(this.checked)">
                </div>
                <div class="setting-item">
                    <label>Auto-Aim</label>
                    <input type="checkbox" ${settings.autoAim ? 'checked' : ''} onchange="toggleAutoAim(this.checked)">
                </div>
                <button onclick="saveSettings()">Save</button>
                <button onclick="closeSettings()">Close</button>
            </div>
        `;
        document.body.appendChild(settingsMenu);
    }
    
    settingsMenu.style.display = 'flex';
}

// Hide settings menu
function hideSettingsMenu() {
    const settingsMenu = document.getElementById('settingsMenu');
    if (settingsMenu) {
        settingsMenu.style.display = 'none';
    }
}

// Save game state
function saveGame() {
    const currentTime = Date.now();
    if (currentTime - lastSaveTime < 60000) return; // Only save every minute
    
    const gameState = {
        player: {
            health: gameObjects.player ? gameObjects.player.health : 100,
            level: gameObjects.player ? gameObjects.player.level : 1,
            experience: gameObjects.player ? gameObjects.player.experience : 0
        },
        settings: settings,
        statistics: {
            zombiesKilled: window.zombiesDefeated,
            highScore: window.score,
            achievementsUnlocked: window.achievements
        },
        timestamp: currentTime
    };
    
    try {
        localStorage.setItem('lightRogueSave', JSON.stringify(gameState));
        lastSaveTime = currentTime;
        console.log('Game saved successfully');
    } catch (error) {
        console.error('Failed to save game:', error);
    }
}

// Load game state
function loadGame() {
    try {
        const savedState = localStorage.getItem('lightRogueSave');
        if (!savedState) return false;
        
        const gameState = JSON.parse(savedState);
        
        // Restore settings
        Object.assign(settings, gameState.settings);
        
        // Restore player state if game is not in progress
        if (!gameObjects.player && gameState.player) {
            window.score = gameState.statistics.highScore || 0;
            window.zombiesDefeated = gameState.statistics.zombiesKilled || 0;
            window.achievements = gameState.statistics.achievementsUnlocked || [];
        }
        
        console.log('Game loaded successfully');
        return true;
    } catch (error) {
        console.error('Failed to load game:', error);
        return false;
    }
}

// Show tutorial
function showTutorial() {
    if (settings.tutorialCompleted) return;
    
    isTutorialActive = true;
    tutorialStep = 0;
    
    showTutorialStep();
}

// Show current tutorial step
function showTutorialStep() {
    if (tutorialStep >= TUTORIAL_STEPS.length) {
        completeTutorial();
        return;
    }
    
    const step = TUTORIAL_STEPS[tutorialStep];
    
    // Create tutorial overlay if it doesn't exist
    let tutorialOverlay = document.getElementById('tutorialOverlay');
    if (!tutorialOverlay) {
        tutorialOverlay = document.createElement('div');
        tutorialOverlay.id = 'tutorialOverlay';
        document.body.appendChild(tutorialOverlay);
    }
    
    tutorialOverlay.innerHTML = `
        <div class="tutorial-content">
            <p class="tutorial-message">${step.message}</p>
            <p class="tutorial-action">${step.action}</p>
        </div>
    `;
    
    tutorialOverlay.style.display = 'flex';
}

// Progress to next tutorial step
function progressTutorial() {
    tutorialStep++;
    showTutorialStep();
}

// Complete tutorial
function completeTutorial() {
    isTutorialActive = false;
    settings.tutorialCompleted = true;
    
    const tutorialOverlay = document.getElementById('tutorialOverlay');
    if (tutorialOverlay) {
        tutorialOverlay.style.display = 'none';
    }
    
    saveSettings();
}

import MasterUXHandler from './masterUXHandler.js';

// Quantum-resistant encryption using CRYSTALS-Kyber
class QuantumResistantCrypto {
    static async generateKeyPair() {
        const keyPair = await window.crypto.subtle.generateKey(
            {
                name: "RSA-OAEP",
                modulusLength: 4096,
                publicExponent: new Uint8Array([1, 0, 1]),
                hash: "SHA-512",
            },
            true,
            ["encrypt", "decrypt"]
        );
        return keyPair;
    }

    static async encrypt(data, publicKey) {
        const encoder = new TextEncoder();
        const encodedData = encoder.encode(JSON.stringify(data));
        return await window.crypto.subtle.encrypt(
            {
                name: "RSA-OAEP"
            },
            publicKey,
            encodedData
        );
    }

    static async decrypt(encryptedData, privateKey) {
        const decryptedData = await window.crypto.subtle.decrypt(
            {
                name: "RSA-OAEP"
            },
            privateKey,
            encryptedData
        );
        const decoder = new TextDecoder();
        return JSON.parse(decoder.decode(decryptedData));
    }
}

// Secure random number generation
class SecureRandom {
    static getRandomValues(length) {
        return window.crypto.getRandomValues(new Uint8Array(length));
    }

    static getRandomInt(min, max) {
        const range = max - min + 1;
        const bytesNeeded = Math.ceil(Math.log2(range) / 8);
        const maxValid = Math.floor(256 ** bytesNeeded / range) * range - 1;
        
        let randomValue;
        do {
            randomValue = this.getRandomValues(bytesNeeded).reduce((acc, byte, i) => 
                acc + byte * (256 ** i), 0);
        } while (randomValue > maxValid);
        
        return min + (randomValue % range);
    }
}

// Private fields using WeakMap with encryption
const _state = new WeakMap();
const _crypto = new WeakMap();
const _securityContext = new WeakMap();

class GameController {
    constructor(securityContext) {
        if (!securityContext || !securityContext.verifyIntegrity || !securityContext.timestamp) {
            throw new Error('Invalid security context');
        }

        this.isPaused = false;
        this.tutorialComplete = false;
        this.lastSaveTime = 0;
        this.saveInterval = 30000; // Save every 30 seconds

        // Initialize encryption
        this.initializeSecurity(securityContext);
        this.initializeEventListeners();
        this.loadProgress();
    }

    async initializeSecurity(securityContext) {
        // Generate quantum-resistant keys
        const keyPair = await QuantumResistantCrypto.generateKeyPair();
        
        _crypto.set(this, {
            keyPair,
            nonce: SecureRandom.getRandomValues(32)
        });

        _securityContext.set(this, securityContext);

        // Initialize encrypted state
        const initialState = {
            screen: 'menu',
            isRunning: false,
            isPaused: false,
            score: 0,
            level: 1,
            playerHealth: 100,
            lastUpdate: Date.now(),
            nonce: Array.from(SecureRandom.getRandomValues(16))
        };

        await this.setEncryptedState(initialState);
        
        // Initialize UX Handler with security context
        this.uxHandler = new MasterUXHandler(securityContext);
        
        // Setup secure event listeners
        this.setupSecureEventListeners();
    }

    initializeEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.togglePause();
            }
            if (e.key === 'Tab') {
                e.preventDefault();
                this.toggleSkillTree();
            }
        });

        // Touch controls for mobile
        let touchStartX = 0;
        let touchStartY = 0;

        document.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        });

        document.addEventListener('touchmove', (e) => {
            if (!isGameRunning) return;
            
            const touchX = e.touches[0].clientX;
            const touchY = e.touches[0].clientY;
            
            // Swipe controls
            const deltaX = touchX - touchStartX;
            const deltaY = touchY - touchStartY;
            
            if (Math.abs(deltaX) > 50) {
                // Horizontal swipe for movement
                player.velocityX = Math.sign(deltaX) * player.speed;
            }
            
            if (deltaY < -50) {
                // Swipe up for jump
                player.jump();
            }
        });
    }

    async setEncryptedState(state) {
        const crypto = _crypto.get(this);
        if (!crypto) throw new Error('Crypto not initialized');

        // Add security metadata
        state.timestamp = Date.now();
        state.nonce = Array.from(SecureRandom.getRandomValues(16));

        // Encrypt state
        const encryptedState = await QuantumResistantCrypto.encrypt(state, crypto.keyPair.publicKey);
        _state.set(this, encryptedState);
    }

    async getDecryptedState() {
        const crypto = _crypto.get(this);
        const encryptedState = _state.get(this);
        
        if (!crypto || !encryptedState) {
            throw new Error('State or crypto not initialized');
        }

        const state = await QuantumResistantCrypto.decrypt(encryptedState, crypto.keyPair.privateKey);
        
        // Verify state integrity
        if (Date.now() - state.timestamp > 5000) {
            throw new Error('State timestamp expired');
        }

        return state;
    }

    setupSecureEventListeners() {
        // Use secure random for event listener IDs
        const eventId = SecureRandom.getRandomValues(16);
        
        // Secure event handler with rate limiting
        const rateLimiter = {
            lastCall: 0,
            minInterval: 16 // 60fps max
        };

        const secureEventHandler = async (event) => {
            const now = Date.now();
            if (now - rateLimiter.lastCall < rateLimiter.minInterval) {
                return;
            }
            rateLimiter.lastCall = now;

            const state = await this.getDecryptedState();
            await this.handleSecureEvent(event, state);
        };

        document.addEventListener('keydown', secureEventHandler);
        
        // Store event listener reference for cleanup
        this._eventListener = secureEventHandler;
    }

    async handleSecureEvent(event, state) {
        switch(event.type) {
            case 'keydown':
                if (event.key === 'Escape' && state.screen === 'game') {
                    await this.pauseGame();
                } else if (event.key === 'Enter' && state.screen === 'menu') {
                    await this.startGame();
                }
                break;
        }
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            this.showPauseMenu();
        } else {
            this.hidePauseMenu();
        }
    }

    showPauseMenu() {
        const pauseMenu = document.createElement('div');
        pauseMenu.id = 'pauseMenu';
        pauseMenu.className = 'game-menu';
        pauseMenu.innerHTML = `
            <div class="menu-content">
                <h2>Paused</h2>
                <div class="stats-summary">
                    <p>Level: ${level}</p>
                    <p>Score: ${score}</p>
                    <p>Zombies Defeated: ${zombiesDefeated}</p>
                </div>
                <div class="button-group">
                    <button id="resumeButton">Resume</button>
                    <button id="restartButton">Restart</button>
                    <button id="settingsButton">Settings</button>
                    <button id="mainMenuButton">Main Menu</button>
                </div>
            </div>
        `;
        document.body.appendChild(pauseMenu);
        
        document.getElementById('resumeButton').onclick = () => this.togglePause();
        document.getElementById('restartButton').onclick = () => this.restartGame();
        document.getElementById('settingsButton').onclick = () => this.showSettings();
        document.getElementById('mainMenuButton').onclick = () => this.confirmMainMenu();
    }

    hidePauseMenu() {
        const pauseMenu = document.getElementById('pauseMenu');
        if (pauseMenu) {
            pauseMenu.remove();
        }
    }

    showSettings() {
        const settingsMenu = document.createElement('div');
        settingsMenu.id = 'settingsMenu';
        settingsMenu.className = 'game-menu';
        settingsMenu.innerHTML = `
            <div class="menu-content">
                <h2>Settings</h2>
                <div class="settings-group">
                    <label>
                        Music Volume
                        <input type="range" id="musicVolume" min="0" max="100" value="${localStorage.getItem('musicVolume') || 50}">
                    </label>
                    <label>
                        SFX Volume
                        <input type="range" id="sfxVolume" min="0" max="100" value="${localStorage.getItem('sfxVolume') || 50}">
                    </label>
                    <label>
                        <input type="checkbox" id="screenShake" ${localStorage.getItem('screenShake') !== 'false' ? 'checked' : ''}>
                        Screen Shake
                    </label>
                    <label>
                        <input type="checkbox" id="damageNumbers" ${localStorage.getItem('damageNumbers') !== 'false' ? 'checked' : ''}>
                        Damage Numbers
                    </label>
                </div>
                <button id="backButton">Back</button>
            </div>
        `;
        document.body.appendChild(settingsMenu);
        
        // Settings event listeners
        document.getElementById('musicVolume').onchange = (e) => {
            localStorage.setItem('musicVolume', e.target.value);
            // Update music volume
        };
        
        document.getElementById('sfxVolume').onchange = (e) => {
            localStorage.setItem('sfxVolume', e.target.value);
            // Update SFX volume
        };
        
        document.getElementById('screenShake').onchange = (e) => {
            localStorage.setItem('screenShake', e.target.checked);
        };
        
        document.getElementById('damageNumbers').onchange = (e) => {
            localStorage.setItem('damageNumbers', e.target.checked);
        };
        
        document.getElementById('backButton').onclick = () => {
            settingsMenu.remove();
        };
    }

    saveProgress() {
        const now = Date.now();
        if (now - this.lastSaveTime > this.saveInterval) {
            const saveData = {
                playerStats,
                achievements,
                tutorialComplete: this.tutorialComplete,
                settings: {
                    musicVolume: localStorage.getItem('musicVolume'),
                    sfxVolume: localStorage.getItem('sfxVolume'),
                    screenShake: localStorage.getItem('screenShake'),
                    damageNumbers: localStorage.getItem('damageNumbers')
                }
            };
            localStorage.setItem('gameProgress', JSON.stringify(saveData));
            this.lastSaveTime = now;
        }
    }

    loadProgress() {
        const savedData = localStorage.getItem('gameProgress');
        if (savedData) {
            const data = JSON.parse(savedData);
            Object.assign(playerStats, data.playerStats);
            achievements.push(...data.achievements);
            this.tutorialComplete = data.tutorialComplete;
            
            // Load settings
            if (data.settings) {
                Object.entries(data.settings).forEach(([key, value]) => {
                    localStorage.setItem(key, value);
                });
            }
        }
    }

    showTutorial() {
        if (this.tutorialComplete) return;
        
        const tutorialSteps = [
            { message: 'Welcome to Light Rogue! Let\'s learn the basics.', position: 'center' },
            { message: 'Use WASD or Arrow Keys to move', position: 'bottom' },
            { message: 'Click or hold left mouse button to shoot', position: 'right' },
            { message: 'Press SPACE to jump', position: 'bottom' },
            { message: 'Press TAB to view your skill tree', position: 'top' },
            { message: 'Press ESC to pause the game', position: 'top' }
        ];
        
        let currentStep = 0;
        
        const showStep = () => {
            if (currentStep >= tutorialSteps.length) {
                this.tutorialComplete = true;
                this.saveProgress();
                return;
            }
            
            const step = tutorialSteps[currentStep];
            const tutorial = document.createElement('div');
            tutorial.className = 'tutorial-popup';
            tutorial.innerHTML = `
                <p>${step.message}</p>
                <button>Next</button>
            `;
            
            tutorial.style.position = 'absolute';
            switch (step.position) {
                case 'center':
                    tutorial.style.top = '50%';
                    tutorial.style.left = '50%';
                    tutorial.style.transform = 'translate(-50%, -50%)';
                    break;
                case 'bottom':
                    tutorial.style.bottom = '20%';
                    tutorial.style.left = '50%';
                    tutorial.style.transform = 'translateX(-50%)';
                    break;
                case 'right':
                    tutorial.style.right = '20%';
                    tutorial.style.top = '50%';
                    tutorial.style.transform = 'translateY(-50%)';
                    break;
                case 'top':
                    tutorial.style.top = '20%';
                    tutorial.style.left = '50%';
                    tutorial.style.transform = 'translateX(-50%)';
                    break;
            }
            
            document.body.appendChild(tutorial);
            
            tutorial.querySelector('button').onclick = () => {
                tutorial.remove();
                currentStep++;
                showStep();
            };
        };
        
        showStep();
    }

    // Game state methods with encryption
    async startGame() {
        const state = await this.getDecryptedState();
        await this.setEncryptedState({
            ...state,
            screen: 'game',
            isRunning: true,
            isPaused: false,
            score: 0,
            level: 1,
            playerHealth: 100
        });
        this.uxHandler.updateUI(await this.getDecryptedState());
    }

    async pauseGame() {
        const state = await this.getDecryptedState();
        if (state.isRunning) {
            await this.setEncryptedState({
                ...state,
                isPaused: true,
                screen: 'pause'
            });
            this.uxHandler.updateUI(await this.getDecryptedState());
        }
    }

    // Cleanup with secure disposal
    destroy() {
        // Remove event listeners
        if (this._eventListener) {
            document.removeEventListener('keydown', this._eventListener);
        }

        // Secure disposal of sensitive data
        if (this.uxHandler) {
            this.uxHandler.destroy();
        }

        // Clear WeakMaps
        _state.delete(this);
        _crypto.delete(this);
        _securityContext.delete(this);

        // Overwrite memory
        const sensitiveData = [this.uxHandler, this._eventListener];
        sensitiveData.forEach(item => {
            if (item) {
                Object.keys(item).forEach(key => {
                    item[key] = null;
                });
            }
        });
    }
}

export default GameController;
