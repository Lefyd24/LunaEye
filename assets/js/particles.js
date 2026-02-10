// LunaEye Particle System
console.log('particles.js is being loaded!');
class ParticleSystem {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error(`Canvas with id ${canvasId} not found`);
            return;
        }
        
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.animationId = null;
        this.intensity = 0.3; // Default particle intensity
        
        // Configuration
        this.config = {
            maxParticles: 50,
            baseSpeed: 0.5,
            speedVariation: 0.3,
            baseSize: 2,
            sizeVariation: 1.5,
            colors: [
                'rgba(99, 102, 241, ',  // Indigo
                'rgba(6, 182, 212, ',   // Cyan
                'rgba(244, 63, 94, ',   // Rose
                'rgba(251, 191, 36, ',  // Amber
                'rgba(34, 197, 94, '    // Green
            ],
            connectionDistance: 150,
            connectionOpacity: 0.1
        };
        
        this.init();
    }
    
    // Initialize particle system
    init() {
        this.resizeCanvas();
        this.createParticles();
        this.animate();
        
        // Handle window resize
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    // Resize canvas to window size
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    // Create initial particles
    createParticles() {
        this.particles = [];
        const particleCount = Math.floor(this.config.maxParticles * this.intensity);
        
        for (let i = 0; i < particleCount; i++) {
            this.particles.push(this.createParticle());
        }
    }
    
    // Create single particle
    createParticle() {
        const colorIndex = Math.floor(Math.random() * this.config.colors.length);
        
        return {
            x: Math.random() * this.canvas.width,
            y: Math.random() * this.canvas.height,
            vx: (Math.random() - 0.5) * this.config.baseSpeed * 2,
            vy: (Math.random() - 0.5) * this.config.baseSpeed * 2,
            size: this.config.baseSize + Math.random() * this.config.sizeVariation,
            color: this.config.colors[colorIndex],
            opacity: 0.3 + Math.random() * 0.4,
            pulsePhase: Math.random() * Math.PI * 2,
            pulseSpeed: 0.02 + Math.random() * 0.03
        };
    }
    
    // Update particle intensity based on state
    setIntensity(intensity) {
        this.intensity = Math.max(0.1, Math.min(1, intensity));
        
        // Adjust particle count
        const targetCount = Math.floor(this.config.maxParticles * this.intensity);
        const currentCount = this.particles.length;
        
        if (targetCount > currentCount) {
            // Add particles
            for (let i = currentCount; i < targetCount; i++) {
                this.particles.push(this.createParticle());
            }
        } else if (targetCount < currentCount) {
            // Remove particles
            this.particles.splice(targetCount);
        }
    }
    
    // Update particle positions
    updateParticles() {
        this.particles.forEach(particle => {
            // Update position
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            // Update pulse
            particle.pulsePhase += particle.pulseSpeed;
            
            // Bounce off edges
            if (particle.x < 0 || particle.x > this.canvas.width) {
                particle.vx *= -1;
                particle.x = Math.max(0, Math.min(this.canvas.width, particle.x));
            }
            
            if (particle.y < 0 || particle.y > this.canvas.height) {
                particle.vy *= -1;
                particle.y = Math.max(0, Math.min(this.canvas.height, particle.y));
            }
            
            // Add slight random movement
            particle.vx += (Math.random() - 0.5) * 0.01;
            particle.vy += (Math.random() - 0.5) * 0.01;
            
            // Limit speed
            const maxSpeed = this.config.baseSpeed * 2;
            const speed = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy);
            if (speed > maxSpeed) {
                particle.vx = (particle.vx / speed) * maxSpeed;
                particle.vy = (particle.vy / speed) * maxSpeed;
            }
        });
    }
    
    // Draw particles
    drawParticles() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw connections
        this.drawConnections();
        
        // Draw particles
        this.particles.forEach(particle => {
            const pulseFactor = 1 + Math.sin(particle.pulsePhase) * 0.2;
            const currentSize = particle.size * pulseFactor;
            
            // Create gradient
            const gradient = this.ctx.createRadialGradient(
                particle.x, particle.y, 0,
                particle.x, particle.y, currentSize
            );
            
            const opacity = particle.opacity * this.intensity;
            gradient.addColorStop(0, particle.color + opacity + ')');
            gradient.addColorStop(1, particle.color + '0)');
            
            // Draw particle
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, currentSize, 0, Math.PI * 2);
            this.ctx.fillStyle = gradient;
            this.ctx.fill();
        });
    }
    
    // Draw connections between nearby particles
    drawConnections() {
        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                const p1 = this.particles[i];
                const p2 = this.particles[j];
                const distance = Math.sqrt(
                    Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2)
                );
                
                if (distance < this.config.connectionDistance) {
                    const opacity = (1 - distance / this.config.connectionDistance) * 
                                   this.config.connectionOpacity * this.intensity;
                    
                    this.ctx.beginPath();
                    this.ctx.moveTo(p1.x, p1.y);
                    this.ctx.lineTo(p2.x, p2.y);
                    this.ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
                    this.ctx.lineWidth = 0.5;
                    this.ctx.stroke();
                }
            }
        }
    }
    
    // Animation loop
    animate() {
        this.updateParticles();
        this.drawParticles();
        
        this.animationId = requestAnimationFrame(() => this.animate());
    }
    
    // Start/stop animation
    start() {
        if (!this.animationId) {
            this.animate();
        }
    }
    
    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
    
    // Create burst effect
    createBurst(x, y, count = 10) {
        const colorIndex = Math.floor(Math.random() * this.config.colors.length);
        const baseColor = this.config.colors[colorIndex];
        
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count;
            const speed = 2 + Math.random() * 2;
            
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: this.config.baseSize + Math.random() * 2,
                color: baseColor,
                opacity: 0.8,
                pulsePhase: 0,
                pulseSpeed: 0.05,
                lifetime: 60, // frames
                age: 0
            });
        }
        
        // Remove oldest particles if too many
        while (this.particles.length > this.config.maxParticles * 1.5) {
            this.particles.shift();
        }
    }
    
    // Update particles with lifetime
    updateParticlesWithLifetime() {
        this.particles = this.particles.filter(particle => {
            if (particle.lifetime) {
                particle.age++;
                particle.opacity *= 0.95; // Fade out
                return particle.age < particle.lifetime;
            }
            return true;
        });
    }
    
    // Override animate to handle lifetime particles
    animateWithLifetime() {
        this.updateParticles();
        this.updateParticlesWithLifetime();
        this.drawParticles();
        
        this.animationId = requestAnimationFrame(() => this.animateWithLifetime());
    }
    
    // Use lifetime animation for burst effects
    useLifetimeAnimation() {
        this.stop();
        this.animationId = requestAnimationFrame(() => this.animateWithLifetime());
    }
    
    // Get current particle count
    getParticleCount() {
        return this.particles.length;
    }
    
    // Clear all particles
    clear() {
        this.particles = [];
    }
    
    // Destroy particle system
    destroy() {
        this.stop();
        this.clear();
        window.removeEventListener('resize', this.resizeCanvas);
    }
}

