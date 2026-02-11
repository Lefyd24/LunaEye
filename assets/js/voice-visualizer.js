// Voice Visualizer - Siri-Inspired Fluid Orb
// Beautiful flowing gradient waves with smooth audio-reactive animations
// Enhanced with morphing blobs, liquid effects, and multi-layer glow

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
        
        // Siri-like morphing blobs (replacing static waves)
        this.blobs = [];
        this.numBlobs = 8;
        
        // Legacy wave support for compatibility
        this.waves = [];
        this.numWaves = 6;
        
        // Audio smoothing with finer granularity
        this.smoothedLevels = new Array(16).fill(0);
        this.globalLevel = 0;
        this.targetLevel = 0;
        this.peakLevel = 0;
        this.peakDecay = 0.95;
        
        // Color transition smoothing
        this.currentColors = null;
        this.targetColors = null;
        this.colorTransitionSpeed = 0.02; // Slow cross-fade
        
        // Ripple effects
        this.ripples = [];
        this.maxRipples = 5;
        
        // Breathing animation
        this.breathPhase = 0;
        this.breathSpeed = 0.8;
        
        // Current state
        this.currentState = 'idle';
        this.previousState = 'idle';
        this.stateTransitionProgress = 1;
        
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
        this.initializeMorphingBlobs();
        this.initializeWaves();
        this.initializeColors();
        console.log('🌊 Siri-style Voice Visualizer initialized with morphing blobs');
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
    
    // Initialize morphing blob system for organic liquid motion
    initializeMorphingBlobs() {
        this.blobs = [];
        for (let i = 0; i < this.numBlobs; i++) {
            this.blobs.push({
                // Position within the orb
                angle: (i / this.numBlobs) * Math.PI * 2,
                radius: 0.6 + Math.random() * 0.3,
                
                // Morphing parameters
                morphSpeed: 0.3 + Math.random() * 0.4,
                morphPhase: Math.random() * Math.PI * 2,
                morphAmplitude: 0.15 + Math.random() * 0.15,
                
                // Rotation
                rotationSpeed: (Math.random() - 0.5) * 0.3,
                rotationOffset: Math.random() * Math.PI * 2,
                
                // Visual properties
                size: 0.3 + Math.random() * 0.2,
                colorIndex: i % 6,
                opacity: 0.4 + Math.random() * 0.3,
                
                // Audio reactivity
                audioSensitivity: 0.5 + Math.random() * 0.5,
                frequencyBand: i % 8
            });
        }
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
    
    // Initialize color interpolation system
    initializeColors() {
        const palette = this.colorPalettes[this.currentState] || this.colorPalettes.idle;
        this.currentColors = palette.map(c => ({ ...c }));
        this.targetColors = palette.map(c => ({ ...c }));
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
        if (this.currentState !== state) {
            this.previousState = this.currentState;
            this.currentState = state;
            this.stateTransitionProgress = 0;
            
            // Update target colors for smooth cross-fade
            const newPalette = this.colorPalettes[state] || this.colorPalettes.idle;
            this.targetColors = newPalette.map(c => ({ ...c }));
            
            // Create ripple effect on state change
            this.createRipple(this.centerX, this.centerY, 0.8);
            
            console.log(`🎨 Visualizer state: ${this.previousState} → ${state}`);
        }
    }
    
    // Create ripple effect emanating from orb
    createRipple(x, y, intensity = 0.6) {
        if (this.ripples.length >= this.maxRipples) {
            this.ripples.shift();
        }
        
        this.ripples.push({
            x: x,
            y: y,
            radius: this.baseRadius * 0.5,
            maxRadius: this.baseRadius * 3,
            intensity: intensity,
            opacity: intensity,
            speed: 1.5 + intensity
        });
    }
    
    // Update ripples animation
    updateRipples(dt) {
        this.ripples = this.ripples.filter(ripple => {
            ripple.radius += ripple.speed * dt * 60;
            ripple.opacity -= 0.02 * dt * 60;
            return ripple.opacity > 0 && ripple.radius < ripple.maxRadius;
        });
    }
    
    startAnimation() {
        this.isActive = true;
        let lastTime = performance.now();
        
        const animate = (currentTime) => {
            if (!this.isActive) return;
            
            this.animationId = requestAnimationFrame(animate);
            
            // Calculate delta time for smooth animation
            const dt = Math.min((currentTime - lastTime) / 1000, 0.033);
            lastTime = currentTime;
            
            this.time += dt;
            this.breathPhase += dt * this.breathSpeed;
            
            // Update color transition
            this.updateColorTransition(dt);
            
            // Update ripples
            this.updateRipples(dt);
            
            // Update state transition progress
            if (this.stateTransitionProgress < 1) {
                this.stateTransitionProgress = Math.min(1, this.stateTransitionProgress + dt * 2);
            }
            
            // Get audio levels if connected
            this.updateAudioLevels();
            
            // Render the Siri-style orb
            this.render();
        };
        
        animate(performance.now());
    }
    
    // Smooth color interpolation between states
    updateColorTransition(dt) {
        if (!this.currentColors || !this.targetColors) return;
        
        const speed = this.colorTransitionSpeed * dt * 60;
        
        for (let i = 0; i < this.currentColors.length; i++) {
            this.currentColors[i].h = this.lerpAngle(this.currentColors[i].h, this.targetColors[i].h, speed);
            this.currentColors[i].s = this.lerp(this.currentColors[i].s, this.targetColors[i].s, speed);
            this.currentColors[i].l = this.lerp(this.currentColors[i].l, this.targetColors[i].l, speed);
        }
    }
    
    // Linear interpolation helper
    lerp(a, b, t) {
        return a + (b - a) * t;
    }
    
    // Angle interpolation for hue (handles wrap-around)
    lerpAngle(a, b, t) {
        let diff = b - a;
        while (diff > 180) diff -= 360;
        while (diff < -180) diff += 360;
        return a + diff * t;
    }
    
    // Interpolate between two colors
    interpolateColors(color1, color2, t) {
        return {
            h: this.lerpAngle(color1.h, color2.h, t),
            s: this.lerp(color1.s, color2.s, t),
            l: this.lerp(color1.l, color2.l, t)
        };
    }
    
    updateAudioLevels() {
        if (this.analyser && this.dataArray) {
            this.analyser.getByteFrequencyData(this.dataArray);
            
            // Calculate frequency band levels with better sensitivity
            const bands = 16;
            const bandSize = Math.floor(this.dataArray.length / bands);
            
            let maxLevel = 0;
            let weightedSum = 0;
            let weightTotal = 0;
            
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
                const level = avgLevel * 0.5 + peakLevel * 0.5;
                
                // Smoother transitions - slower attack, even slower decay
                const smoothing = level > this.smoothedLevels[i] ? 0.35 : 0.12;
                this.smoothedLevels[i] += (level - this.smoothedLevels[i]) * smoothing;
                maxLevel = Math.max(maxLevel, this.smoothedLevels[i]);
                
                // Weight by frequency (emphasize mid-range for voice)
                const weight = 1 - Math.abs(i - bands / 2) / (bands / 2) * 0.5;
                weightedSum += this.smoothedLevels[i] * weight;
                weightTotal += weight;
            }
            
            // Global audio level - weighted blend for voice optimization
            const avgSum = weightedSum / weightTotal;
            this.targetLevel = avgSum * 0.55 + maxLevel * 0.45;
            
            // Update peak level with decay
            if (this.targetLevel > this.peakLevel) {
                this.peakLevel = this.targetLevel;
            } else {
                this.peakLevel *= this.peakDecay;
            }
            
            // Trigger ripple on audio spike
            if (this.targetLevel > 0.5 && this.targetLevel > this.globalLevel * 1.5) {
                this.createRipple(this.centerX, this.centerY, this.targetLevel * 0.6);
            }
            
            // Add subtle idle breathing even with audio
            const idleBreathing = 0.06 + Math.sin(this.breathPhase) * 0.03;
            this.targetLevel = Math.max(this.targetLevel, idleBreathing);
        } else {
            // Simulate gentle idle movement when no audio
            const breath1 = Math.sin(this.breathPhase) * 0.05;
            const breath2 = Math.sin(this.breathPhase * 1.7 + 0.5) * 0.03;
            const breath3 = Math.sin(this.breathPhase * 0.3) * 0.02;
            this.targetLevel = 0.1 + breath1 + breath2 + breath3;
        }
        
        // Smooth global level with gentler smoothing for fluid motion
        const globalSmoothing = this.targetLevel > this.globalLevel ? 0.1 : 0.04;
        this.globalLevel += (this.targetLevel - this.globalLevel) * globalSmoothing;
    }
    
    render() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        
        // Clear with slight trail for smoothness (darker for better glow contrast)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
        ctx.fillRect(0, 0, w, h);
        
        // Get current interpolated color palette
        const palette = this.currentColors || this.colorPalettes[this.currentState] || this.colorPalettes.idle;
        
        // Calculate dynamic radius based on audio with breathing
        const breathScale = 1 + Math.sin(this.breathPhase) * 0.03;
        const audioBoost = this.currentState === 'idle' ? 0.3 : 1.0;
        const dynamicRadius = (this.baseRadius + (this.globalLevel * 35 * audioBoost)) * breathScale;
        
        // Draw ambient glow (bleeds into background)
        this.drawAmbientGlow(ctx, palette, dynamicRadius);
        
        // Draw ripple effects
        this.drawRipples(ctx, palette);
        
        // Draw outer glow layers (multi-layered for depth)
        this.drawMultiLayerGlow(ctx, palette, dynamicRadius);
        
        // Draw morphing blobs
        this.drawMorphingBlobs(ctx, palette, dynamicRadius);
        
        // Draw the main orb with multiple wave layers
        this.drawSiriOrb(ctx, palette, dynamicRadius);
        
        // Draw audio waveform when listening/speaking
        if (['listening', 'speaking'].includes(this.currentState)) {
            this.drawAudioWaveform(ctx, palette, dynamicRadius);
        }
        
        // Draw inner core with enhanced glow
        this.drawCore(ctx, palette);
    }
    
    // Ambient light that bleeds into background
    drawAmbientGlow(ctx, palette, radius) {
        const mainColor = palette[0];
        const ambientRadius = radius * 4;
        
        const gradient = ctx.createRadialGradient(
            this.centerX, this.centerY, 0,
            this.centerX, this.centerY, ambientRadius
        );
        
        gradient.addColorStop(0, `hsla(${mainColor.h}, ${mainColor.s}%, ${mainColor.l}%, 0.15)`);
        gradient.addColorStop(0.3, `hsla(${mainColor.h}, ${mainColor.s}%, ${mainColor.l}%, 0.08)`);
        gradient.addColorStop(0.6, `hsla(${mainColor.h}, ${mainColor.s}%, ${mainColor.l}%, 0.03)`);
        gradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    // Draw ripple effects emanating from orb
    drawRipples(ctx, palette) {
        const mainColor = palette[0];
        
        for (const ripple of this.ripples) {
            ctx.beginPath();
            ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
            ctx.strokeStyle = `hsla(${mainColor.h}, ${mainColor.s}%, ${mainColor.l + 20}%, ${ripple.opacity * 0.5})`;
            ctx.lineWidth = 2 + ripple.intensity * 3;
            ctx.stroke();
            
            // Inner ripple glow
            const gradient = ctx.createRadialGradient(
                ripple.x, ripple.y, ripple.radius * 0.9,
                ripple.x, ripple.y, ripple.radius * 1.1
            );
            gradient.addColorStop(0, 'transparent');
            gradient.addColorStop(0.5, `hsla(${mainColor.h}, ${mainColor.s}%, ${mainColor.l}%, ${ripple.opacity * 0.2})`);
            gradient.addColorStop(1, 'transparent');
            
            ctx.fillStyle = gradient;
            ctx.fill();
        }
    }
    
    // Multi-layered glow for depth effect
    drawMultiLayerGlow(ctx, palette, radius) {
        const mainColor = palette[0];
        const secondColor = palette[1];
        
        // Layer 1: Outermost diffuse glow
        const glow1 = ctx.createRadialGradient(
            this.centerX, this.centerY, radius * 0.6,
            this.centerX, this.centerY, radius * 2.5
        );
        glow1.addColorStop(0, `hsla(${mainColor.h}, ${mainColor.s}%, ${mainColor.l}%, 0.25)`);
        glow1.addColorStop(0.4, `hsla(${mainColor.h}, ${mainColor.s}%, ${mainColor.l}%, 0.12)`);
        glow1.addColorStop(1, 'transparent');
        
        ctx.fillStyle = glow1;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Layer 2: Mid-range colored glow
        const glow2 = ctx.createRadialGradient(
            this.centerX, this.centerY, radius * 0.7,
            this.centerX, this.centerY, radius * 1.8
        );
        glow2.addColorStop(0, `hsla(${secondColor.h}, ${secondColor.s}%, ${secondColor.l}%, 0.2)`);
        glow2.addColorStop(0.5, `hsla(${mainColor.h}, ${mainColor.s}%, ${mainColor.l}%, 0.1)`);
        glow2.addColorStop(1, 'transparent');
        
        ctx.fillStyle = glow2;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Layer 3: Inner intense glow
        const glow3 = ctx.createRadialGradient(
            this.centerX, this.centerY, radius * 0.5,
            this.centerX, this.centerY, radius * 1.3
        );
        glow3.addColorStop(0, `hsla(${mainColor.h}, ${mainColor.s}%, ${mainColor.l + 15}%, 0.35)`);
        glow3.addColorStop(0.6, `hsla(${mainColor.h}, ${mainColor.s}%, ${mainColor.l}%, 0.15)`);
        glow3.addColorStop(1, 'transparent');
        
        ctx.fillStyle = glow3;
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
            const bandIndex = w % Math.min(this.smoothedLevels.length, 8);
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
                const pointBandIndex = Math.floor((i / points) * Math.min(this.smoothedLevels.length, 8));
                const pointAudioLevel = this.smoothedLevels[pointBandIndex] || blendedBandLevel;
                
                // Gentler, smoother sine waves with lower frequencies
                const wave1 = Math.sin(angle * wave.frequency + waveTime) * wave.amplitude;
                const wave2 = Math.sin(angle * (wave.frequency * 0.5) + waveTime * 0.8 + wave.offset) * wave.amplitude * 0.4;
                const wave3 = Math.cos(angle * 1.5 + waveTime * 0.5) * wave.amplitude * 0.25;
                
                // Smoother audio-reactive component
                const audioWave = Math.sin(angle * 2 + this.time * 2) * pointAudioLevel * audioInfluence * 0.4;
                const audioPulse = pointAudioLevel * audioInfluence * 0.2;
                
                // Gentle breathing effect
                const breathe = Math.sin(this.breathPhase + w * 0.4) * 0.05;
                
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
    
    // Draw morphing blob shapes for organic liquid motion
    drawMorphingBlobs(ctx, palette, baseRadius) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        
        for (const blob of this.blobs) {
            const color = palette[blob.colorIndex];
            
            // Get audio level for this blob's frequency band
            const audioLevel = this.smoothedLevels[blob.frequencyBand] || 0;
            const audioInfluence = audioLevel * blob.audioSensitivity;
            
            // Calculate blob position with rotation
            const rotationAngle = blob.angle + this.time * blob.rotationSpeed + blob.rotationOffset;
            const morphOffset = Math.sin(this.time * blob.morphSpeed + blob.morphPhase) * blob.morphAmplitude;
            
            const blobRadius = baseRadius * (blob.radius + morphOffset + audioInfluence * 0.3);
            const blobX = this.centerX + Math.cos(rotationAngle) * blobRadius * 0.3;
            const blobY = this.centerY + Math.sin(rotationAngle) * blobRadius * 0.3;
            const blobSize = baseRadius * (blob.size + audioInfluence * 0.2);
            
            // Draw blob with morphing border-radius simulation
            ctx.beginPath();
            
            const blobPoints = 32;
            for (let i = 0; i <= blobPoints; i++) {
                const angle = (i / blobPoints) * Math.PI * 2;
                
                // Organic morphing shape
                const morph1 = Math.sin(angle * 2 + this.time * blob.morphSpeed) * 0.2;
                const morph2 = Math.cos(angle * 3 + this.time * blob.morphSpeed * 0.7) * 0.15;
                const morph3 = Math.sin(angle * 5 + this.time * blob.morphSpeed * 1.3) * 0.1;
                const audioMorph = Math.sin(angle * 4 + this.time * 2) * audioLevel * 0.15;
                
                const morphedRadius = blobSize * (1 + morph1 + morph2 + morph3 + audioMorph);
                
                const px = blobX + Math.cos(angle) * morphedRadius;
                const py = blobY + Math.sin(angle) * morphedRadius;
                
                if (i === 0) {
                    ctx.moveTo(px, py);
                } else {
                    ctx.lineTo(px, py);
                }
            }
            
            ctx.closePath();
            
            // Gradient fill for liquid look
            const gradient = ctx.createRadialGradient(
                blobX, blobY, 0,
                blobX, blobY, blobSize * 1.5
            );
            
            const opacity = blob.opacity * (0.5 + audioLevel * 0.5);
            gradient.addColorStop(0, `hsla(${color.h}, ${color.s}%, ${color.l + 20}%, ${opacity * 0.6})`);
            gradient.addColorStop(0.5, `hsla(${color.h}, ${color.s}%, ${color.l}%, ${opacity * 0.3})`);
            gradient.addColorStop(1, `hsla(${color.h}, ${color.s}%, ${color.l - 10}%, 0)`);
            
            ctx.fillStyle = gradient;
            ctx.fill();
        }
        
        ctx.restore();
    }
    
    // Draw audio-reactive waveform around the orb
    drawAudioWaveform(ctx, palette, baseRadius) {
        if (!this.analyser || !this.dataArray) return;
        
        const mainColor = palette[0];
        const waveformRadius = baseRadius * 1.3;
        const waveHeight = 20 + this.globalLevel * 30;
        
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        
        ctx.beginPath();
        
        const segments = 64;
        const dataStep = Math.floor(this.dataArray.length / segments);
        
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2 - Math.PI / 2;
            const dataIndex = (i * dataStep) % this.dataArray.length;
            const value = this.dataArray[dataIndex] / 255;
            
            // Smooth the value
            const smoothValue = this.smoothedLevels[i % this.smoothedLevels.length] || value;
            const amplitude = smoothValue * waveHeight;
            
            const radius = waveformRadius + amplitude;
            const x = this.centerX + Math.cos(angle) * radius;
            const y = this.centerY + Math.sin(angle) * radius;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.closePath();
        
        // Gradient stroke for waveform
        const gradient = ctx.createRadialGradient(
            this.centerX, this.centerY, waveformRadius,
            this.centerX, this.centerY, waveformRadius + waveHeight
        );
        gradient.addColorStop(0, `hsla(${mainColor.h}, ${mainColor.s}%, ${mainColor.l}%, 0.6)`);
        gradient.addColorStop(1, `hsla(${mainColor.h}, ${mainColor.s}%, ${mainColor.l + 20}%, 0.2)`);
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Fill with subtle gradient
        const fillGradient = ctx.createRadialGradient(
            this.centerX, this.centerY, waveformRadius * 0.9,
            this.centerX, this.centerY, waveformRadius + waveHeight
        );
        fillGradient.addColorStop(0, 'transparent');
        fillGradient.addColorStop(0.5, `hsla(${mainColor.h}, ${mainColor.s}%, ${mainColor.l}%, 0.1)`);
        fillGradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = fillGradient;
        ctx.fill();
        
        ctx.restore();
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
        const coreRadius = 12 + this.globalLevel * 10 + this.peakLevel * 5;
        const mainColor = palette[0];
        const secondColor = palette[1] || palette[0];
        
        // Pulsing core with breathing
        const breathPulse = Math.sin(this.breathPhase * 2) * 0.08;
        const audioPulse = Math.sin(this.time * 3) * 0.1 * (1 + this.globalLevel);
        const pulseScale = 1 + breathPulse + audioPulse;
        const finalRadius = coreRadius * pulseScale;
        
        // Layer 1: Outermost diffuse core glow
        const outerGlow = ctx.createRadialGradient(
            this.centerX, this.centerY, 0,
            this.centerX, this.centerY, finalRadius * 3
        );
        outerGlow.addColorStop(0, `hsla(${mainColor.h}, ${mainColor.s}%, 95%, 0.5)`);
        outerGlow.addColorStop(0.2, `hsla(${mainColor.h}, ${mainColor.s}%, ${mainColor.l + 25}%, 0.3)`);
        outerGlow.addColorStop(0.5, `hsla(${mainColor.h}, ${mainColor.s}%, ${mainColor.l}%, 0.15)`);
        outerGlow.addColorStop(1, 'transparent');
        
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, finalRadius * 3, 0, Math.PI * 2);
        ctx.fillStyle = outerGlow;
        ctx.fill();
        
        // Layer 2: Mid glow with color blend
        const midGlow = ctx.createRadialGradient(
            this.centerX, this.centerY, 0,
            this.centerX, this.centerY, finalRadius * 2
        );
        midGlow.addColorStop(0, `hsla(${mainColor.h}, ${mainColor.s}%, 90%, 0.7)`);
        midGlow.addColorStop(0.3, `hsla(${mainColor.h}, ${mainColor.s}%, ${mainColor.l + 20}%, 0.5)`);
        midGlow.addColorStop(0.6, `hsla(${secondColor.h}, ${secondColor.s}%, ${secondColor.l}%, 0.2)`);
        midGlow.addColorStop(1, 'transparent');
        
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, finalRadius * 2, 0, Math.PI * 2);
        ctx.fillStyle = midGlow;
        ctx.fill();
        
        // Layer 3: Inner bright core with holographic shimmer
        const shimmerOffset = Math.sin(this.time * 5) * 2;
        const coreGradient = ctx.createRadialGradient(
            this.centerX + shimmerOffset, this.centerY + shimmerOffset, 0,
            this.centerX, this.centerY, finalRadius * 1.2
        );
        
        coreGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        coreGradient.addColorStop(0.3, `hsla(${mainColor.h}, 60%, 90%, 0.95)`);
        coreGradient.addColorStop(0.6, `hsla(${mainColor.h}, ${mainColor.s}%, ${mainColor.l + 10}%, 0.6)`);
        coreGradient.addColorStop(1, `hsla(${mainColor.h}, ${mainColor.s}%, ${mainColor.l}%, 0.2)`);
        
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, finalRadius, 0, Math.PI * 2);
        ctx.fillStyle = coreGradient;
        ctx.fill();
        
        // Layer 4: Inner highlight for depth
        const innerHighlight = ctx.createRadialGradient(
            this.centerX - finalRadius * 0.3, this.centerY - finalRadius * 0.3, 0,
            this.centerX, this.centerY, finalRadius * 0.8
        );
        innerHighlight.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        innerHighlight.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
        innerHighlight.addColorStop(1, 'transparent');
        
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, finalRadius * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = innerHighlight;
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
