import { getRandomEmoji, startGame } from './emojis.js';

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
        this.x = x;
        this.y = y;
        this.radius = 30;
        this.dx = (Math.random() - 0.5) * 8;
        this.dy = (Math.random() - 0.5) * 8;
        this.emoji = getRandomEmoji();
    }

    draw() {
        ctx.font = '30px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.emoji.emoji, this.x, this.y);
    }

    update() {
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

let balls = [];

function createBall() {
    const x = Math.random() * (canvas.width - 60) + 30;
    const y = Math.random() * (canvas.height - 60) + 30;
    balls.push(new Ball(x, y));
}

export function initGame() {
    gameState = startGame();
    for (let i = 0; i < 5; i++) {
        createBall();
    }
}

export function animate() {
    if (!isPaused) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        balls.forEach(ball => {
            ball.update();
            ball.draw();
        });

        if (balls.length < 10 && Math.random() < 0.02) {
            createBall();
        }

        updateParticles();
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
                gameState.collectEmoji(ball.emoji);
            }
            balls.splice(index, 1);
            createParticles(ball.x, ball.y, ball.emoji.emoji);
        }
    });
});

function createParticles(x, y, emoji) {
    const numParticles = 10;
    for (let i = 0; i < numParticles; i++) {
        const angle = (i / numParticles) * Math.PI * 2;
        const velocity = 5;
        const particle = {
            x,
            y,
            dx: Math.cos(angle) * velocity,
            dy: Math.sin(angle) * velocity,
            emoji,
            alpha: 1,
            size: 20
        };
        particles.push(particle);
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.dx;
        p.y += p.dy;
        p.alpha -= 0.02;
        p.size += 0.5;

        if (p.alpha <= 0) {
            particles.splice(i, 1);
        } else {
            ctx.globalAlpha = p.alpha;
            ctx.font = `${p.size}px Arial`;
            ctx.fillText(p.emoji, p.x, p.y);
            ctx.globalAlpha = 1;
        }
    }
}

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});
