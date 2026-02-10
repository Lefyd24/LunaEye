// Voice Visualizer - Siri-Inspired Fluid Orb
// Beautiful flowing gradient waves with smooth audio-reactive animations

class VoiceVisualizer {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.analyser = null;
        this.dataArray = null;
        this.animationId = null;
        this.isActive = false;
        this.time = 0;
        
        // Canvas dimensions
        this.centerX = 0;
        this.centerY = 0;
        this.baseRadius = 60;
        
        // Siri-like wave layers
        this.waves = [];
        this.numWaves = 6;
        
        // Audio smoothing
        this.smoothedLevels = new Array(8).fill(0);
        this.globalLevel = 0;
        this.targetLevel = 0;
        
        // Current state
        this.currentState = 'idle';
        
        // Color palettes for different states (Siri-inspired)
        this.colorPalettes = {
            idle: [
                { h: 200, s: 85, l: 55 },  // Soft blue
                { h: 260, s: 70, l: 60 },  // Purple
                { h: 180, s: 75, l: 50 },  // Cyan
                { h: 220, s: 80, l: 55 },  // Blue
                { h: 280, s: 65, l: 55 },  // Violet
                { h: 190, s: 80, l: 52 }   // Teal
            ],
            listening: [
                { h: 180, s: 90, l: 55 },  // Bright cyan
                { h: 200, s: 85, l: 60 },  // Blue
                { h: 160, s: 80, l: 50 },  // Teal
                { h: 220, s: 75, l: 58 },  // Sky blue
                { h: 170, s: 85, l: 52 },  // Aqua
                { h: 190, s: 88, l: 55 }   // Cyan
            ],
            thinking: [
                { h: 35, s: 90, l: 55 },   // Orange
                { h: 45, s: 85, l: 58 },   // Gold
                { h: 25, s: 88, l: 52 },   // Amber
                { h: 55, s: 80, l: 55 },   // Yellow
                { h: 15, s: 85, l: 50 },   // Deep orange
                { h: 40, s: 90, l: 56 }    // Warm gold
            ],
            speaking: [
                { h: 160, s: 85, l: 50 },  // Emerald
                { h: 140, s: 80, l: 52 },  // Green
                { h: 180, s: 75, l: 48 },  // Teal
                { h: 120, s: 70, l: 50 },  // Lime green
                { h: 170, s: 82, l: 50 },  // Sea green
                { h: 150, s: 85, l: 52 }   // Mint
            ],
            waking: [
                { h: 280, s: 85, l: 60 },  // Purple
                { h: 320, s: 80, l: 55 },  // Pink
                { h: 260, s: 75, l: 58 },  // Violet
                { h: 300, s: 82, l: 52 },  // Magenta
                { h: 240, s: 78, l: 55 },  // Blue-purple
                { h: 290, s: 80, l: 57 }   // Orchid
            ],
            error: [
                { h: 0, s: 85, l: 55 },    // Red
                { h: 15, s: 80, l: 50 },   // Orange-red
                { h: 350, s: 82, l: 52 },  // Crimson
                { h: 10, s: 88, l: 48 },   // Dark red
                { h: 5, s: 85, l: 55 },    // Scarlet
                { h: 355, s: 80, l: 50 }   // Rose red
            ]
        };
        
