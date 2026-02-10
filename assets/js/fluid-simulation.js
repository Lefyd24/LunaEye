// LunaEye 3D Fluid Simulation - Advanced WebGL Visualization
// A mesmerizing fluid dynamics simulation that responds to voice and state

class FluidSimulation {
    constructor(container) {
        this.container = container;
        this.canvas = null;
        this.gl = null;
        this.programs = {};
        this.framebuffers = {};
        this.textures = {};
        
        // Simulation parameters
        this.width = 0;
        this.height = 0;
        this.simWidth = 256;
        this.simHeight = 256;
        
        // State
        this.currentState = 'idle';
        this.excitement = 0.2;
        this.targetExcitement = 0.2;
        this.audioLevel = 0;
        this.time = 0;
        this.lastTime = 0;
        this.isRunning = false;
        
        // Mouse/touch interaction
        this.pointers = [];
        this.lastPointerPos = { x: 0, y: 0 };
        
        // Color schemes for different states
        this.colorSchemes = {
            idle: {
                primary: [0.55, 0.36, 0.96],    // Vibrant purple
                secondary: [0.1, 0.5, 0.9],     // Blue
                accent: [0.9, 0.2, 0.6],        // Pink
                background: [0.02, 0.02, 0.03]  // Near black
            },
            waking: {
                primary: [0.93, 0.29, 0.6],     // Hot magenta
                secondary: [1.0, 0.4, 0.2],     // Orange
                accent: [1.0, 0.8, 0.2],        // Yellow
                background: [0.03, 0.02, 0.03]  // Near black
            },
            listening: {
                primary: [0.02, 0.71, 0.83],    // Vibrant cyan
                secondary: [0.2, 0.4, 1.0],     // Electric blue
                accent: [0.4, 1.0, 0.8],        // Turquoise
                background: [0.02, 0.02, 0.04]  // Near black
            },
            thinking: {
                primary: [0.96, 0.62, 0.04],    // Vibrant amber
                secondary: [1.0, 0.4, 0.0],     // Orange
                accent: [1.0, 0.9, 0.5],        // Light gold
                background: [0.03, 0.02, 0.02]  // Near black
            },
            speaking: {
                primary: [0.06, 0.73, 0.51],    // Vibrant emerald
                secondary: [0.0, 0.7, 0.8],     // Teal
                accent: [0.5, 1.0, 0.7],        // Mint
                background: [0.02, 0.03, 0.02]  // Near black
            },
            error: {
                primary: [0.94, 0.27, 0.27],    // Vibrant red
                secondary: [0.8, 0.0, 0.2],     // Crimson
                accent: [1.0, 0.5, 0.3],        // Coral
                background: [0.03, 0.02, 0.02]  // Near black
            }
        };
        
        this.currentColors = { ...this.colorSchemes.idle };
        this.targetColors = { ...this.colorSchemes.idle };
        
        this.init();
    }
    
    async init() {
        try {
            this.createCanvas();
            this.initWebGL();
            this.createShaders();
            this.createFramebuffers();
            this.setupEventListeners();
            this.start();
            console.log('Fluid simulation initialized');
        } catch (error) {
            console.error('Failed to initialize fluid simulation:', error);
            this.showFallback();
        }
    }
    
    createCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'fluid-canvas';
        this.canvas.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 1;
            pointer-events: auto;
        `;
        this.container.appendChild(this.canvas);
        this.resize();
    }
    
    initWebGL() {
        const options = {
            alpha: true,
            depth: false,
            stencil: false,
            antialias: false,
            preserveDrawingBuffer: false,
            powerPreference: 'high-performance'
        };
        
        this.gl = this.canvas.getContext('webgl2', options);
        if (!this.gl) {
            this.gl = this.canvas.getContext('webgl', options);
        }
        if (!this.gl) {
            throw new Error('WebGL not supported');
        }
        
        const gl = this.gl;
        
        // Check for required extensions
        this.ext = {
            formatRGBA: this.getSupportedFormat(gl, gl.RGBA16F || gl.RGBA, gl.RGBA, gl.HALF_FLOAT || gl.FLOAT),
            formatRG: this.getSupportedFormat(gl, gl.RG16F || gl.RGBA, gl.RG || gl.RGBA, gl.HALF_FLOAT || gl.FLOAT),
            formatR: this.getSupportedFormat(gl, gl.R16F || gl.RGBA, gl.RED || gl.RGBA, gl.HALF_FLOAT || gl.FLOAT)
        };
        
        // Use RGBA as fallback
        if (!this.ext.formatRGBA) {
            this.ext.formatRGBA = { internalFormat: gl.RGBA, format: gl.RGBA, type: gl.UNSIGNED_BYTE };
            this.ext.formatRG = { internalFormat: gl.RGBA, format: gl.RGBA, type: gl.UNSIGNED_BYTE };
            this.ext.formatR = { internalFormat: gl.RGBA, format: gl.RGBA, type: gl.UNSIGNED_BYTE };
        }
        
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
    }
    
    getSupportedFormat(gl, internalFormat, format, type) {
        if (!gl.getExtension('EXT_color_buffer_float') && 
            !gl.getExtension('OES_texture_float') &&
            !gl.getExtension('OES_texture_half_float')) {
            return null;
        }
        
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);
        
        const fb = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        
        const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        gl.deleteTexture(texture);
        gl.deleteFramebuffer(fb);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        
        if (status !== gl.FRAMEBUFFER_COMPLETE) return null;
        
        return { internalFormat, format, type };
    }
    
    createShaders() {
        const gl = this.gl;
        
        // Vertex shader (shared)
        const vertexShader = `
            attribute vec2 aPosition;
            varying vec2 vUv;
            varying vec2 vL;
            varying vec2 vR;
            varying vec2 vT;
            varying vec2 vB;
            uniform vec2 texelSize;
            
            void main() {
                vUv = aPosition * 0.5 + 0.5;
                vL = vUv - vec2(texelSize.x, 0.0);
                vR = vUv + vec2(texelSize.x, 0.0);
                vT = vUv + vec2(0.0, texelSize.y);
                vB = vUv - vec2(0.0, texelSize.y);
                gl_Position = vec4(aPosition, 0.0, 1.0);
            }
        `;
        
        // Splat shader - adds velocity and dye
        const splatShader = `
            precision highp float;
            varying vec2 vUv;
            uniform sampler2D uTarget;
            uniform float aspectRatio;
            uniform vec3 color;
            uniform vec2 point;
            uniform float radius;
            
            void main() {
                vec2 p = vUv - point;
                p.x *= aspectRatio;
                vec3 splat = exp(-dot(p, p) / radius) * color;
                vec3 base = texture2D(uTarget, vUv).xyz;
                gl_FragColor = vec4(base + splat, 1.0);
            }
        `;
        
        // Advection shader - moves fluid
        const advectionShader = `
            precision highp float;
            varying vec2 vUv;
            uniform sampler2D uVelocity;
            uniform sampler2D uSource;
            uniform vec2 texelSize;
            uniform float dt;
            uniform float dissipation;
            
            void main() {
                vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
                vec4 result = dissipation * texture2D(uSource, coord);
                float decay = 0.0005;
                gl_FragColor = max(result - decay, vec4(0.0));
            }
        `;
        
        // Divergence shader
        const divergenceShader = `
            precision highp float;
            varying vec2 vUv;
            varying vec2 vL;
            varying vec2 vR;
            varying vec2 vT;
            varying vec2 vB;
            uniform sampler2D uVelocity;
            
            void main() {
                float L = texture2D(uVelocity, vL).x;
                float R = texture2D(uVelocity, vR).x;
                float T = texture2D(uVelocity, vT).y;
                float B = texture2D(uVelocity, vB).y;
                float div = 0.5 * (R - L + T - B);
                gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
            }
        `;
        
        // Pressure shader
        const pressureShader = `
            precision highp float;
            varying vec2 vUv;
            varying vec2 vL;
            varying vec2 vR;
            varying vec2 vT;
            varying vec2 vB;
            uniform sampler2D uPressure;
            uniform sampler2D uDivergence;
            
