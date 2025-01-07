class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.scoreElement = document.getElementById('scoreValue');
        this.stealthBar = document.getElementById('stealthBar');
        
        this.setupCanvas();
        this.reset();
        this.setupEventListeners();
        this.gameLoop();
    }

    setupCanvas() {
        this.canvas.width = 800;
        this.canvas.height = 600;
    }

    reset() {
        this.snake = new Snake(this.canvas.width / 2, this.canvas.height / 2);
        this.enemies = [
            new Enemy(200, 200),
            new Enemy(600, 200),
            new Enemy(200, 400),
            new Enemy(600, 400)
        ];
        this.particles = new ParticleSystem();
        this.food = this.spawnFood();
        this.score = 0;
        this.gameOver = false;
    }

    spawnFood() {
        const margin = 30;
        return {
            x: margin + Math.random() * (this.canvas.width - 2 * margin),
            y: margin + Math.random() * (this.canvas.height - 2 * margin),
            radius: 8
        };
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            switch(e.key) {
                case 'ArrowUp':
                    this.snake.setDirection(0, -1);
                    break;
                case 'ArrowDown':
                    this.snake.setDirection(0, 1);
                    break;
                case 'ArrowLeft':
                    this.snake.setDirection(-1, 0);
                    break;
                case 'ArrowRight':
                    this.snake.setDirection(1, 0);
                    break;
                case 'Shift':
                    this.snake.toggleStealth();
                    break;
                case 'r':
                    if (this.gameOver) this.reset();
                    break;
            }
        });
    }

    update() {
        if (this.gameOver) return;

        this.snake.update();
        this.enemies.forEach(enemy => enemy.update(this.canvas));
        this.particles.update();

        // Check wall collision
        if (this.snake.checkCollision(this.canvas)) {
            this.gameOver = true;
            return;
        }

        // Check self collision
        if (this.snake.checkSelfCollision()) {
            this.gameOver = true;
            return;
        }

        // Check enemy detection
        const head = this.snake.segments[0];
        if (!this.snake.stealthMode && 
            this.enemies.some(enemy => enemy.canSeePoint(head.x, head.y))) {
            this.gameOver = true;
            return;
        }

        // Check food collision
        if (Math.hypot(head.x - this.food.x, head.y - this.food.y) < 
            (this.snake.size + this.food.radius)) {
            this.score += 10;
            this.snake.grow();
            this.food = this.spawnFood();
            this.particles.emit(this.food.x, this.food.y, '#ffff00', 10);
        }

        // Update UI
        this.scoreElement.textContent = this.score;
        this.stealthBar.style.width = `${this.snake.stealthEnergy}%`;
    }

    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw food
        this.ctx.fillStyle = '#ffff00';
        this.ctx.beginPath();
        this.ctx.arc(this.food.x, this.food.y, this.food.radius, 0, Math.PI * 2);
        this.ctx.fill();

        // Draw particles
        this.particles.draw(this.ctx);

        // Draw snake
        this.snake.draw(this.ctx, this.particles);

        // Draw enemies
        this.enemies.forEach(enemy => enemy.draw(this.ctx));

        // Draw game over message
        if (this.gameOver) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Game Over!', this.canvas.width/2, this.canvas.height/2);
            this.ctx.font = '24px Arial';
            this.ctx.fillText('Press R to restart', this.canvas.width/2, this.canvas.height/2 + 40);
        }
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Start the game when the page loads
window.onload = () => new Game();
