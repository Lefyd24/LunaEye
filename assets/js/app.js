// LunaEye Main Application Controller
class LunaEyeApp {
    constructor() {
        this.isInitialized = false;
        this.isOnline = navigator.onLine;
        this.startTime = Date.now();
        
        // Application configuration
        this.config = {
            name: 'LunaEye',
            version: '2.0.0',
            apiEndpoint: 'http://100.101.185.10:8000',
            wakeWord: 'Hey Luna',
            autoStart: true,
            autoConnectApi: true,
            debug: true
        };
        
        this.init();
    }
    
    async init() {
        try {
            console.log('Initializing LunaEye v2.0...');
            
            // Wait for DOM
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }
            
            // Check browser compatibility
            this.checkBrowserCompatibility();
            
            // Setup event listeners
            this.setupGlobalEventListeners();
            
            // Wait a moment for other modules to initialize
            await this.delay(100);
            
            // Initialize API connection
            await this.initApiConnection();
            
            // Start the application
            await this.start();
            
            this.isInitialized = true;
            console.log('LunaEye initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize LunaEye:', error);
            this.handleCriticalError(error);
        }
    }
    
    checkBrowserCompatibility() {
        const compatibility = {
            speechRecognition: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window,
            speechSynthesis: 'speechSynthesis' in window,
            webGL: this.checkWebGL(),
            serviceWorker: 'serviceWorker' in navigator,
            mediaDevices: 'mediaDevices' in navigator
        };
        
        console.log('Browser compatibility:', compatibility);
        
        if (!compatibility.webGL) {
            console.warn('WebGL not supported - using fallback visualization');
        }
        
        if (!compatibility.speechRecognition) {
            console.warn('Speech recognition not supported');
            this.showCompatibilityWarning('voice');
        }
        
        return compatibility;
    }
    
    checkWebGL() {
        try {
            const canvas = document.createElement('canvas');
            return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
        } catch (e) {
            return false;
        }
    }
    
    setupGlobalEventListeners() {
        // Network status
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('App is online');
            window.UIController?.showTemporaryMessage('Connected', 2000);
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('App is offline');
            window.UIController?.showTemporaryMessage('Offline - Limited functionality', 3000);
        });
        
        // Page visibility
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                console.log('App hidden');
            } else {
                console.log('App visible');
                // Resume voice recognition if needed
                if (window.VoiceManager && !window.VoiceManager.getStatus().isListening) {
                    window.VoiceManager.startWakeWordDetection();
                }
            }
        });
        
        // Before unload
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
        
        // Error handling
        window.addEventListener('error', (event) => {
            this.logError(event.error);
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            this.logError(event.reason);
        });
    }
    
    async initApiConnection() {
        if (!window.LunaAPI) {
            console.warn('Luna API client not available');
            return;
        }
        
        console.log('Initializing Luna API connection...');
        
        // Setup API event handlers
        window.LunaAPI.onStateChange = (state) => {
            console.log('API state change:', state);
            
            // IMPORTANT: Don't let API override frontend state when speaking
            // The frontend controls state during TTS playback
            if (window.VoiceManager?.getStatus().isSpeaking) {
                console.log('  -> Ignored (frontend is speaking)');
                return;
            }
            
            // Also ignore if we're in conversation mode and API sends idle
            // (let the conversation timeout handle returning to idle)
            if (state === 'idle' && window.VoiceManager?.getStatus().isInConversation) {
                console.log('  -> Ignored (in conversation mode)');
                return;
            }
            
            if (window.AppState) {
                window.AppState.setState(state);
            }
        };
        
        window.LunaAPI.onResponse = (response) => {
            console.log('API response received:', response);
            // Response handling is done in voice.js processCommand
        };
        
        window.LunaAPI.onToolStart = (toolName, args) => {
            console.log('API tool started:', toolName, args);
            window.UIController?.showTemporaryMessage(`Using ${toolName}...`, 2000);
        };
        
        window.LunaAPI.onError = (error) => {
            console.error('API error:', error);
            window.UIController?.showTemporaryMessage('API Error: ' + error, 3000);
        };
        
        window.LunaAPI.onConnectionChange = (connected) => {
            console.log('API connection changed:', connected);
            if (window.UIController) {
                window.UIController.updateApiStatusIndicator(connected);
            }
            if (connected) {
                window.UIController?.showTemporaryMessage('Connected to Luna', 2000);
            }
        };
        
        // Auto-connect if configured
        if (this.config.autoConnectApi) {
            try {
                // First check if server is reachable
                const status = await window.LunaAPI.checkStatus();
                
                if (status.connected) {
                    console.log('Luna server reachable, connecting WebSocket...');
                    
                    if (window.LunaAPI.config.useWebSocket) {
                        await window.LunaAPI.connect();
                    }
                    
                    console.log('Luna API connected successfully');
                } else {
                    console.log('Luna server not reachable, will use offline mode');
                }
            } catch (error) {
                console.warn('Could not connect to Luna API:', error);
            }
        }
    }
    
    async start() {
        console.log('Starting LunaEye application...');
        
        // Set initial state
        window.AppState?.setState('idle');
        
        // Check if we need to request microphone permission
        const hasMicPermission = await this.checkMicrophonePermission();
        
        if (!hasMicPermission) {
            // Show permission modal after a short delay
            setTimeout(() => {
                window.UIController?.showPermissionModal();
            }, 1500);
        } else {
            // Start voice features
            if (window.VoiceManager && this.config.autoStart) {
                try {
                    await window.VoiceManager.startWakeWordDetection();
                    console.log('Voice features started');
                } catch (error) {
                    console.warn('Failed to start voice features:', error);
                }
            }
        }
        
        // Show welcome for first time users
        if (this.isFirstTimeUser()) {
            setTimeout(() => {
                window.UIController?.showTemporaryMessage(
                    `Welcome to LunaEye! Say "${this.config.wakeWord}" to get started.`,
                    5000
                );
            }, 2000);
            localStorage.setItem('lunaeye-visited', 'true');
        }
        
        console.log('LunaEye application started');
    }
    
    async checkMicrophonePermission() {
        try {
            const result = await navigator.permissions.query({ name: 'microphone' });
            return result.state === 'granted';
        } catch (error) {
            // Permissions API not supported, try to request
            return false;
        }
    }
    
    isFirstTimeUser() {
        return !localStorage.getItem('lunaeye-visited');
    }
    
    showCompatibilityWarning(feature) {
        const messages = {
            voice: 'Voice features require Chrome, Edge, or Safari browser.',
            webgl: '3D visualization requires WebGL support.',
            pwa: 'Install feature not available in this browser.'
        };
        
        setTimeout(() => {
            window.UIController?.showTemporaryMessage(messages[feature] || 'Some features may be limited.', 5000);
        }, 3000);
    }
    
    handleCriticalError(error) {
        console.error('Critical error:', error);
        
        window.AppState?.setState('error', { error: error.message });
        
        window.UIController?.showTemporaryMessage(
            'An error occurred. Please refresh the page.',
            10000
        );
    }
    
    logError(error) {
        if (!error) return;
        
        try {
            const errorLog = {
                timestamp: new Date().toISOString(),
                message: error.message || String(error),
                stack: error.stack,
                url: window.location.href
            };
            
            const errors = JSON.parse(localStorage.getItem('lunaeye-errors') || '[]');
            errors.push(errorLog);
            
            // Keep only last 20 errors
            if (errors.length > 20) {
                errors.shift();
            }
            
            localStorage.setItem('lunaeye-errors', JSON.stringify(errors));
        } catch (e) {
            // Ignore storage errors
        }
    }
    
    cleanup() {
        console.log('Cleaning up LunaEye...');
        
        window.VoiceManager?.destroy();
        window.UIController?.destroy();
        
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isOnline: this.isOnline,
            uptime: Date.now() - this.startTime,
            state: window.AppState?.getCurrentState(),
            voice: window.VoiceManager?.getStatus(),
            ui: window.UIController?.getUIState()
        };
    }
}

// Initialize application
window.LunaEyeApp = new LunaEyeApp();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LunaEyeApp;
}