            void main() {
                float L = texture2D(uPressure, vL).x;
                float R = texture2D(uPressure, vR).x;
                float T = texture2D(uPressure, vT).x;
                float B = texture2D(uPressure, vB).x;
                float C = texture2D(uPressure, vUv).x;
                float divergence = texture2D(uDivergence, vUv).x;
                float pressure = (L + R + B + T - divergence) * 0.25;
                gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
            }
        `;
        
        // Gradient subtract shader
        const gradientShader = `
            precision highp float;
            varying vec2 vUv;
            varying vec2 vL;
            varying vec2 vR;
            varying vec2 vT;
            varying vec2 vB;
            uniform sampler2D uPressure;
            uniform sampler2D uVelocity;
            
            void main() {
                float L = texture2D(uPressure, vL).x;
                float R = texture2D(uPressure, vR).x;
                float T = texture2D(uPressure, vT).x;
                float B = texture2D(uPressure, vB).x;
                vec2 velocity = texture2D(uVelocity, vUv).xy;
                velocity.xy -= vec2(R - L, T - B);
                gl_FragColor = vec4(velocity, 0.0, 1.0);
            }
        `;
        
        // Display shader - renders clean, minimal fluid output
        const displayShader = `
            precision highp float;
            varying vec2 vUv;
            uniform sampler2D uTexture;
            uniform sampler2D uDye;
            uniform float time;
            uniform vec3 primaryColor;
            uniform vec3 secondaryColor;
            uniform vec3 accentColor;
            uniform vec3 backgroundColor;
            uniform float excitement;
            uniform float audioLevel;
            
