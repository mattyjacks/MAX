class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 15;
        this.angle = Math.random() * Math.PI * 2;
        this.speed = 0.3;
        this.visionRange = 100;
        this.visionAngle = Math.PI / 4;
        this.patrolRadius = 80;
        this.centerX = x;
        this.centerY = y;
        this.rotationSpeed = 0.015;
    }

    update(canvas) {
        // Patrol in a circular pattern
        this.angle += this.rotationSpeed;
        this.x = this.centerX + Math.cos(this.angle) * this.patrolRadius;
        this.y = this.centerY + Math.sin(this.angle) * this.patrolRadius;

        // Keep within canvas bounds
        this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(canvas.height - this.radius, this.y));
    }

    draw(ctx) {
        // Draw enemy body
        ctx.fillStyle = '#ff4444';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Draw vision cone
        ctx.fillStyle = 'rgba(255, 255, 0, 0.2)';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.arc(this.x, this.y, this.visionRange,
                this.angle - this.visionAngle/2,
                this.angle + this.visionAngle/2);
        ctx.lineTo(this.x, this.y);
        ctx.fill();
    }

    canSeePoint(x, y) {
        const dx = x - this.x;
        const dy = y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > this.visionRange) return false;

        const angle = Math.atan2(dy, dx);
        const angleDiff = Math.abs(this.normalizeAngle(angle - this.angle));
        
        return angleDiff <= this.visionAngle / 2;
    }

    normalizeAngle(angle) {
        while (angle > Math.PI) angle -= 2 * Math.PI;
        while (angle < -Math.PI) angle += 2 * Math.PI;
        return angle;
    }
}