// Voice Visualizer for audio feedback
class VoiceVisualizer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error(`Voice visualizer canvas with id ${canvasId} not found`);
            return;
        }
        
        this.ctx = this.canvas.getContext('2d');
        this.dataArray = null;
        this.isActive = false;
        
        // Configuration
        this.config = {
            barCount: 32,
            barWidth: 3,
            barGap: 2,
            color: 'rgba(6, 182, 212, ',
            maxBarHeight: 80,
            smoothing: 0.7
        };
        
        this.init();
    }
    
    // Initialize visualizer
    init() {
        // Set canvas size
        this.canvas.width = 200;
        this.canvas.height = 200;
    }
    
    // Update with audio data
    update(dataArray) {
        if (!this.isActive || !dataArray) return;
        
        this.dataArray = dataArray;
        this.draw();
    }
    
    // Draw visualization
    draw() {
        if (!this.dataArray) return;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Calculate bar dimensions
        const barCount = this.config.barCount;
        const barWidth = this.config.barWidth;
        const barGap = this.config.barGap;
        const totalWidth = barCount * (barWidth + barGap);
        const startX = (this.canvas.width - totalWidth) / 2;
        const centerY = this.canvas.height / 2;
        
        // Draw bars in circular pattern
        for (let i = 0; i < barCount; i++) {
            const dataIndex = Math.floor(i * this.dataArray.length / barCount);
            const value = this.dataArray[dataIndex] / 255;
            const barHeight = value * this.config.maxBarHeight;
            
            // Calculate angle for circular arrangement
            const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2;
            const x = centerX + Math.cos(angle) * 60;
            const y = centerY + Math.sin(angle) * 60;
            
            // Draw bar
            this.ctx.save();
            this.ctx.translate(x, y);
            this.ctx.rotate(angle);
            
            // Create gradient
            const gradient = this.ctx.createLinearGradient(0, 0, barHeight, 0);
            gradient.addColorStop(0, this.config.color + '0.8)');
            gradient.addColorStop(0.5, this.config.color + '0.6)');
            gradient.addColorStop(1, this.config.color + '0.2)');
            
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, -barWidth / 2, barHeight, barWidth);
            
            this.ctx.restore();
        }
        
        // Draw center circle
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, 30, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(6, 182, 212, 0.1)';
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, 25, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(6, 182, 212, 0.2)';
        this.ctx.fill();
    }
    
    // Activate visualizer
    activate() {
        this.isActive = true;
        this.canvas.style.opacity = '1';
    }
    
    // Deactivate visualizer
    deactivate() {
        this.isActive = false;
        this.canvas.style.opacity = '0';
        
        // Clear canvas
        setTimeout(() => {
            if (!this.isActive) {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            }
        }, 300);
    }
    
    // Create pulse effect
    pulse() {
        if (!this.canvas) return;
        
        this.canvas.style.transform = 'scale(1.1)';
        setTimeout(() => {
            if (this.canvas) {
                this.canvas.style.transform = 'scale(1)';
            }
        }, 150);
    }
}

// Voice Visualizer for audio feedback - REMOVED to avoid conflict with Siri-style visualizer

// Initialize global instances
window.ParticleSystem = new ParticleSystem('particles-canvas');
// VoiceVisualizer initialization removed to avoid conflict

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ParticleSystem };
}