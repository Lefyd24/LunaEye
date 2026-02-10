// Morphing Eye Animation System
class MorphingEye {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error('Canvas not found:', canvasId);
            return;
        }
        
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.centerX = this.width / 2;
        this.centerY = this.height / 2;
        
        // Animation state
        this.currentState = 'idle';
        this.animationFrame = 0;
        this.morphProgress = 0;
        this.targetMorph = 0;
        
        // Color schemes for different states
        this.colors = {
            idle: {
                primary: '#6366f1',
                secondary: '#8b5cf6',
                accent: '#a855f7',
                glow: 'rgba(99, 102, 241, '
            },
            listening: {
                primary: '#06b6d4',
                secondary: '#0ea5e9',
                accent: '#38bdf8',
                glow: 'rgba(6, 182, 212, '
            },
            thinking: {
                primary: '#f59e0b',
                secondary: '#fb923c',
                accent: '#fbbf24',
                glow: 'rgba(245, 158, 11, '
            },
            speaking: {
                primary: '#10b981',
                secondary: '#34d399',
                accent: '#6ee7b7',
                glow: 'rgba(16, 185, 129, '
            },
            waking: {
                primary: '#ec4899',
                secondary: '#f472b6',
                accent: '#f9a8d4',
                glow: 'rgba(236, 72, 153, '
            },
            error: {
                primary: '#ef4444',
                secondary: '#f87171',
                accent: '#fca5a5',
                glow: 'rgba(239, 68, 68, '
            }
        };
        
        // Morphing shapes
        this.shapes = [];
        this.initializeShapes();
        
        // Start animation
        this.animate();
    }
    
    initializeShapes() {
        // Create morphing blob shapes
        const numPoints = 12;
        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * Math.PI * 2;
            this.shapes.push({
                angle: angle,
                baseRadius: 80,
                radiusOffset: 0,
                radiusSpeed: 0.02 + Math.random() * 0.03,
                radiusPhase: Math.random() * Math.PI * 2
            });
        }
    }
    
    setState(state) {
        this.currentState = state;
    }
    
    animate() {
        this.animationFrame++;
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
    
    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        const colors = this.colors[this.currentState] || this.colors.idle;
        
        // Save context
        this.ctx.save();
        this.ctx.translate(this.centerX, this.centerY);
        
        // Draw outer glow layers
        this.drawGlowLayers(colors);
        
        // Draw morphing blob
        this.drawMorphingBlob(colors);
        
        // Draw inner patterns based on state
        switch (this.currentState) {
            case 'idle':
                this.drawIdlePattern(colors);
                break;
            case 'listening':
                this.drawListeningPattern(colors);
                break;
            case 'thinking':
                this.drawThinkingPattern(colors);
                break;
            case 'speaking':
                this.drawSpeakingPattern(colors);
                break;
            case 'waking':
                this.drawWakingPattern(colors);
                break;
            case 'error':
                this.drawErrorPattern(colors);
                break;
        }
        
        // Draw center core
        this.drawCore(colors);
        
        // Restore context
        this.ctx.restore();
    }
    
    drawGlowLayers(colors) {
        const time = this.animationFrame * 0.02;
        
        // Multiple glow layers with different opacity and size
        for (let i = 3; i > 0; i--) {
            const radius = 100 + i * 20 + Math.sin(time + i) * 10;
            const opacity = 0.1 + (Math.sin(time * 0.5 + i) + 1) * 0.05;
            
            const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
            gradient.addColorStop(0, colors.glow + '0)');
            gradient.addColorStop(0.5, colors.glow + opacity + ')');
            gradient.addColorStop(1, colors.glow + '0)');
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    drawMorphingBlob(colors) {
        const time = this.animationFrame * 0.01;
        
        this.ctx.beginPath();
        
        // Calculate morphing shape
        this.shapes.forEach((point, index) => {
            point.radiusPhase += point.radiusSpeed;
            const morphAmount = this.currentState === 'idle' ? 10 : 20;
            const radius = point.baseRadius + Math.sin(point.radiusPhase) * morphAmount;
            
            const x = Math.cos(point.angle) * radius;
            const y = Math.sin(point.angle) * radius;
            
            if (index === 0) {
                this.ctx.moveTo(x, y);
            } else {
                // Use quadratic curves for smooth morphing
                const prevPoint = this.shapes[index - 1];
                const prevRadius = prevPoint.baseRadius + Math.sin(prevPoint.radiusPhase) * morphAmount;
                const prevX = Math.cos(prevPoint.angle) * prevRadius;
                const prevY = Math.sin(prevPoint.angle) * prevRadius;
                
                const cpX = (prevX + x) / 2;
                const cpY = (prevY + y) / 2;
                
                this.ctx.quadraticCurveTo(prevX, prevY, cpX, cpY);
            }
        });
        
        // Close the path
        const firstRadius = this.shapes[0].baseRadius + Math.sin(this.shapes[0].radiusPhase) * morphAmount;
        const firstX = Math.cos(this.shapes[0].angle) * firstRadius;
        const firstY = Math.sin(this.shapes[0].angle) * firstRadius;
        this.ctx.quadraticCurveTo(firstX, firstY, firstX, firstY);
        this.ctx.closePath();
        
        // Create gradient fill
        const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, 120);
        gradient.addColorStop(0, colors.primary + '60');
        gradient.addColorStop(0.5, colors.secondary + '40');
        gradient.addColorStop(1, colors.accent + '20');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
        
        // Add glowing border
        this.ctx.strokeStyle = colors.primary + '80';
        this.ctx.lineWidth = 2;
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = colors.primary;
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;
    }
    
    drawIdlePattern(colors) {
        const time = this.animationFrame * 0.015;
        
        // Gentle floating particles
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2 + time;
            const radius = 40 + Math.sin(time * 2 + i) * 10;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            
            const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, 5);
            gradient.addColorStop(0, colors.accent + '80');
            gradient.addColorStop(1, colors.accent + '00');
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(x, y, 5, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    drawListeningPattern(colors) {
        const time = this.animationFrame * 0.05;
        
        // Pulsing concentric circles
        for (let i = 0; i < 4; i++) {
            const phase = (time + i * 0.5) % 2;
            const radius = 20 + phase * 40;
            const opacity = (1 - phase / 2) * 0.6;
            
            this.ctx.strokeStyle = colors.primary + Math.floor(opacity * 255).toString(16).padStart(2, '0') + ')';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
            this.ctx.stroke();
        }
        
        // Waveform visualization simulation
        const numBars = 24;
        for (let i = 0; i < numBars; i++) {
            const angle = (i / numBars) * Math.PI * 2;
            const height = 10 + Math.sin(time * 3 + i * 0.5) * 15;
            const x1 = Math.cos(angle) * 50;
            const y1 = Math.sin(angle) * 50;
            const x2 = Math.cos(angle) * (50 + height);
            const y2 = Math.sin(angle) * (50 + height);
            
            this.ctx.strokeStyle = colors.accent;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.stroke();
        }
    }
    
    drawThinkingPattern(colors) {
        const time = this.animationFrame * 0.03;
        
        // Rotating segments
        const numSegments = 8;
        for (let i = 0; i < numSegments; i++) {
            const angle = (i / numSegments) * Math.PI * 2 + time;
            const nextAngle = ((i + 1) / numSegments) * Math.PI * 2 + time;
            
            const opacity = (Math.sin(time * 2 + i) + 1) * 0.3;
            
            this.ctx.fillStyle = colors.primary + Math.floor(opacity * 255).toString(16).padStart(2, '0') + ')';
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.arc(0, 0, 60, angle, nextAngle);
            this.ctx.closePath();
            this.ctx.fill();
        }
        
        // Orbiting dots
        for (let i = 0; i < 3; i++) {
            const angle = time * (1 + i * 0.3) + (i / 3) * Math.PI * 2;
            const radius = 45;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            
            const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, 6);
            gradient.addColorStop(0, colors.accent);
            gradient.addColorStop(1, colors.accent + '00');
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(x, y, 6, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    drawSpeakingPattern(colors) {
        const time = this.animationFrame * 0.08;
        
        // Expanding waves
        for (let i = 0; i < 3; i++) {
            const phase = (time + i * 0.7) % 3;
            const radius = 30 + phase * 25;
            const opacity = (1 - phase / 3) * 0.8;
            
            this.ctx.strokeStyle = colors.primary + Math.floor(opacity * 255).toString(16).padStart(2, '0') + ')';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
            this.ctx.stroke();
        }
        
        // Dynamic amplitude bars
        const numBars = 16;
        for (let i = 0; i < numBars; i++) {
            const angle = (i / numBars) * Math.PI * 2;
            const amplitude = Math.abs(Math.sin(time * 2 + i * 0.3)) * 25;
            
            const x1 = Math.cos(angle) * 45;
            const y1 = Math.sin(angle) * 45;
            const x2 = Math.cos(angle) * (45 + amplitude);
            const y2 = Math.sin(angle) * (45 + amplitude);
            
            const gradient = this.ctx.createLinearGradient(x1, y1, x2, y2);
            gradient.addColorStop(0, colors.accent + '80');
            gradient.addColorStop(1, colors.accent + '00');
            
            this.ctx.strokeStyle = gradient;
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.stroke();
        }
    }
    
    drawWakingPattern(colors) {
        const time = this.animationFrame * 0.06;
        
        // Spiral energy
        const numPoints = 100;
        this.ctx.beginPath();
        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * Math.PI * 4 + time;
            const radius = (i / numPoints) * 50;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        
        const gradient = this.ctx.createLinearGradient(-50, -50, 50, 50);
        gradient.addColorStop(0, colors.primary);
        gradient.addColorStop(0.5, colors.secondary);
        gradient.addColorStop(1, colors.accent);
        
        this.ctx.strokeStyle = gradient;
        this.ctx.lineWidth = 2;
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = colors.primary;
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;
    }
    
    drawErrorPattern(colors) {
        const time = this.animationFrame * 0.1;
        
        // Glitch effect
        if (Math.random() > 0.7) {
            const offset = Math.random() * 10 - 5;
            this.ctx.translate(offset, offset);
        }
        
        // Warning triangles
        const numTriangles = 6;
        for (let i = 0; i < numTriangles; i++) {
            const angle = (i / numTriangles) * Math.PI * 2 + time;
            const radius = 50;
            const size = 8;
            
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            
            this.ctx.strokeStyle = colors.primary;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(x, y - size);
            this.ctx.lineTo(x - size, y + size);
            this.ctx.lineTo(x + size, y + size);
            this.ctx.closePath();
            this.ctx.stroke();
        }
    }
    
    drawCore(colors) {
        const time = this.animationFrame * 0.02;
        const pulseSize = 15 + Math.sin(time * 2) * 5;
        
        // Outer core ring
        const outerGradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, pulseSize + 5);
        outerGradient.addColorStop(0, colors.primary + '00');
        outerGradient.addColorStop(0.7, colors.primary + '60');
        outerGradient.addColorStop(1, colors.primary + '00');
        
        this.ctx.fillStyle = outerGradient;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, pulseSize + 5, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Main core
        const coreGradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, pulseSize);
        coreGradient.addColorStop(0, '#ffffff');
        coreGradient.addColorStop(0.3, colors.accent);
        coreGradient.addColorStop(0.7, colors.secondary);
        coreGradient.addColorStop(1, colors.primary + '00');
        
        this.ctx.fillStyle = coreGradient;
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = colors.primary;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, pulseSize, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
        
        // Center dot
        this.ctx.fillStyle = '#ffffff';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 3, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
    }
}

// Initialize morphing eye
window.addEventListener('DOMContentLoaded', () => {
    window.morphingEye = new MorphingEye('morphing-eye');
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MorphingEye;
}