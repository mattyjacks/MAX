// Input handling system for keyboard, mouse, and touch controls
export class InputManager {
    constructor() {
        this.keys = {};
        this.mouseX = 0;
        this.mouseY = 0;
        this.isMouseDown = false;
        this.isTouchDevice = false;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchThreshold = 20;
        
        // Virtual controls for mobile
        this.virtualControls = {
            left: false,
            right: false,
            up: false,
            down: false,
            shoot: false
        };
    }
    
    initialize() {
        this.setupKeyboardEvents();
        this.setupMouseEvents();
        this.setupTouchEvents();
        return Promise.resolve();
    }
    
    setupKeyboardEvents() {
        document.addEventListener('keydown', (event) => {
            this.keys[event.key.toLowerCase()] = true;
            this.handleKeyPress(event.key.toLowerCase());
        });
        
        document.addEventListener('keyup', (event) => {
            this.keys[event.key.toLowerCase()] = false;
        });
    }
    
    setupMouseEvents() {
        document.addEventListener('mousemove', (event) => {
            this.mouseX = event.clientX;
            this.mouseY = event.clientY;
            this.updateAimAngle();
        });
        
        document.addEventListener('mousedown', (event) => {
            if (event.button === 0) {
                this.isMouseDown = true;
                this.handleShootStart();
            }
        });
        
        document.addEventListener('mouseup', (event) => {
            if (event.button === 0) {
                this.isMouseDown = false;
                this.handleShootEnd();
            }
        });
    }
    
    setupTouchEvents() {
        document.addEventListener('touchstart', (event) => {
            this.isTouchDevice = true;
            const touch = event.touches[0];
            this.handleTouchStart(touch);
        });
        
        document.addEventListener('touchmove', (event) => {
            const touch = event.touches[0];
            this.handleTouchMove(touch);
        });
        
        document.addEventListener('touchend', () => {
            this.handleTouchEnd();
        });
    }
    
    handleKeyPress(key) {
        switch(key) {
            case 'escape':
                gameManager.togglePause();
                break;
            case 'tab':
                event.preventDefault();
                gameManager.toggleInventory();
                break;
        }
    }
    
    handleTouchStart(touch) {
        const rect = canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        this.touchStartX = x;
        this.touchStartY = y;
        
        if (x < canvas.width / 2) {
            // Left side - movement
            this.updateVirtualControls(x, y);
        } else {
            // Right side - shooting
            this.isMouseDown = true;
            this.mouseX = x;
            this.mouseY = y;
            this.handleShootStart();
        }
    }
    
    handleTouchMove(touch) {
        const rect = canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        if (x < canvas.width / 2) {
            this.updateVirtualControls(x, y);
        } else {
            this.mouseX = x;
            this.mouseY = y;
            this.updateAimAngle();
        }
    }
    
    handleTouchEnd() {
        this.virtualControls = {
            left: false,
            right: false,
            up: false,
            down: false,
            shoot: false
        };
        this.isMouseDown = false;
        this.handleShootEnd();
    }
    
    updateVirtualControls(x, y) {
        const deltaX = x - this.touchStartX;
        const deltaY = y - this.touchStartY;
        
        this.virtualControls.left = deltaX < -this.touchThreshold;
        this.virtualControls.right = deltaX > this.touchThreshold;
        this.virtualControls.up = deltaY < -this.touchThreshold;
        this.virtualControls.down = deltaY > this.touchThreshold;
    }
    
    updateAimAngle() {
        if (!gameManager.player) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = this.mouseX - rect.left;
        const y = this.mouseY - rect.top;
        
        const deltaX = x - gameManager.player.x;
        const deltaY = y - gameManager.player.y;
        gameManager.player.aimAngle = Math.atan2(deltaY, deltaX);
    }
    
    handleShootStart() {
        if (!gameManager.isPaused && gameManager.player) {
            gameManager.player.startShooting();
        }
    }
    
    handleShootEnd() {
        if (gameManager.player) {
            gameManager.player.stopShooting();
        }
    }
    
    isMoving() {
        return this.keys['a'] || this.keys['d'] || this.keys['w'] || this.keys['s'] ||
               this.keys['arrowleft'] || this.keys['arrowright'] || this.keys['arrowup'] || this.keys['arrowdown'] ||
               this.virtualControls.left || this.virtualControls.right || this.virtualControls.up || this.virtualControls.down;
    }
    
    getMovementVector() {
        let x = 0;
        let y = 0;
        
        // Keyboard input
        if (this.keys['a'] || this.keys['arrowleft'] || this.virtualControls.left) x -= 1;
        if (this.keys['d'] || this.keys['arrowright'] || this.virtualControls.right) x += 1;
        if (this.keys['w'] || this.keys['arrowup'] || this.virtualControls.up) y -= 1;
        if (this.keys['s'] || this.keys['arrowdown'] || this.virtualControls.down) y += 1;
        
        // Normalize diagonal movement
        if (x !== 0 && y !== 0) {
            const length = Math.sqrt(x * x + y * y);
            x /= length;
            y /= length;
        }
        
        return { x, y };
    }
}

// Export singleton instance
export const inputManager = new InputManager();
