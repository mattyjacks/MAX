import { getRandomEmoji, startGame } from './emojis.js';
import { ExplosionManager } from './particleSystem.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let gameState = null;
let animationFrameId = null;
let isPaused = false;
const particles = [];

class Ball {
    constructor(x, y) {
        // Spawn from random edge of screen
        const side = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
        switch(side) {
            case 0: // top
                this.x = Math.random() * canvas.width;
                this.y = -60;
                break;
            case 1: // right
                this.x = canvas.width + 60;
                this.y = Math.random() * canvas.height;
                break;
            case 2: // bottom
                this.x = Math.random() * canvas.width;
                this.y = canvas.height + 60;
                break;
            case 3: // left
                this.x = -60;
                this.y = Math.random() * canvas.height;
                break;
        }
        
        this.targetX = x;
        this.targetY = y;
        this.radius = 60;
        this.dx = (this.targetX - this.x) * 0.02;
        this.dy = (this.targetY - this.y) * 0.02;
        this.emoji = getRandomEmoji();
        this.color = `hsl(${Math.random() * 360}, 70%, 50%)`;
    }

    draw() {
        // Draw shaded ball
        ctx.save();
        const gradient = ctx.createRadialGradient(
            this.x - this.radius * 0.3, 
            this.y - this.radius * 0.3, 
            0,
            this.x,
            this.y,
            this.radius
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(0.3, this.color);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Draw emoji
        ctx.font = '120px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.emoji.emoji, this.x, this.y);
        ctx.restore();
    }

    update() {
        // Move towards target position
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 1) {
            this.x += this.dx;
            this.y += this.dy;
        } else {
            // Once reached target, bounce normally
            if (this.x + this.radius > canvas.width || this.x - this.radius < 0) {
                this.dx = -this.dx;
            }
            if (this.y + this.radius > canvas.height || this.y - this.radius < 0) {
                this.dy = -this.dy;
            }
            this.x += this.dx;
            this.y += this.dy;
        }
    }

    explodeEmojis() {
        const numEmojis = Math.floor(Math.random() * 6) + 5; // 5-10 emojis
        const emojis = [];
        for (let i = 0; i < numEmojis; i++) {
            const angle = (Math.PI * 2 * i) / numEmojis;
            const speed = 10;
            const emoji = getRandomEmoji();
            emojis.push({
                x: this.x,
                y: this.y,
                dx: Math.cos(angle) * speed,
                dy: Math.sin(angle) * speed,
                emoji: emoji.emoji,
                opacity: 1,
                size: 60
            });
        }
        return emojis;
    }
}

let balls = [];
let explosionManager;
let explodingEmojis = [];
let gameTimer = 0;
let collectedEmojis = new Set();
let startTime = Date.now();

function createBall() {
    const x = Math.random() * (canvas.width - 120) + 60;
    const y = Math.random() * (canvas.height - 120) + 60;
    balls.push(new Ball(x, y));
}

function updateTimer() {
    if (!isPaused) {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        document.getElementById('timer').textContent = `Time: ${elapsed}s`;
    }
}

function updateCollectionDisplay() {
    const collectionGrid = document.getElementById('collection-grid');
    const collectionCount = document.getElementById('collection-count');
    
    // Clear existing grid
    collectionGrid.innerHTML = '';
    
    // Add all collected emojis
    Array.from(collectedEmojis).forEach(emoji => {
        const emojiDiv = document.createElement('div');
        emojiDiv.className = 'emoji-item';
        emojiDiv.textContent = emoji;
        collectionGrid.appendChild(emojiDiv);
    });
    
    // Update count
    collectionCount.textContent = `${collectedEmojis.size}/1580 Emojis Collected`;
}

export function initGame() {
    gameState = startGame();
    explosionManager = new ExplosionManager(canvas);
    for (let i = 0; i < 5; i++) {
        createBall();
    }
}

export function animate() {
    if (!isPaused) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Update particle system first (handles its own background)
        if (explosionManager) {
            explosionManager.update();
        }
        
        updateExplodingEmojis();
        updateTimer();
        
        balls.forEach(ball => {
            ball.update();
            ball.draw();
        });

        if (balls.length < 10 && Math.random() < 0.02) {
            createBall();
        }

        animationFrameId = requestAnimationFrame(animate);
    }
}

export function pauseGame() {
    isPaused = true;
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
}

export function resumeGame() {
    isPaused = false;
    animate();
}

function updateExplodingEmojis() {
    for (let i = explodingEmojis.length - 1; i >= 0; i--) {
        const emoji = explodingEmojis[i];
        emoji.x += emoji.dx;
        emoji.dy += 0.5; // gravity
        emoji.y += emoji.dy;
        emoji.opacity -= 0.02;
        
        if (emoji.opacity <= 0) {
            explodingEmojis.splice(i, 1);
        } else {
            ctx.globalAlpha = emoji.opacity;
            ctx.font = `${emoji.size}px Arial`;
            ctx.fillText(emoji.emoji, emoji.x, emoji.y);
            ctx.globalAlpha = 1;
        }
    }
}

// Collection button event listener
document.getElementById('collection-button').addEventListener('click', () => {
    isPaused = true;
    document.getElementById('collection-modal').style.display = 'block';
    updateCollectionDisplay();
});

// Close collection button event listener
document.getElementById('close-collection').addEventListener('click', () => {
    document.getElementById('collection-modal').style.display = 'none';
    isPaused = false;
    animate();
});

canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    balls.forEach((ball, index) => {
        const dx = x - ball.x;
        const dy = y - ball.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < ball.radius) {
            if (gameState) {
                collectedEmojis.add(ball.emoji.emoji);
                gameState.score += ball.emoji.points;
                document.getElementById('score').textContent = gameState.score;
            }
            explodingEmojis = explodingEmojis.concat(ball.explodeEmojis());
            balls.splice(index, 1);
            
            // Chain reaction with nearby balls
            balls.forEach((otherBall, otherIndex) => {
                const dist = Math.sqrt(
                    (ball.x - otherBall.x) ** 2 + 
                    (ball.y - otherBall.y) ** 2
                );
                if (dist < 200) { // Chain reaction radius
                    collectedEmojis.add(otherBall.emoji.emoji);
                    explodingEmojis = explodingEmojis.concat(otherBall.explodeEmojis());
                    balls.splice(otherIndex, 1);
                }
            });
            
            // Trigger particle explosion
            explosionManager.particles.forEach(particle => {
                if (particle.isNear({x: ball.x, y: ball.y}, 50)) {
                    particle.explode(explosionManager.particles);
                }
            });
        }
    });
});

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});
