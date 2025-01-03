// Game Testing Suite
class GameTester {
    constructor() {
        this.testResults = [];
        this.currentTest = '';
        this.initializeGameState();
    }

    initializeGameState() {
        // Initialize required global variables if they don't exist
        if (typeof window.gameStarted === 'undefined') window.gameStarted = false;
        if (typeof window.isGameRunning === 'undefined') window.isGameRunning = false;
        if (typeof window.gameObjects === 'undefined') window.gameObjects = { player: null, zombies: [] };
    }

    log(message, success = true) {
        console.log(`%c[TEST] ${message}`, `color: ${success ? 'green' : 'red'}`);
        this.testResults.push({ test: this.currentTest, message, success });
    }

    async runTests() {
        console.log('%cStarting Game Tests', 'color: blue; font-size: 16px');
        
        try {
            // Ensure game state is initialized
            this.initializeGameState();
            
            await this.testGameLoad();
            await this.testStartButton();
            await this.testGameplay();
        } catch (error) {
            this.log(`Test error: ${error.message}`, false);
            console.error('Test error details:', error);
        } finally {
            this.showResults();
            this.cleanup();
        }
    }

    cleanup() {
        try {
            if (typeof resetGame === 'function') {
                resetGame();
            } else {
                console.warn('resetGame function not found');
            }
            window.testMode = false;
        } catch (error) {
            console.error('Cleanup error:', error);
        }
    }

    async testGameLoad() {
        this.currentTest = 'Game Loading';
        
        return new Promise(resolve => {
            const maxWaitTime = 2000; // 2 seconds timeout
            const startTime = Date.now();
            
            const checkLoading = setInterval(() => {
                try {
                    const progress = document.getElementById('loadingProgress');
                    const startButton = document.getElementById('startButton');
                    
                    // Check for timeout
                    if (Date.now() - startTime > maxWaitTime) {
                        clearInterval(checkLoading);
                        this.log('Loading timed out', false);
                        resolve();
                        return;
                    }
                    
                    if (startButton && startButton.style.display !== 'none') {
                        this.log('Game assets loaded successfully');
                        clearInterval(checkLoading);
                        resolve();
                    }
                } catch (error) {
                    clearInterval(checkLoading);
                    this.log(`Loading error: ${error.message}`, false);
                    resolve();
                }
            }, 100);
        });
    }

    async testStartButton() {
        this.currentTest = 'Start Button';
        
        return new Promise(resolve => {
            try {
                const startButton = document.getElementById('startButton');
                if (!startButton) {
                    this.log('Start button not found', false);
                    resolve();
                    return;
                }

                // Simulate click
                startButton.click();
                
                setTimeout(() => {
                    // Check game state
                    if (typeof window.gameStarted !== 'undefined' && 
                        typeof window.isGameRunning !== 'undefined' && 
                        window.gameStarted && 
                        window.isGameRunning) {
                        this.log('Game started successfully');
                    } else {
                        this.log('Game failed to start - Game state not properly initialized', false);
                    }
                    resolve();
                }, 500); // Increased timeout for more reliable testing
            } catch (error) {
                this.log(`Start button test error: ${error.message}`, false);
                resolve();
            }
        });
    }

    async testGameplay() {
        this.currentTest = 'Gameplay';
        
        return new Promise(resolve => {
            window.testMode = true;
            if (gameObjects.player) {
                gameObjects.player.health = Infinity;
            }
            
            const maxTestTime = 10000; // 10 seconds timeout
            const startTime = Date.now();
            
            const testInterval = setInterval(() => {
                // Check for timeout
                if (Date.now() - startTime > maxTestTime) {
                    clearInterval(testInterval);
                    this.log('Gameplay test timed out', false);
                    resolve();
                    return;
                }
                
                if (level >= 2) {
                    this.log('Reached level 2 successfully');
                    clearInterval(testInterval);
                    resolve();
                    return;
                }

                // Simulate gameplay
                if (gameObjects.zombies && gameObjects.zombies.length > 0) {
                    gameObjects.zombies.forEach(zombie => {
                        if (zombie && typeof zombie.takeDamage === 'function') {
                            zombie.takeDamage(100);
                        }
                    });
                }

                // Auto-select upgrade when menu appears
                if (isUpgradeMenuActive) {
                    const upgrades = document.querySelectorAll('.upgrade-item');
                    if (upgrades.length > 0) {
                        const randomUpgrade = upgrades[Math.floor(Math.random() * upgrades.length)];
                        if (randomUpgrade && typeof randomUpgrade.click === 'function') {
                            randomUpgrade.click();
                            
                            setTimeout(() => {
                                const confirmButton = document.getElementById('confirmUpgrade');
                                if (confirmButton) {
                                    confirmButton.click();
                                    this.log(`Advanced to level ${level}`);
                                }
                            }, 100);
                        }
                    }
                }
            }, 100);
        });
    }

    showResults() {
        console.log('%cTest Results:', 'color: blue; font-size: 14px');
        let passed = 0;
        let total = this.testResults.length;
        
        this.testResults.forEach(result => {
            if (result.success) passed++;
            console.log(
                `%c${result.test}: ${result.message}`,
                `color: ${result.success ? 'green' : 'red'}`
            );
        });
        
        console.log(
            `%cPassed: ${passed}/${total} (${Math.round(passed/total * 100)}%)`,
            `color: ${passed === total ? 'green' : 'orange'}; font-weight: bold`
        );
    }
}

// Start tests when page loads
window.addEventListener('load', () => {
    // Wait a bit for all scripts to initialize
    setTimeout(() => {
        const tester = new GameTester();
        tester.runTests();
    }, 1000);
});