            void main() {
                vec2 uv = vUv;
                
                // Get fluid dye data
                vec4 dye = texture2D(uDye, uv);
                
                // Start with pure dark background
                vec3 color = backgroundColor;
                
                // Add smooth dye with vibrant colors
                float dyeIntensity = length(dye.rgb);
                color = mix(color, dye.rgb, dyeIntensity * 0.9);
                
                // Add subtle center glow
                vec2 center = uv - 0.5;
                float centerDist = length(center);
                float centerGlow = smoothstep(0.6, 0.0, centerDist);
                color += primaryColor * centerGlow * (0.15 + excitement * 0.2);
                
                // Simple vignette for depth
                float vignette = 1.0 - smoothstep(0.4, 0.9, centerDist);
                color *= vignette * 0.9 + 0.1;
                
                // Clean tone mapping
                color = color / (1.0 + color);
                color = pow(color, vec3(0.95));
                
                gl_FragColor = vec4(color, 1.0);
            }
        `;
        
        // Compile shaders
        this.programs.splat = this.createProgram(vertexShader, splatShader);
        this.programs.advection = this.createProgram(vertexShader, advectionShader);
        this.programs.divergence = this.createProgram(vertexShader, divergenceShader);
        this.programs.pressure = this.createProgram(vertexShader, pressureShader);
        this.programs.gradient = this.createProgram(vertexShader, gradientShader);
        this.programs.display = this.createProgram(vertexShader, displayShader);
        
        // Create vertex buffer
        const vertices = new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]);
        const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);
        
        const vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        
        const indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
    }
    
    createProgram(vertexSource, fragmentSource) {
        const gl = this.gl;
        
        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, vertexSource);
        gl.compileShader(vertexShader);
        
        if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
            console.error('Vertex shader error:', gl.getShaderInfoLog(vertexShader));
        }
        
        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, fragmentSource);
        gl.compileShader(fragmentShader);
        
        if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
            console.error('Fragment shader error:', gl.getShaderInfoLog(fragmentShader));
        }
        
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Program link error:', gl.getProgramInfoLog(program));
        }
        
        // Get uniform locations
        const uniforms = {};
        const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < uniformCount; i++) {
            const uniformInfo = gl.getActiveUniform(program, i);
            uniforms[uniformInfo.name] = gl.getUniformLocation(program, uniformInfo.name);
        }
        
        // Get attribute locations
        const positionLocation = gl.getAttribLocation(program, 'aPosition');
        
        return { program, uniforms, positionLocation };
    }
    
    createFramebuffers() {
        const gl = this.gl;
        const simRes = this.getResolution(this.simWidth);
        const dyeRes = this.getResolution(this.simWidth * 2);
        
        this.texelSize = { x: 1.0 / simRes.width, y: 1.0 / simRes.height };
        this.dyeTexelSize = { x: 1.0 / dyeRes.width, y: 1.0 / dyeRes.height };
        
        this.velocity = this.createDoubleFBO(simRes.width, simRes.height, this.ext.formatRG || this.ext.formatRGBA);
        this.dye = this.createDoubleFBO(dyeRes.width, dyeRes.height, this.ext.formatRGBA);
        this.pressure = this.createDoubleFBO(simRes.width, simRes.height, this.ext.formatR || this.ext.formatRGBA);
        this.divergence = this.createFBO(simRes.width, simRes.height, this.ext.formatR || this.ext.formatRGBA);
    }
    
    getResolution(resolution) {
        const aspectRatio = this.width / this.height;
        if (aspectRatio < 1) {
            return { width: Math.round(resolution), height: Math.round(resolution / aspectRatio) };
        } else {
            return { width: Math.round(resolution * aspectRatio), height: Math.round(resolution) };
        }
    }
    
    createFBO(width, height, format) {
        const gl = this.gl;
        
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, format.internalFormat, width, height, 0, format.format, format.type, null);
        
        const fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        gl.viewport(0, 0, width, height);
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        return { texture, fbo, width, height };
    }
    
    createDoubleFBO(width, height, format) {
        return {
            read: this.createFBO(width, height, format),
            write: this.createFBO(width, height, format),
            swap: function() {
                const temp = this.read;
                this.read = this.write;
                this.write = temp;
            }
        };
    }
    
    setupEventListeners() {
        // Resize handler
        window.addEventListener('resize', () => this.resize());
        
        // Mouse interaction
        this.canvas.addEventListener('mousemove', (e) => this.onPointerMove(e));
        this.canvas.addEventListener('mousedown', (e) => this.onPointerDown(e));
        
        // Touch interaction
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            for (const touch of e.touches) {
                this.onPointerMove(touch);
            }
        }, { passive: false });
        
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            for (const touch of e.touches) {
                this.onPointerDown(touch);
            }
        }, { passive: false });
    }
    
    onPointerDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = 1.0 - (e.clientY - rect.top) / rect.height;
        
        this.lastPointerPos = { x, y };
        this.splat(x, y, 0, 0, true);
    }
    
    onPointerMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = 1.0 - (e.clientY - rect.top) / rect.height;
        
        const dx = x - this.lastPointerPos.x;
        const dy = y - this.lastPointerPos.y;
        
        if (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001) {
            this.splat(x, y, dx * 10, dy * 10, false);
        }
        
        this.lastPointerPos = { x, y };
    }
    
    splat(x, y, dx, dy, isClick) {
        const colors = this.currentColors;
        const intensity = isClick ? 1.5 : 0.8;
        
        // Random color from scheme
        const colorChoice = Math.random();
        let color;
        if (colorChoice < 0.4) {
            color = colors.primary;
        } else if (colorChoice < 0.7) {
            color = colors.secondary;
        } else {
            color = colors.accent;
        }
        
        // Add velocity
        this.splatVelocity(x, y, dx * 100, dy * 100);
        
        // Add dye
        this.splatDye(x, y, color, intensity);
    }
    
    splatVelocity(x, y, dx, dy) {
        const gl = this.gl;
        const program = this.programs.splat;
        
        gl.useProgram(program.program);
        gl.uniform1i(program.uniforms.uTarget, 0);
        gl.uniform1f(program.uniforms.aspectRatio, this.width / this.height);
        gl.uniform2f(program.uniforms.point, x, y);
        gl.uniform3f(program.uniforms.color, dx, dy, 0);
        gl.uniform1f(program.uniforms.radius, 0.0001);
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.velocity.write.fbo);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.velocity.read.texture);
        
        this.blit(this.velocity.write);
        this.velocity.swap();
    }
    
    splatDye(x, y, color, intensity) {
        const gl = this.gl;
        const program = this.programs.splat;
        
        gl.useProgram(program.program);
        gl.uniform1i(program.uniforms.uTarget, 0);
        gl.uniform1f(program.uniforms.aspectRatio, this.width / this.height);
        gl.uniform2f(program.uniforms.point, x, y);
        gl.uniform3f(program.uniforms.color, color[0] * intensity, color[1] * intensity, color[2] * intensity);
        gl.uniform1f(program.uniforms.radius, 0.0005);
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.dye.write.fbo);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.dye.read.texture);
        
        this.blit(this.dye.write);
        this.dye.swap();
    }
    
    blit(target) {
        const gl = this.gl;
        gl.viewport(0, 0, target.width, target.height);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    }
    
    resize() {
        const dpr = Math.min(window.devicePixelRatio, 2);
        this.width = this.canvas.clientWidth * dpr;
        this.height = this.canvas.clientHeight * dpr;
        
        if (this.canvas.width !== this.width || this.canvas.height !== this.height) {
            this.canvas.width = this.width;
            this.canvas.height = this.height;
            
            if (this.gl) {
                this.createFramebuffers();
            }
        }
    }
    
    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastTime = performance.now();
        this.animate();
    }
    
    stop() {
        this.isRunning = false;
    }
    
    animate() {
        if (!this.isRunning) return;
        
        const now = performance.now();
        const dt = Math.min((now - this.lastTime) / 1000, 0.016);
        this.lastTime = now;
        this.time += dt;
        
        this.update(dt);
        this.render();
        
        requestAnimationFrame(() => this.animate());
    }
    
    update(dt) {
        // Smooth color transitions
        this.lerpColors(dt * 2);
        
        // Smooth excitement transition
        this.excitement += (this.targetExcitement - this.excitement) * dt * 3;
        
        // Add automatic splats based on excitement
        if (Math.random() < this.excitement * 0.3) {
            const x = Math.random();
            const y = Math.random();
            const angle = Math.random() * Math.PI * 2;
            const speed = (10 + this.excitement * 30) * (0.5 + Math.random());
            this.splat(x, y, Math.cos(angle) * speed * 0.01, Math.sin(angle) * speed * 0.01, false);
        }
        
        // Audio-reactive splats
        if (this.audioLevel > 0.1 && Math.random() < this.audioLevel * 0.5) {
            const x = 0.5 + (Math.random() - 0.5) * 0.5;
            const y = 0.5 + (Math.random() - 0.5) * 0.5;
            const angle = Math.random() * Math.PI * 2;
            const speed = this.audioLevel * 50;
            this.splat(x, y, Math.cos(angle) * speed * 0.01, Math.sin(angle) * speed * 0.01, false);
        }
        
        // Run simulation steps
        this.step(dt);
    }
    
    step(dt) {
        const gl = this.gl;
        
        // Advection
        gl.useProgram(this.programs.advection.program);
        gl.uniform2f(this.programs.advection.uniforms.texelSize, this.texelSize.x, this.texelSize.y);
        gl.uniform1i(this.programs.advection.uniforms.uVelocity, 0);
        gl.uniform1i(this.programs.advection.uniforms.uSource, 0);
        gl.uniform1f(this.programs.advection.uniforms.dt, dt);
        gl.uniform1f(this.programs.advection.uniforms.dissipation, 0.98);
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.velocity.write.fbo);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.velocity.read.texture);
        this.blit(this.velocity.write);
        this.velocity.swap();
        
        // Advect dye
        gl.uniform1f(this.programs.advection.uniforms.dissipation, 0.97);
        gl.uniform1i(this.programs.advection.uniforms.uSource, 1);
        gl.uniform2f(this.programs.advection.uniforms.texelSize, this.dyeTexelSize.x, this.dyeTexelSize.y);
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.dye.write.fbo);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.velocity.read.texture);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.dye.read.texture);
        this.blit(this.dye.write);
        this.dye.swap();
        
        // Divergence
        gl.useProgram(this.programs.divergence.program);
        gl.uniform2f(this.programs.divergence.uniforms.texelSize, this.texelSize.x, this.texelSize.y);
        gl.uniform1i(this.programs.divergence.uniforms.uVelocity, 0);
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.divergence.fbo);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.velocity.read.texture);
        this.blit(this.divergence);
        
        // Clear pressure
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.pressure.read.fbo);
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        // Pressure iterations
        gl.useProgram(this.programs.pressure.program);
        gl.uniform2f(this.programs.pressure.uniforms.texelSize, this.texelSize.x, this.texelSize.y);
        gl.uniform1i(this.programs.pressure.uniforms.uDivergence, 0);
        gl.uniform1i(this.programs.pressure.uniforms.uPressure, 1);
        
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.divergence.texture);
        
        for (let i = 0; i < 20; i++) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.pressure.write.fbo);
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, this.pressure.read.texture);
            this.blit(this.pressure.write);
            this.pressure.swap();
        }
        
        // Gradient subtract
        gl.useProgram(this.programs.gradient.program);
        gl.uniform2f(this.programs.gradient.uniforms.texelSize, this.texelSize.x, this.texelSize.y);
        gl.uniform1i(this.programs.gradient.uniforms.uPressure, 0);
        gl.uniform1i(this.programs.gradient.uniforms.uVelocity, 1);
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.velocity.write.fbo);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.pressure.read.texture);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.velocity.read.texture);
        this.blit(this.velocity.write);
        this.velocity.swap();
    }
    
    render() {
        const gl = this.gl;
        const program = this.programs.display;
        const colors = this.currentColors;
        
        gl.useProgram(program.program);
        gl.uniform1i(program.uniforms.uTexture, 0);
        gl.uniform1i(program.uniforms.uDye, 1);
        gl.uniform1f(program.uniforms.time, this.time);
        gl.uniform3f(program.uniforms.primaryColor, colors.primary[0], colors.primary[1], colors.primary[2]);
        gl.uniform3f(program.uniforms.secondaryColor, colors.secondary[0], colors.secondary[1], colors.secondary[2]);
        gl.uniform3f(program.uniforms.accentColor, colors.accent[0], colors.accent[1], colors.accent[2]);
        gl.uniform3f(program.uniforms.backgroundColor, colors.background[0], colors.background[1], colors.background[2]);
        gl.uniform1f(program.uniforms.excitement, this.excitement);
        gl.uniform1f(program.uniforms.audioLevel, this.audioLevel);
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, this.width, this.height);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.velocity.read.texture);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.dye.read.texture);
        
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    }
    
    setState(state) {
        if (this.currentState === state) return;
        
        this.currentState = state;
        this.targetColors = { ...this.colorSchemes[state] || this.colorSchemes.idle };
        
        // Adjust excitement based on state
        const excitementLevels = {
            idle: 0.2,
            waking: 0.8,
            listening: 0.5,
            thinking: 0.6,
            speaking: 0.7,
            error: 0.3
        };
        
        this.targetExcitement = excitementLevels[state] || 0.2;
        
        // Trigger splat burst on state change
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                const x = 0.5 + (Math.random() - 0.5) * 0.3;
                const y = 0.5 + (Math.random() - 0.5) * 0.3;
                const angle = Math.random() * Math.PI * 2;
                const speed = 30 + Math.random() * 20;
                this.splat(x, y, Math.cos(angle) * speed * 0.01, Math.sin(angle) * speed * 0.01, true);
            }, i * 50);
        }
    }
    
    setExcitement(level) {
        this.targetExcitement = Math.max(0, Math.min(1, level));
    }
    
    setAudioLevel(level) {
        this.audioLevel = Math.max(0, Math.min(1, level));
    }
    
    lerpColors(factor) {
        const lerp = (a, b, t) => a + (b - a) * t;
        const lerpColor = (current, target, t) => [
            lerp(current[0], target[0], t),
            lerp(current[1], target[1], t),
            lerp(current[2], target[2], t)
        ];
        
        this.currentColors.primary = lerpColor(this.currentColors.primary, this.targetColors.primary, factor);
        this.currentColors.secondary = lerpColor(this.currentColors.secondary, this.targetColors.secondary, factor);
        this.currentColors.accent = lerpColor(this.currentColors.accent, this.targetColors.accent, factor);
        this.currentColors.background = lerpColor(this.currentColors.background, this.targetColors.background, factor);
    }
    
    showFallback() {
        // Show a CSS-based fallback if WebGL fails
        const fallback = document.createElement('div');
        fallback.className = 'fluid-fallback';
        fallback.innerHTML = `
            <div class="fallback-gradient"></div>
            <div class="fallback-particles"></div>
        `;
        this.container.appendChild(fallback);
    }
    
    destroy() {
        this.stop();
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
        // Clean up WebGL resources
        if (this.gl) {
            const gl = this.gl;
            Object.values(this.programs).forEach(p => gl.deleteProgram(p.program));
        }
    }
}

// Export
window.FluidSimulation = FluidSimulation;

if (typeof module !== 'undefined' && module.exports) {
    module.exports = FluidSimulation;
}
