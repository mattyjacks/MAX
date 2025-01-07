class Snake {
    constructor(x, y) {
        this.segments = [{x, y}];
        this.direction = {x: 1, y: 0};
        this.nextDirection = {x: 1, y: 0};
        this.speed = 1.5;
        this.size = 15;
        this.stealthMode = false;
        this.stealthEnergy = 100;
        this.stealthDrain = 0.3;
        this.stealthRecharge = 0.4;
        this.growAmount = 1;
        this.growing = 0;
    }

    update() {
        // Update stealth energy
        if (this.stealthMode && this.stealthEnergy > 0) {
            this.stealthEnergy = Math.max(0, this.stealthEnergy - this.stealthDrain);
        } else if (!this.stealthMode && this.stealthEnergy < 100) {
            this.stealthEnergy = Math.min(100, this.stealthEnergy + this.stealthRecharge);
        }

        // Update direction
        this.direction = {...this.nextDirection};

        // Move snake
        const head = this.segments[0];
        const newHead = {
            x: head.x + this.direction.x * this.speed,
            y: head.y + this.direction.y * this.speed
        };

        this.segments.unshift(newHead);

        if (this.growing > 0) {
            this.growing--;
        } else {
            this.segments.pop();
        }
    }

    draw(ctx, particles) {
        // Draw snake segments with gradient
        const alpha = this.stealthMode ? 0.3 : 1;
        
        this.segments.forEach((segment, index) => {
            const ratio = index / this.segments.length;
            ctx.fillStyle = `rgba(0, ${200 - ratio * 100}, ${100 + ratio * 155}, ${alpha})`;
            ctx.beginPath();
            ctx.arc(segment.x, segment.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        });

        // Emit particles in stealth mode
        if (this.stealthMode && Math.random() < 0.3) {
            const head = this.segments[0];
            particles.emit(head.x, head.y, 'rgba(0, 255, 255, 0.5)', 2);
        }
    }

    setDirection(dx, dy) {
        // Prevent 180-degree turns
        if (this.direction.x !== -dx || this.direction.y !== -dy) {
            this.nextDirection = {x: dx, y: dy};
        }
    }

    grow() {
        this.growing += this.growAmount;
    }

    toggleStealth() {
        if (!this.stealthMode && this.stealthEnergy > 0) {
            this.stealthMode = true;
        } else if (this.stealthMode) {
            this.stealthMode = false;
        }
    }

    checkCollision(canvas) {
        const head = this.segments[0];
        return head.x < 0 || head.x > canvas.width ||
               head.y < 0 || head.y > canvas.height;
    }

    checkSelfCollision() {
        const head = this.segments[0];
        // Start checking from index 2 to avoid false collisions with the neck
        return this.segments.slice(2).some(segment =>
            Math.hypot(segment.x - head.x, segment.y - head.y) < this.size
        );
    }
}