        this.init();
    }
    
    init() {
        this.createCanvas();
        this.initializeWaves();
        console.log('Siri-style Voice Visualizer initialized');
        this.startAnimation();
    }
    
    createCanvas() {
        const voiceCircle = document.querySelector('.voice-circle');
        if (!voiceCircle) {
            console.error('Could not find .voice-circle element!');
            return;
        }
        
        this.canvas = document.createElement('canvas');
        this.canvas.width = 300;
        this.canvas.height = 300;
        this.canvas.style.display = 'block';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        
        voiceCircle.appendChild(this.canvas);
        
        this.ctx = this.canvas.getContext('2d');
        this.centerX = this.canvas.width / 2;
        this.centerY = this.canvas.height / 2;
        
        console.log('Siri canvas created:', this.canvas.width + 'x' + this.canvas.height);
    }
    
    initializeWaves() {
        this.waves = [];
        for (let i = 0; i < this.numWaves; i++) {
            this.waves.push({
                phase: (i / this.numWaves) * Math.PI * 2,
                speed: 0.8 + Math.random() * 0.4,
                amplitude: 0.3 + Math.random() * 0.3,
                frequency: 2 + Math.random() * 2,
                offset: Math.random() * Math.PI * 2,
                colorIndex: i % 6
            });
        }
    }
    
    connect(analyser, dataArray) {
        this.analyser = analyser;
        this.dataArray = dataArray;
        console.log('Siri visualizer connected to audio analyser');
        
        // Ensure animation is running
        if (!this.isActive) {
            this.startAnimation();
        }
    }
    
    disconnect() {
        this.analyser = null;
        this.dataArray = null;
        console.log('Siri visualizer disconnected from audio');
    }
    
    setState(state) {
        this.currentState = state;
    }
    
    startAnimation() {
        this.isActive = true;
        
        const animate = () => {
            if (!this.isActive) return;
            
            this.animationId = requestAnimationFrame(animate);
            this.time += 0.016;
            
            // Get audio levels if connected
            this.updateAudioLevels();
            
            // Render the Siri-style orb
            this.render();
        };
        
        animate();
    }
    
    updateAudioLevels() {
        if (this.analyser && this.dataArray) {
            this.analyser.getByteFrequencyData(this.dataArray);
            
            // Calculate frequency band levels with better sensitivity
            const bands = 8;
            const bandSize = Math.floor(this.dataArray.length / bands);
            
            let maxLevel = 0;
            for (let i = 0; i < bands; i++) {
                let sum = 0;
                let bandMax = 0;
                for (let j = 0; j < bandSize; j++) {
                    const val = this.dataArray[i * bandSize + j];
                    sum += val;
                    bandMax = Math.max(bandMax, val);
                }
                // Use combination of average and peak for responsive yet smooth feel
                const avgLevel = (sum / bandSize) / 255;
                const peakLevel = bandMax / 255;
                const level = avgLevel * 0.6 + peakLevel * 0.4;
                
                // Smoother transitions - slower attack, even slower decay
                const smoothing = level > this.smoothedLevels[i] ? 0.4 : 0.15;
                this.smoothedLevels[i] += (level - this.smoothedLevels[i]) * smoothing;
                maxLevel = Math.max(maxLevel, this.smoothedLevels[i]);
            }
            
            // Global audio level - blend for smoothness
            const avgSum = this.smoothedLevels.reduce((a, b) => a + b, 0) / bands;
            this.targetLevel = avgSum * 0.6 + maxLevel * 0.4;
            
            // Add some idle breathing even with audio
            const idleBreathing = 0.08 + Math.sin(this.time * 0.6) * 0.04;
            this.targetLevel = Math.max(this.targetLevel, idleBreathing);
        } else {
            // Simulate gentle idle movement when no audio
            this.targetLevel = 0.12 + Math.sin(this.time * 0.6) * 0.06 + Math.sin(this.time * 1.1) * 0.04;
        }
        
        // Smooth global level with gentler smoothing for fluid motion
        const globalSmoothing = this.targetLevel > this.globalLevel ? 0.12 : 0.05;
        this.globalLevel += (this.targetLevel - this.globalLevel) * globalSmoothing;
    }
    
    render() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        
        // Clear with slight trail for smoothness
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.fillRect(0, 0, w, h);
        
        // Get current color palette
        const palette = this.colorPalettes[this.currentState] || this.colorPalettes.idle;
        
        // Calculate dynamic radius based on audio
        const audioBoost = this.currentState === 'idle' ? 0.3 : 1.0;
        const dynamicRadius = this.baseRadius + (this.globalLevel * 30 * audioBoost);
        
        // Draw outer glow
        this.drawOuterGlow(ctx, palette, dynamicRadius);
        
        // Draw the main orb with multiple wave layers
        this.drawSiriOrb(ctx, palette, dynamicRadius);
        
        // Draw inner core
        this.drawCore(ctx, palette);
    }
    
    drawOuterGlow(ctx, palette, radius) {
        const glowRadius = radius * 2;
        const mainColor = palette[0];
        
        const gradient = ctx.createRadialGradient(
            this.centerX, this.centerY, radius * 0.8,
            this.centerX, this.centerY, glowRadius
        );
        
        gradient.addColorStop(0, `hsla(${mainColor.h}, ${mainColor.s}%, ${mainColor.l}%, 0.3)`);
        gradient.addColorStop(0.5, `hsla(${mainColor.h}, ${mainColor.s}%, ${mainColor.l}%, 0.1)`);
        gradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    drawSiriOrb(ctx, palette, baseRadius) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        
        // Draw multiple flowing wave layers
        for (let w = 0; w < this.numWaves; w++) {
            const wave = this.waves[w];
            const color = palette[wave.colorIndex];
            
            // Wave-specific audio reactivity - each wave responds to different frequency band
            const bandIndex = w % this.smoothedLevels.length;
            const bandLevel = this.smoothedLevels[bandIndex] || 0;
            const nextBandLevel = this.smoothedLevels[(bandIndex + 1) % this.smoothedLevels.length] || 0;
            const blendedBandLevel = bandLevel * 0.7 + nextBandLevel * 0.3;
            
            // Calculate wave animation with audio-modulated speed
            const audioSpeedBoost = 1 + blendedBandLevel * 0.5;
            const waveTime = this.time * wave.speed * audioSpeedBoost + wave.phase;
            const audioInfluence = this.currentState === 'idle' ? 0.6 : 1.2;
            
            ctx.beginPath();
            
            // Use more points and bezier curves for ultra-smooth waves
            const points = 48;
            const curvePoints = [];
            
            for (let i = 0; i <= points; i++) {
                const angle = (i / points) * Math.PI * 2;
                
                // Get smoothed per-point audio level
                const pointBandIndex = Math.floor((i / points) * this.smoothedLevels.length);
                const pointAudioLevel = this.smoothedLevels[pointBandIndex] || blendedBandLevel;
                
                // Gentler, smoother sine waves with lower frequencies
                const wave1 = Math.sin(angle * wave.frequency + waveTime) * wave.amplitude;
                const wave2 = Math.sin(angle * (wave.frequency * 0.5) + waveTime * 0.8 + wave.offset) * wave.amplitude * 0.4;
                const wave3 = Math.cos(angle * 1.5 + waveTime * 0.5) * wave.amplitude * 0.25;
                
                // Smoother audio-reactive component
                const audioWave = Math.sin(angle * 2 + this.time * 2) * pointAudioLevel * audioInfluence * 0.4;
                const audioPulse = pointAudioLevel * audioInfluence * 0.2;
                
                // Gentle breathing effect
                const breathe = Math.sin(this.time * 0.6 + w * 0.4) * 0.06;
                
                // Combine effects with smoother transitions
                const radiusOffset = (wave1 + wave2 + wave3 + audioWave + audioPulse + breathe) * baseRadius * 0.3;
                const radius = baseRadius * (0.7 + w * 0.05) + radiusOffset;
                
                curvePoints.push({
                    x: this.centerX + Math.cos(angle) * radius,
                    y: this.centerY + Math.sin(angle) * radius
                });
            }
            
            // Draw smooth curve using cardinal spline
            this.drawSmoothCurve(ctx, curvePoints);
            
            ctx.closePath();
            
            // Create gradient fill for each wave
            const gradient = ctx.createRadialGradient(
                this.centerX, this.centerY, 0,
                this.centerX, this.centerY, baseRadius * 1.5
            );
            
            const alpha = 0.15 + (bandLevel * 0.2);
            gradient.addColorStop(0, `hsla(${color.h}, ${color.s}%, ${color.l + 10}%, ${alpha})`);
            gradient.addColorStop(0.5, `hsla(${color.h}, ${color.s}%, ${color.l}%, ${alpha * 0.7})`);
            gradient.addColorStop(1, `hsla(${color.h}, ${color.s}%, ${color.l - 10}%, 0)`);
            
            ctx.fillStyle = gradient;
            ctx.fill();
            
            // Subtle stroke
            ctx.strokeStyle = `hsla(${color.h}, ${color.s}%, ${color.l + 20}%, ${alpha * 0.5})`;
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        
        ctx.restore();
        
        // Draw the main orb shape on top
        this.drawMainOrb(ctx, palette, baseRadius);
    }
    
    drawMainOrb(ctx, palette, baseRadius) {
        const mainColor = palette[0];
        const secondColor = palette[1];
        
        // Create smooth circular orb
        ctx.beginPath();
        
        const points = 128;
        for (let i = 0; i <= points; i++) {
            const angle = (i / points) * Math.PI * 2;
            
            // Subtle organic deformation
            const deform1 = Math.sin(angle * 3 + this.time * 1.2) * 0.03;
            const deform2 = Math.cos(angle * 5 + this.time * 0.8) * 0.02;
            const audioDeform = Math.sin(angle * 6 + this.time * 2) * this.globalLevel * 0.1;
            
            const radius = baseRadius * 0.85 * (1 + deform1 + deform2 + audioDeform);
            
            const x = this.centerX + Math.cos(angle) * radius;
            const y = this.centerY + Math.sin(angle) * radius;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.closePath();
        
        // Gradient fill
        const gradient = ctx.createRadialGradient(
            this.centerX - baseRadius * 0.3, 
            this.centerY - baseRadius * 0.3, 
            0,
            this.centerX, 
            this.centerY, 
            baseRadius
        );
        
        gradient.addColorStop(0, `hsla(${mainColor.h}, ${mainColor.s}%, ${mainColor.l + 15}%, 0.6)`);
        gradient.addColorStop(0.4, `hsla(${mainColor.h}, ${mainColor.s}%, ${mainColor.l}%, 0.4)`);
        gradient.addColorStop(0.7, `hsla(${secondColor.h}, ${secondColor.s}%, ${secondColor.l}%, 0.3)`);
        gradient.addColorStop(1, `hsla(${secondColor.h}, ${secondColor.s}%, ${secondColor.l - 10}%, 0.1)`);
        
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Add subtle inner highlight
        const highlightGradient = ctx.createRadialGradient(
            this.centerX - baseRadius * 0.25,
            this.centerY - baseRadius * 0.25,
            0,
            this.centerX,
            this.centerY,
            baseRadius * 0.6
        );
        
        highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
        highlightGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.08)');
        highlightGradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = highlightGradient;
        ctx.fill();
    }
    
    drawCore(ctx, palette) {
        const coreRadius = 12 + this.globalLevel * 8;
        const mainColor = palette[0];
        
        // Pulsing core
        const pulseScale = 1 + Math.sin(this.time * 3) * 0.1;
        const finalRadius = coreRadius * pulseScale;
        
        // Outer core glow
        const outerGlow = ctx.createRadialGradient(
            this.centerX, this.centerY, 0,
            this.centerX, this.centerY, finalRadius * 2
        );
        
        outerGlow.addColorStop(0, `hsla(${mainColor.h}, ${mainColor.s}%, 90%, 0.8)`);
        outerGlow.addColorStop(0.3, `hsla(${mainColor.h}, ${mainColor.s}%, ${mainColor.l + 20}%, 0.5)`);
        outerGlow.addColorStop(0.6, `hsla(${mainColor.h}, ${mainColor.s}%, ${mainColor.l}%, 0.2)`);
        outerGlow.addColorStop(1, 'transparent');
        
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, finalRadius * 2, 0, Math.PI * 2);
        ctx.fillStyle = outerGlow;
        ctx.fill();
        
        // Inner bright core
        const coreGradient = ctx.createRadialGradient(
            this.centerX, this.centerY, 0,
            this.centerX, this.centerY, finalRadius
        );
        
        coreGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        coreGradient.addColorStop(0.4, `hsla(${mainColor.h}, 70%, 85%, 0.9)`);
        coreGradient.addColorStop(1, `hsla(${mainColor.h}, ${mainColor.s}%, ${mainColor.l}%, 0.3)`);
        
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, finalRadius, 0, Math.PI * 2);
        ctx.fillStyle = coreGradient;
        ctx.fill();
    }
    
    // Pattern methods for compatibility
    updatePattern(pattern = 'idle') {
        const stateMap = {
            'idle': 'idle',
            'wave': 'listening',
            'pulse': 'thinking',
            'liquid': 'speaking'
        };
        this.currentState = stateMap[pattern] || 'idle';
    }
    
    startPattern(pattern = 'idle') {
        this.updatePattern(pattern);
        if (!this.isActive) {
            this.startAnimation();
        }
    }
    
    // Draw smooth cardinal spline curve through points
    drawSmoothCurve(ctx, points) {
        if (points.length < 3) return;
        
        const tension = 0.2; // Lower = smoother curves
        
        ctx.moveTo(points[0].x, points[0].y);
        
        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[(i - 1 + points.length) % points.length];
            const p1 = points[i];
            const p2 = points[(i + 1) % points.length];
            const p3 = points[(i + 2) % points.length];
            
            // Calculate control points for smooth bezier
            const cp1x = p1.x + (p2.x - p0.x) * tension;
            const cp1y = p1.y + (p2.y - p0.y) * tension;
            const cp2x = p2.x - (p3.x - p1.x) * tension;
            const cp2y = p2.y - (p3.y - p1.y) * tension;
            
            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
        }
        
        ctx.closePath();
    }
    
    // Effect methods
    createLiquidSurge(intensity = 0.5) {
        // Surge effect - boost audio levels temporarily
        this.globalLevel = Math.min(1, this.globalLevel + intensity * 0.5);
    }
    
    createLiquidRipple(x = null, intensity = 0.6) {
        // Ripple effect - create wave disturbance
        this.waves.forEach((wave, i) => {
            wave.amplitude += intensity * 0.3;
            setTimeout(() => {
                wave.amplitude = 0.3 + Math.random() * 0.3;
            }, 500 + i * 100);
        });
    }
    
    destroy() {
        this.isActive = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }
}

// Initialize on page load
let voiceVisualizer;
document.addEventListener('DOMContentLoaded', () => {
    voiceVisualizer = new VoiceVisualizer();
    window.voiceVisualizer = voiceVisualizer;
});
