// Game canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');

// Initialize canvas size
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Game state
let score = 0;
let balls = [];
let particles = [];
let emojis = [];

// Generate all possible emojis
const emojiRanges = [
    [0x1F300, 0x1F3FF],  // Miscellaneous Symbols and Pictographs
    [0x1F400, 0x1F64F],  // Emoticons
    [0x1F680, 0x1F6FF],  // Transport and Map Symbols
    [0x2600, 0x26FF],    // Miscellaneous Symbols
];

const allEmojis = [];
emojiRanges.forEach(([start, end]) => {
    for (let i = start; i <= end; i++) {
        const emoji = String.fromCodePoint(i);
        if (emoji && emoji.trim()) {
            allEmojis.push(emoji);
        }
    }
});

// Store all emojis in localStorage
localStorage.setItem('allEmojis', JSON.stringify(allEmojis));

// Ball class
class Ball {
    constructor() {
        this.radius = 20 + Math.random() * 30;
        this.x = Math.random() < 0.5 ? -this.radius : canvas.width + this.radius;
        this.y = Math.random() * canvas.height;
        this.dx = (Math.random() * 2 + 1) * (this.x < 0 ? 1 : -1);
        this.dy = Math.random() * 4 - 2;
        this.color = `hsl(${Math.random() * 360}, 70%, 50%)`;
        this.value = Math.ceil(this.radius / 10);
        this.gradient = null;
        this.createGradient();
    }

    createGradient() {
        this.gradient = ctx.createRadialGradient(
            this.x - this.radius/3, 
            this.y - this.radius/3,
            0,
            this.x,
            this.y,
            this.radius
        );
        this.gradient.addColorStop(0, '#ffffff');
        this.gradient.addColorStop(0.3, this.color);
        this.gradient.addColorStop(1, '#000000');
    }

    update() {
        this.x += this.dx;
        this.y += this.dy;
        if (this.y < this.radius || this.y > canvas.height - this.radius) {
            this.dy *= -1;
        }
        this.createGradient();
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.gradient;
        ctx.fill();
        ctx.closePath();
    }

    isOffscreen() {
        return (this.x + this.radius < 0 || this.x - this.radius > canvas.width);
    }

    containsPoint(x, y) {
        const distance = Math.sqrt((x - this.x) ** 2 + (y - this.y) ** 2);
        return distance <= this.radius;
    }
}

// Particle class for explosion effects
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = Math.random() * 3 + 2;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 2;
        this.dx = Math.cos(angle) * speed;
        this.dy = Math.sin(angle) * speed;
        this.alpha = 1;
        this.life = 1;
    }

    update() {
        this.x += this.dx;
        this.y += this.dy;
        this.life -= 0.02;
        this.alpha = this.life;
        this.size *= 0.99;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// Floating emoji class
class FloatingEmoji {
    constructor(x, y, emoji) {
        this.x = x;
        this.y = y;
        this.emoji = emoji;
        this.dy = -2;
        this.alpha = 1;
    }

    update() {
        this.y += this.dy;
        this.alpha -= 0.02;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.font = '24px Arial';
        ctx.fillText(this.emoji, this.x, this.y);
        ctx.restore();
    }
}

// Game functions
function createExplosion(x, y, color, count = 30) {
    for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function getRandomEmojis(count) {
    const result = [];
    for (let i = 0; i < count; i++) {
        result.push(allEmojis[Math.floor(Math.random() * allEmojis.length)]);
    }
    return result;
}

function collectEmoji(emoji) {
    const collection = JSON.parse(localStorage.getItem('emojiCollection') || '{}');
    collection[emoji] = true;
    localStorage.setItem('emojiCollection', JSON.stringify(collection));
}

function spawnBall() {
    if (balls.length < 10) {
        balls.push(new Ball());
    }
}

// Input handling
function handleClick(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    balls.forEach((ball, index) => {
        if (ball.containsPoint(x, y)) {
            // Create explosion
            createExplosion(ball.x, ball.y, ball.color);
            
            // Add score
            score += ball.value;
            scoreElement.textContent = `Score: ${score}`;

            // Create floating emojis
            const newEmojis = getRandomEmojis(ball.value);
            newEmojis.forEach((emoji, i) => {
                emojis.push(new FloatingEmoji(
                    ball.x + (i - ball.value/2) * 20,
                    ball.y,
                    emoji
                ));
                collectEmoji(emoji);
            });

            // Remove the ball
            balls.splice(index, 1);
        }
    });
}

canvas.addEventListener('click', handleClick);
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleClick(touch);
});

// Animation loop
function animate() {
    ctx.fillStyle = 'rgba(26, 26, 26, 0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Update and draw balls
    balls = balls.filter(ball => !ball.isOffscreen());
    balls.forEach(ball => {
        ball.update();
        ball.draw();
    });

    // Update and draw particles
    particles = particles.filter(particle => particle.life > 0);
    particles.forEach(particle => {
        particle.update();
        particle.draw();
    });

    // Update and draw emojis
    emojis = emojis.filter(emoji => emoji.alpha > 0);
    emojis.forEach(emoji => {
        emoji.update();
        emoji.draw();
    });

    // Spawn new balls
    if (Math.random() < 0.02) {
        spawnBall();
    }

    requestAnimationFrame(animate);
}

// Start the game
animate();
