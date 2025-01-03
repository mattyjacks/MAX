// Game Testing Suite
class GameTester {
    constructor() {
        this.testResults = [];
        this.currentTest = '';
    }

    log(message, success = true) {
        console.log(`%c[TEST] ${message}`, `color: ${success ? 'green' : 'red'}`);
        this.testResults.push({ test: this.currentTest, message, success });
    }

    async runTests() {
        console.log('%cStarting Game Tests', 'color: blue; font-size: 16px');
        
        try {
            await this.testGameLoad();
            await this.testStartButton();
            await this.testGameplay();
        } catch (error) {
            this.log(`Test error: ${error.message}`, false);
        } finally {
            this.showResults();
            // Clean up after tests
            this.cleanup();
        }
    }

    cleanup() {
        debugLog('Cleaning up after tests');
        resetGame();
        window.testMode = false;
    }

    async testGameLoad() {
        this.currentTest = 'Game Loading';
        
        return new Promise(resolve => {
            const maxWaitTime = 1000; // 1 second timeout
            const startTime = Date.now();
            
            const checkLoading = setInterval(() => {
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
            }, 100);
        });
    }

    async testStartButton() {
        this.currentTest = 'Start Button';
        
        return new Promise(resolve => {
            const startButton = document.getElementById('startButton');
            if (!startButton) {
                this.log('Start button not found', false);
                resolve();
                return;
            }

            startButton.click();
            
            setTimeout(() => {
                if (gameStarted && isGameRunning) {
                    this.log('Game started successfully');
                } else {
                    this.log('Game failed to start', false);
                }
                resolve();
            }, 100);
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
        console.log('%cTest Results:', 'color: blue; font-size: 16px');
        let passed = 0;
        let failed = 0;
        
        this.testResults.forEach(result => {
            console.log(
                `%c${result.test}: ${result.message}`,
                `color: ${result.success ? 'green' : 'red'}`
            );
            result.success ? passed++ : failed++;
        });
        
        console.log(
            `%cTests Complete: ${passed} passed, ${failed} failed`,
            `color: ${failed === 0 ? 'green' : 'red'}; font-size: 14px`
        );
    }
}

// Start tests when page loads
window.addEventListener('load', () => {
    const tester = new GameTester();
    tester.runTests();
});
