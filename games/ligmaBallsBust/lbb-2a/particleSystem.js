class Particle {
    constructor(x, y, dx, dy, size, color) {
        this.x = x;
        this.y = y;
        this.dx = dx;
        this.dy = dy;
        this.size = size;
        this.color = color;
        this.state = "idle"; // "idle", "exploding", "fading"
        this.opacity = 1;
        this.life = 1;
    }

    move(canvas) {
        this.x += this.dx;
        this.y += this.dy;
        
        // Bounce off walls
        if (this.x < 0 || this.x > canvas.width) this.dx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.dy *= -1;

        // Update life if exploding
        if (this.state === "exploding") {
            this.life -= 0.02;
            this.opacity = this.life;
            if (this.life <= 0) {
                this.state = "dead";
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        
        // Add glow effect
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
        ctx.restore();
    }

    explode(particlesArray) {
        if (this.state !== "idle") return;
        
        this.state = "exploding";
        const numParticles = Math.floor(Math.random() * 5) + 3; // Limit to 3-7 particles
        
        for (let i = 0; i < numParticles; i++) {
            const angle = (Math.PI * 2 * i) / numParticles;
            const speed = Math.random() * 2 + 1;
            
            particlesArray.push(
                new Particle(
                    this.x,
                    this.y,
                    Math.cos(angle) * speed,
                    Math.sin(angle) * speed,
                    Math.random() * 15 + 5, // 5-20px
                    `hsl(${Math.random() * 360}, 100%, 50%)`
                )
            );
        }

        // Add spark particles
        for (let i = 0; i < 5; i++) { // Limit to 5 spark particles
            const spark = new Particle(
                this.x,
                this.y,
                (Math.random() - 0.5) * 8,
                (Math.random() - 0.5) * 8,
                2,
                '#ffffff'
            );
            spark.state = "exploding";
            spark.life = 0.5;
            particlesArray.push(spark);
        }
    }

    isNear(other, distance = 50) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy) < distance;
    }
}

export class ExplosionManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.maxParticles = 1000; // Reduced from 10000
        
        this.setupCanvas();
        this.setupEvents();
    }

    setupCanvas() {
        // Create gradient background
        this.gradient = this.ctx.createRadialGradient(
            this.canvas.width/2, this.canvas.height/2, 0,
            this.canvas.width/2, this.canvas.height/2, this.canvas.width/2
        );
        this.gradient.addColorStop(0, '#1a1a2e');
        this.gradient.addColorStop(1, '#000000');
    }

    setupEvents() {
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            this.particles.forEach(particle => {
                if (particle.isNear({x, y}, particle.size + 5)) {
                    particle.explode(this.particles);
                }
            });
        });
    }

    spawnParticle() {
        if (this.particles.length < this.maxParticles) {
            this.particles.push(new Particle(
                Math.random() * this.canvas.width,
                Math.random() * this.canvas.height,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                Math.random() * 15 + 5,
                `hsl(${Math.random() * 360}, 100%, 50%)`
            ));
        }
    }

    update() {
        // Clear canvas with gradient
        this.ctx.fillStyle = this.gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Spawn new particles occasionally
        if (Math.random() < 0.05) this.spawnParticle();  // Reduced spawn rate

        // Update and draw particles
        this.particles.forEach((particle, index) => {
            particle.move(this.canvas);
            particle.draw(this.ctx);

            // Check for chain reactions
            this.particles.forEach(other => {
                if (particle !== other && particle.state === "idle" && other.state === "exploding") {
                    if (particle.isNear(other)) {
                        particle.explode(this.particles);
                    }
                }
            });
        });

        // Remove dead particles
        this.particles = this.particles.filter(p => p.state !== "dead");
    }
}
