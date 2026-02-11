// LunaEye UI Controller - Manages interface updates and interactions
// Enhanced with audio sync bridge between visualizers

class UIController {
    constructor() {
        this.elements = {};
        this.fluidSimulation = null;
        this.isSettingsOpen = false;
        this.installPrompt = null;
        this.messageTimeout = null;
        this.commDisplayTimeout = null;
        this.commDisplayAutoHideDelay = 60000; // 1 minute
        this.chatHistory = []; // Store chat messages
        this.maxMessages = 4; // Show last 4 messages (2 user + 2 agent)
        this.isTranscribing = false; // Track if we're in the middle of transcribing
        
        // Audio sync bridge
        this.audioSyncActive = false;
        this.audioSyncAnimationId = null;
        this.lastAudioSyncTime = 0;
        this.audioSyncThrottleMs = 16; // ~60fps max update rate
        
        this.init();
    }
    
    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }
    
    setup() {
        this.cacheElements();
        this.initFluidSimulation();
        this.setupEventListeners();
        this.setupStateListeners();
        this.checkInstallPrompt();
        this.loadApiSettings();
        this.initAudioSyncBridge();
        
        console.log('🎨 UI Controller initialized with audio sync bridge');
    }
    
    cacheElements() {
        this.elements = {
            // Main elements
            body: document.body,
            fluidContainer: document.getElementById('fluid-container'),
            
            // Header
            micBtn: document.getElementById('mic-btn'),
            settingsBtn: document.getElementById('settings-btn'),
            statusBadge: document.getElementById('status-badge'),
            
            // Main content
            stateIndicator: document.getElementById('state-indicator'),
            commDisplay: document.querySelector('.comm-display'),
            chatMessages: document.getElementById('chat-messages'),
            
            // Footer
            audioIndicator: document.getElementById('audio-indicator'),
            voiceModeIndicator: document.getElementById('voice-mode-indicator'),
            
            // Settings
            settingsOverlay: document.getElementById('settings-overlay'),
            closeSettings: document.getElementById('close-settings'),
            wakeWordToggle: document.getElementById('wake-word-toggle'),
            continuousToggle: document.getElementById('continuous-toggle'),
            fluidIntensity: document.getElementById('fluid-intensity'),
            
            // API Settings
            apiUrlInput: document.getElementById('api-url-input'),
            apiPortInput: document.getElementById('api-port-input'),
            useWebSocketToggle: document.getElementById('use-websocket-toggle'),
            apiStatusIndicator: document.getElementById('api-status-indicator'),
            testConnectionBtn: document.getElementById('test-connection-btn'),
            connectApiBtn: document.getElementById('connect-api-btn'),
            
            // Modals
            permissionModal: document.getElementById('mic-permission-modal'),
            grantPermission: document.getElementById('grant-mic-btn'),
            denyPermission: document.getElementById('deny-mic-btn'),
            
            // Install
            installBanner: document.getElementById('install-banner'),
            installBtn: document.getElementById('install-btn'),
            dismissInstall: document.getElementById('close-install-banner')
        };
    }
    
    initFluidSimulation() {
        if (this.elements.fluidContainer) {
            this.fluidSimulation = new FluidSimulation(this.elements.fluidContainer);
            window.fluidSimulation = this.fluidSimulation;
        }
    }
    
    setupEventListeners() {
        // Microphone button
        this.elements.micBtn?.addEventListener('click', () => this.toggleMicrophone());
        
        // Settings
        this.elements.settingsBtn?.addEventListener('click', () => this.openSettings());
        this.elements.closeSettings?.addEventListener('click', () => this.closeSettings());
        this.elements.settingsOverlay?.addEventListener('click', (e) => {
            if (e.target === this.elements.settingsOverlay) {
                this.closeSettings();
            }
        });
        
        // Settings controls
        this.elements.wakeWordToggle?.addEventListener('change', (e) => {
            this.onWakeWordToggle(e.target.checked);
        });
        
        this.elements.continuousToggle?.addEventListener('change', (e) => {
            this.onContinuousToggle(e.target.checked);
        });
        
        this.elements.fluidIntensity?.addEventListener('input', (e) => {
            this.onFluidIntensityChange(e.target.value);
        });
        
        // API Settings
        this.elements.apiUrlInput?.addEventListener('change', (e) => {
            this.onApiUrlChange(e.target.value);
        });
        
        this.elements.apiPortInput?.addEventListener('change', (e) => {
            this.onApiPortChange(e.target.value);
        });
        
        this.elements.useWebSocketToggle?.addEventListener('change', (e) => {
            this.onWebSocketToggle(e.target.checked);
        });
        
        this.elements.testConnectionBtn?.addEventListener('click', () => {
            this.testApiConnection();
        });
        
        this.elements.connectApiBtn?.addEventListener('click', () => {
            this.connectToApi();
        });
        
        // Permission modal
        this.elements.grantPermission?.addEventListener('click', () => this.grantMicrophonePermission());
        this.elements.denyPermission?.addEventListener('click', () => this.closePermissionModal());
        
        // Install
        this.elements.installBtn?.addEventListener('click', () => this.installApp());
        this.elements.dismissInstall?.addEventListener('click', () => this.dismissInstallBanner());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        
        // PWA install prompt
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.installPrompt = e;
            this.showInstallBanner();
        });
    }
    
    setupStateListeners() {
        if (!window.AppState) return;
        
        // Listen to all state changes
        window.AppState.subscribe('stateChange', (newState, prevState, context) => {
            this.onStateChange(newState, prevState, context);
        });
    }
    
    onStateChange(state, prevState, context) {
        // Update body data attribute for CSS
        this.elements.body?.setAttribute('data-state', state);
        
        // Update state indicator text
        this.updateStateIndicator(state);
        
        // Update status badge
        this.updateStatusBadge(state);
        
        // Update audio indicator
        this.updateAudioIndicator(state);
        
        // Update fluid simulation with transition timing
        if (this.fluidSimulation) {
            this.fluidSimulation.setState(state);
            
            // Sync audio level from voice visualizer
            if (window.voiceVisualizer) {
                this.fluidSimulation.setAudioLevel(window.voiceVisualizer.globalLevel || 0);
            }
        }
        
        // Update liquid visualizer state
        if (window.voiceVisualizer && window.voiceVisualizer.setState) {
            window.voiceVisualizer.setState(state);
        }
        
        // Start or stop audio sync based on state
        const audioActiveStates = ['listening', 'speaking', 'waking'];
        if (audioActiveStates.includes(state)) {
            this.startAudioSync();
        } else if (state === 'idle') {
            // Keep sync running briefly for smooth transition
            setTimeout(() => {
                if (window.AppState?.getCurrentState() === 'idle') {
                    this.stopAudioSync();
                }
            }, 2000);
        }
        
        // Handle state-specific UI updates
        switch (state) {
            case 'idle':
                // Don't hide chat when going idle - let auto-hide handle it
                break;
            case 'waking':
                this.showCommDisplay();
                break;
            case 'listening':
                this.showCommDisplay();
                break;
            case 'thinking':
                this.showCommDisplay();
                // Command will be added by voice.js via updateTranscript
                break;
            case 'speaking':
                this.showCommDisplay();
                // Response will be added by voice.js via showResponse
                break;
            case 'error':
                this.showCommDisplay();
                if (context?.error) {
                    this.addAgentMessage('Error: ' + context.error);
                }
                break;
        }
    }
    
    // Initialize audio sync bridge between voice visualizer and fluid simulation
    initAudioSyncBridge() {
        // Wait for visualizers to be ready
        setTimeout(() => {
            if (window.voiceVisualizer && this.fluidSimulation) {
                console.log('🔊 Audio sync bridge ready');
            }
        }, 1000);
    }
    
    // Start syncing audio data between visualizers
    startAudioSync() {
        if (this.audioSyncActive) return;
        
        this.audioSyncActive = true;
        console.log('🔊 Audio sync started');
        
        const syncLoop = (currentTime) => {
            if (!this.audioSyncActive) return;
            
            this.audioSyncAnimationId = requestAnimationFrame(syncLoop);
            
            // Throttle updates to 60fps max
            if (currentTime - this.lastAudioSyncTime < this.audioSyncThrottleMs) return;
            this.lastAudioSyncTime = currentTime;
            
            this.syncAudioToVisualizers();
        };
        
        this.audioSyncAnimationId = requestAnimationFrame(syncLoop);
    }
    
    // Stop audio sync
    stopAudioSync() {
        if (!this.audioSyncActive) return;
        
        this.audioSyncActive = false;
        if (this.audioSyncAnimationId) {
            cancelAnimationFrame(this.audioSyncAnimationId);
            this.audioSyncAnimationId = null;
        }
        console.log('🔇 Audio sync stopped');
    }
    
    // Sync audio data between voice visualizer and fluid simulation
    syncAudioToVisualizers() {
        if (!window.voiceVisualizer || !this.fluidSimulation) return;
        
        // Get audio level from voice visualizer
        const audioLevel = window.voiceVisualizer.globalLevel || 0;
        const peakLevel = window.voiceVisualizer.peakLevel || audioLevel;
        
        // Update fluid simulation with audio data
        this.fluidSimulation.setAudioLevel(audioLevel);
        
        // If fluid simulation supports peak level, set it
        if (this.fluidSimulation.peakAudioLevel !== undefined) {
            // Blend with existing peak tracking
            this.fluidSimulation.peakAudioLevel = Math.max(
                this.fluidSimulation.peakAudioLevel * 0.95,
                peakLevel
            );
        }
    }
    
    updateStateIndicator(state) {
        const stateTexts = {
            idle: 'Listening',
            waking: 'Activating',
            listening: 'Speak Now',
            thinking: 'Processing',
            speaking: 'Speaking',
            error: 'Error'
        };
        
        if (this.elements.stateIndicator) {
            this.elements.stateIndicator.textContent = stateTexts[state] || state;
        }
    }
    
    updateStatusBadge(state) {
        const statusTexts = {
            idle: 'Ready',
            waking: 'Waking',
            listening: 'Listening',
            thinking: 'Thinking',
            speaking: 'Speaking',
            error: 'Error'
        };
        
        if (this.elements.statusBadge) {
            this.elements.statusBadge.textContent = statusTexts[state] || state;
            this.elements.statusBadge.setAttribute('data-status', state === 'idle' ? 'ready' : state);
        }
    }
    
    updateAudioIndicator(state) {
        if (this.elements.audioIndicator) {
            const isActive = ['listening', 'speaking'].includes(state);
            this.elements.audioIndicator.classList.toggle('active', isActive);
        }
    }
    
    updateAudioStatus(isActive) {
        if (this.elements.micBtn) {
            this.elements.micBtn.classList.toggle('active', isActive);
        }
    }
    
    // Add a user message to chat history
    addUserMessage(text) {
        this.addChatMessage('user', 'YOU', text);
    }
    
    // Add an agent message to chat history
    addAgentMessage(text) {
        this.addChatMessage('agent', 'LUNA', text);
    }
    
    // Add a message to chat history
    addChatMessage(type, label, text) {
        if (!text || text.trim() === '') return;
        
        // Add to history
        this.chatHistory.push({
            type: type,
            label: label,
            text: text,
            timestamp: Date.now()
        });
        
        // Keep only last maxMessages
        if (this.chatHistory.length > this.maxMessages) {
            this.chatHistory = this.chatHistory.slice(-this.maxMessages);
        }
        
        // Render chat
        this.renderChatMessages();
        
        // Show display and reset auto-hide
        this.showCommDisplay();
    }
    
    // Render all chat messages
    renderChatMessages() {
        if (!this.elements.chatMessages) return;
        
        // Clear existing messages
        this.elements.chatMessages.innerHTML = '';
        
        // Render each message
        this.chatHistory.forEach((message, index) => {
            const messageCard = document.createElement('div');
            messageCard.className = `comm-card ${message.type}`;
            
            const label = document.createElement('div');
            label.className = 'comm-label';
            label.textContent = message.label;
            
            const text = document.createElement('div');
            text.className = 'comm-text';
            text.textContent = message.text;
            
            messageCard.appendChild(label);
            messageCard.appendChild(text);
            this.elements.chatMessages.appendChild(messageCard);
            
            // Animate in with delay
            setTimeout(() => {
                messageCard.classList.add('active');
            }, index * 50);
        });
        
        // Auto-scroll to bottom after rendering
        setTimeout(() => {
            if (this.elements.chatMessages) {
                this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
            }
        }, this.chatHistory.length * 50 + 100);
    }
    
    // Clear all chat messages
    clearChatMessages() {
        this.chatHistory = [];
        if (this.elements.chatMessages) {
            this.elements.chatMessages.innerHTML = '';
        }
    }
    
    updateTranscript(text, isFinal = false) {
        // During transcription, don't add intermediate results
        if (!isFinal) {
            this.isTranscribing = true;
            return;
        }
        
        // Only add final transcription as user message
        if (text && text.trim() !== '') {
            this.addUserMessage(text);
            this.isTranscribing = false;
        }
    }
    
    clearTranscript() {
        // No longer needed with chat history
    }
    
    showTranscriptPlaceholder(text) {
        // No longer needed with chat history
    }
    
    showResponse(text) {
        // Add response as agent message
        if (text && text.trim() !== '') {
            this.addAgentMessage(text);
        }
    }
    
    hideResponse() {
        // No longer needed - messages stay in chat
    }
    
    showCommDisplay() {
        if (this.elements.commDisplay) {
            this.elements.commDisplay.classList.add('visible');
            
            // Reset auto-hide timer
            this.resetCommDisplayAutoHide();
        }
    }
    
    hideCommDisplay() {
        if (this.elements.commDisplay) {
            this.elements.commDisplay.classList.remove('visible');
        }
        
        // Clear auto-hide timer
        if (this.commDisplayTimeout) {
            clearTimeout(this.commDisplayTimeout);
            this.commDisplayTimeout = null;
        }
    }
    
    resetCommDisplayAutoHide() {
        // Clear existing timeout
        if (this.commDisplayTimeout) {
            clearTimeout(this.commDisplayTimeout);
        }
        
        // Set new timeout to auto-hide after 1 minute
        this.commDisplayTimeout = setTimeout(() => {
            console.log('Auto-hiding comm-display after inactivity');
            this.hideCommDisplay();
        }, this.commDisplayAutoHideDelay);
    }
    
    showTemporaryMessage(text, duration = 3000) {
        // Clear any existing timeout
        if (this.messageTimeout) {
            clearTimeout(this.messageTimeout);
        }
        
        this.showResponse(text);
        
        this.messageTimeout = setTimeout(() => {
            this.hideResponse();
        }, duration);
    }
    
    toggleMicrophone() {
        if (!window.VoiceManager) {
            console.warn('VoiceManager not available');
            return;
        }
        
        // Check if we're in speaking state - if so, interrupt
        const currentState = window.AppState?.getCurrentState();
        if (currentState === 'speaking' || window.VoiceManager.isSpeaking) {
            console.log('Mic tap during speaking - interrupting...');
            window.VoiceManager.interruptSpeaking();
            this.elements.micBtn?.classList.add('active');
            this.elements.micBtn?.classList.remove('muted');
            return;
        }
        
        const status = window.VoiceManager.getStatus();
        console.log('Mic toggle - current status:', status);
        
        if (status.isPaused || !status.isListening) {
            // Start/Resume microphone
            window.VoiceManager.resumeWakeWordDetection();
            this.elements.micBtn?.classList.add('active');
            this.elements.micBtn?.classList.remove('muted');
            this.showTemporaryMessage('Microphone enabled', 2000);
        } else {
            // Stop/Pause microphone
            window.VoiceManager.stopWakeWordDetection();
            this.elements.micBtn?.classList.remove('active');
            this.elements.micBtn?.classList.add('muted');
            this.showTemporaryMessage('Microphone muted', 2000);
        }
    }
    
    openSettings() {
        this.isSettingsOpen = true;
        this.elements.settingsOverlay?.classList.add('open');
    }
    
    closeSettings() {
        this.isSettingsOpen = false;
        this.elements.settingsOverlay?.classList.remove('open');
    }
    
    onWakeWordToggle(enabled) {
        console.log('Wake word toggle:', enabled);
        // Save preference
        this.savePreference('wakeWordEnabled', enabled);
    }
    
    onContinuousToggle(enabled) {
        console.log('Continuous toggle:', enabled);
        // Save preference
        this.savePreference('continuousListening', enabled);
    }
    
    onFluidIntensityChange(value) {
        const intensity = parseInt(value) / 100;
        if (this.fluidSimulation) {
            this.fluidSimulation.setExcitement(0.1 + intensity * 0.4);
        }
    }
    
    // API Settings Handlers
    onApiUrlChange(url) {
        console.log('API URL changed:', url);
        if (window.LunaAPI) {
            window.LunaAPI.config.baseUrl = url;
            window.LunaAPI.saveConfig();
        }
        this.updateApiStatusIndicator(false);
    }
    
    onApiPortChange(port) {
        console.log('API Port changed:', port);
        if (window.LunaAPI) {
            window.LunaAPI.config.port = parseInt(port) || 8000;
            window.LunaAPI.saveConfig();
        }
        this.updateApiStatusIndicator(false);
    }
    
    onWebSocketToggle(enabled) {
        console.log('WebSocket toggle:', enabled);
        if (window.LunaAPI) {
            window.LunaAPI.config.useWebSocket = enabled;
            window.LunaAPI.saveConfig();
        }
    }
    
    async testApiConnection() {
        if (!window.LunaAPI) {
            this.showTemporaryMessage('API client not initialized', 3000);
            return;
        }
        
        // Update config from inputs
        const url = this.elements.apiUrlInput?.value || 'http://100.101.185.10';
        const port = parseInt(this.elements.apiPortInput?.value) || 8000;
        
        window.LunaAPI.config.baseUrl = url;
        window.LunaAPI.config.port = port;
        window.LunaAPI.saveConfig();
        
        this.showTemporaryMessage('Testing connection...', 2000);
        this.elements.testConnectionBtn.textContent = 'Testing...';
        this.elements.testConnectionBtn.disabled = true;
        
        try {
            const status = await window.LunaAPI.checkStatus();
            
            if (status.connected) {
                this.updateApiStatusIndicator(true, status);
                this.showTemporaryMessage(`Connected! Agent ready: ${status.agentReady}, Tools: ${status.toolsCount}`, 4000);
            } else {
                this.updateApiStatusIndicator(false);
                this.showTemporaryMessage('Connection failed: Server unreachable', 4000);
            }
        } catch (error) {
            this.updateApiStatusIndicator(false);
            this.showTemporaryMessage('Connection error: ' + error.message, 4000);
        }
        
        this.elements.testConnectionBtn.textContent = 'Test Connection';
        this.elements.testConnectionBtn.disabled = false;
    }
    
    async connectToApi() {
        if (!window.LunaAPI) {
            this.showTemporaryMessage('API client not initialized', 3000);
            return;
        }
        
        // Update config from inputs
        const url = this.elements.apiUrlInput?.value || 'http://localhost:8000';
        const port = parseInt(this.elements.apiPortInput?.value) || 8000;
        const useWs = this.elements.useWebSocketToggle?.checked ?? true;
        
        window.LunaAPI.config.baseUrl = url;
        window.LunaAPI.config.port = port;
        window.LunaAPI.config.useWebSocket = useWs;
        window.LunaAPI.saveConfig();
        
        this.elements.connectApiBtn.textContent = 'Connecting...';
        this.elements.connectApiBtn.disabled = true;
        
        try {
            if (useWs) {
                // Connect via WebSocket
                const connected = await window.LunaAPI.connect();
                
                if (connected) {
                    this.updateApiStatusIndicator(true);
                    this.showTemporaryMessage('WebSocket connected!', 3000);
                    
                    // Setup state change handler
                    window.LunaAPI.onStateChange = (state) => {
                        if (window.AppState) {
                            window.AppState.setState(state);
                        }
                    };
                    
                    // Setup connection change handler
                    window.LunaAPI.onConnectionChange = (connected) => {
                        this.updateApiStatusIndicator(connected);
                    };
                } else {
                    this.updateApiStatusIndicator(false);
                    this.showTemporaryMessage('WebSocket connection failed', 3000);
                }
            } else {
                // Test REST connection
                const status = await window.LunaAPI.checkStatus();
                if (status.connected) {
                    this.updateApiStatusIndicator(true, status);
                    this.showTemporaryMessage('REST API connected!', 3000);
                } else {
                    this.updateApiStatusIndicator(false);
                    this.showTemporaryMessage('REST API connection failed', 3000);
                }
            }
        } catch (error) {
            this.updateApiStatusIndicator(false);
            this.showTemporaryMessage('Connection error: ' + error.message, 4000);
        }
        
        this.elements.connectApiBtn.textContent = 'Connect';
        this.elements.connectApiBtn.disabled = false;
    }
    
    updateApiStatusIndicator(connected, status = null) {
        if (this.elements.apiStatusIndicator) {
            if (connected) {
                this.elements.apiStatusIndicator.textContent = status?.status || 'Connected';
                this.elements.apiStatusIndicator.style.color = 'rgba(100, 255, 150, 0.9)';
            } else {
                this.elements.apiStatusIndicator.textContent = 'Disconnected';
                this.elements.apiStatusIndicator.style.color = 'rgba(255, 100, 100, 0.8)';
            }
        }
    }
    
    loadApiSettings() {
        if (window.LunaAPI) {
            const config = window.LunaAPI.getConfig();
            
            if (this.elements.apiUrlInput) {
                this.elements.apiUrlInput.value = config.baseUrl || 'http://localhost:8000';
            }
            if (this.elements.apiPortInput) {
                this.elements.apiPortInput.value = config.port || 8000;
            }
            if (this.elements.useWebSocketToggle) {
                this.elements.useWebSocketToggle.checked = config.useWebSocket !== false;
            }
        }
    }
    
    savePreference(key, value) {
        try {
            const prefs = JSON.parse(localStorage.getItem('lunaeye-prefs') || '{}');
            prefs[key] = value;
            localStorage.setItem('lunaeye-prefs', JSON.stringify(prefs));
        } catch (e) {
            console.warn('Could not save preference:', e);
        }
    }
    
    loadPreferences() {
        try {
            const prefs = JSON.parse(localStorage.getItem('lunaeye-prefs') || '{}');
            
            if (this.elements.wakeWordToggle && 'wakeWordEnabled' in prefs) {
                this.elements.wakeWordToggle.checked = prefs.wakeWordEnabled;
            }
            if (this.elements.continuousToggle && 'continuousListening' in prefs) {
                this.elements.continuousToggle.checked = prefs.continuousListening;
            }
        } catch (e) {
            console.warn('Could not load preferences:', e);
        }
    }
    
    showPermissionModal() {
        this.elements.permissionModal?.classList.add('open');
    }
    
    closePermissionModal() {
        this.elements.permissionModal?.classList.remove('open');
    }
    
    async grantMicrophonePermission() {
        this.closePermissionModal();
        
        try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
            window.VoiceManager?.startWakeWordDetection();
        } catch (error) {
            console.error('Microphone permission denied:', error);
            this.showTemporaryMessage('Microphone access was denied. Please enable it in browser settings.');
        }
    }
    
    checkInstallPrompt() {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            return;
        }
        
        // Check if dismissed
        const dismissed = localStorage.getItem('lunaeye-install-dismissed');
        if (dismissed) {
            const dismissedDate = new Date(dismissed);
            const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceDismissed < 7) {
                return;
            }
        }
    }
    
    showInstallBanner() {
        this.elements.installBanner?.classList.add('show');
    }
    
    hideInstallBanner() {
        this.elements.installBanner?.classList.remove('show');
    }
    
    async installApp() {
        if (!this.installPrompt) return;
        
        this.installPrompt.prompt();
        const { outcome } = await this.installPrompt.userChoice;
        
        console.log('Install outcome:', outcome);
        this.installPrompt = null;
        this.hideInstallBanner();
    }
    
    dismissInstallBanner() {
        this.hideInstallBanner();
        localStorage.setItem('lunaeye-install-dismissed', new Date().toISOString());
    }
    
    handleKeyboard(e) {
        // Escape to close settings
        if (e.key === 'Escape' && this.isSettingsOpen) {
            this.closeSettings();
            return;
        }
        
        // Space to toggle microphone (when not typing)
        if (e.key === ' ' && e.target === document.body) {
            e.preventDefault();
            this.toggleMicrophone();
            return;
        }
    }
    
    getUIState() {
        return {
            isSettingsOpen: this.isSettingsOpen,
            hasInstallPrompt: !!this.installPrompt,
            currentState: window.AppState?.getCurrentState()
        };
    }
    
    destroy() {
        if (this.fluidSimulation) {
            this.fluidSimulation.destroy();
        }
        if (this.messageTimeout) {
            clearTimeout(this.messageTimeout);
        }
    }
}

// Global UI controller instance
window.UIController = new UIController();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIController;
}
