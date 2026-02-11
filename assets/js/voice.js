// LunaEye Voice Recognition - Offline/Local Implementation
class VoiceManager {
    constructor() {
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.isListening = false;
        this.isRestarting = false;
        this.isPaused = false;
        this.wakeWord = 'hey luna';
        this.alternativeWakeWords = ['luna', 'hey luna', 'ok luna', 'luda', 'hey luda', 'ok luda'];
        this.lastCommand = '';
        this.confidenceThreshold = 0.4; // Lower threshold for better sensitivity
        this.restartAttempts = 0;
        this.maxRestartAttempts = 10; // Allow more restart attempts
        this.restartDelay = 200; // Faster restart
        this.consecutiveErrors = 0;
        this.maxConsecutiveErrors = 5; // More tolerance before switching modes
        this.listeningTimeout = null;
        this.listeningTimeoutDuration = 8000; // 8 seconds to wait for command
        
        // Conversation mode - stays in listening after response
        this.conversationTimeout = null;
        this.conversationTimeoutDuration = 15000; // 15 seconds before requiring wake word again
        this.isInConversation = false;
        this.isSpeaking = false; // Track if TTS is currently speaking
        
        // Audio context for visualization
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.dataArray = null;
        this.audioStream = null;
        
        // Simple wake word detection using audio analysis
        this.wakeWordDetector = null;
        this.audioHistory = [];
        this.speechDetector = null;
        
        // Configuration
        this.config = {
            continuous: true,
            interimResults: true,
            lang: 'en-US',
            maxAlternatives: 3, // More alternatives for better accuracy
            useLocalDetection: false // Set to true to bypass network issues
        };
        
        // Audio sensitivity settings
        this.audioSensitivity = 0.02; // Lower = more sensitive
        this.silenceThreshold = 0.01;
        
        this.init();
        this.loadVoices();
    }
    
    loadVoices() {
        // Chrome loads voices asynchronously, so we need to wait for them
        if (this.synthesis) {
            const voices = this.synthesis.getVoices();
            if (voices.length === 0) {
                // Wait for voices to load
                this.synthesis.onvoiceschanged = () => {
                    console.log('🎙️ Voices loaded:', this.synthesis.getVoices().length, 'available');
                };
            } else {
                console.log('🎙️ Voices already loaded:', voices.length, 'available');
            }
        }
    }
    
    async init() {
        try {
            // Check browser support
            if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
                console.warn('Speech recognition not supported in this browser');
                this.showBrowserWarning();
                return;
            }
            
            // Try local detection first if network issues
            if (this.config.useLocalDetection) {
                this.initLocalDetection();
            } else {
                // Create recognition instance
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                this.recognition = new SpeechRecognition();
                
                // Configure for maximum reliability
                this.recognition.continuous = this.config.continuous;
                this.recognition.interimResults = this.config.interimResults;
                this.recognition.lang = this.config.lang;
                this.recognition.maxAlternatives = this.config.maxAlternatives;
                
                // Try to use offline mode
                try {
                    this.recognition.serviceURI = 'builtin:speech/dictation';
                } catch (e) {
                    console.log('Could not set offline service URI');
                }
                
                // Set up event handlers
                this.setupEventHandlers();
            }
            
            console.log('Voice manager initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize voice manager:', error);
            this.initLocalDetection(); // Fallback to local detection
        }
    }
    
    initLocalDetection() {
        console.log('Initializing local speech detection...');
        this.config.useLocalDetection = true;
        this.setupLocalDetection();
    }
    
    setupLocalDetection() {
        // Simple volume-based detection for wake word
        this.speechDetector = {
            isSpeaking: false,
            speakingStartTime: 0,
            silenceStartTime: 0,
            consecutiveSpeechFrames: 0,
            consecutiveSilenceFrames: 0,
            
            process: (volume) => {
                const threshold = 0.1;
                const isSpeakingNow = volume > threshold;
                
                if (isSpeakingNow && !this.speechDetector.isSpeaking) {
                    // Speech started
                    this.speechDetector.isSpeaking = true;
                    this.speechDetector.speakingStartTime = Date.now();
                    this.speechDetector.consecutiveSpeechFrames++;
                    this.speechDetector.consecutiveSilenceFrames = 0;
                    
                    if (window.AppState?.getCurrentState() === 'idle') {
                        window.AppState?.setState('waking');
                    }
                    
                } else if (!isSpeakingNow && this.speechDetector.isSpeaking) {
                    // Speech ended
                    this.speechDetector.isSpeaking = false;
                    this.speechDetector.silenceStartTime = Date.now();
                    this.speechDetector.consecutiveSilenceFrames++;
                    this.speechDetector.consecutiveSpeechFrames = 0;
                    
                    const speechDuration = Date.now() - this.speechDetector.speakingStartTime;
                    
                    if (speechDuration > 500 && speechDuration < 5000) {
                        // Likely a command - simulate command received
                        this.onLocalCommandDetected();
                    }
                    
                } else if (isSpeakingNow) {
                    this.speechDetector.consecutiveSpeechFrames++;
                } else {
                    this.speechDetector.consecutiveSilenceFrames++;
                }
                
                // Reset to idle after long silence
                if (this.speechDetector.consecutiveSilenceFrames > 30) {
                    if (window.AppState?.getCurrentState() !== 'idle') {
                        window.AppState?.setState('idle');
                    }
                }
            }
        };
    }
    
    showBrowserWarning() {
        const message = 'Voice recognition requires Chrome, Edge, or Safari. Some features will be limited.';
        if (window.UIController) {
            window.UIController.showTemporaryMessage(message, 5000);
        }
    }
    
    setupEventHandlers() {
        if (!this.recognition) return;
        
        this.recognition.onstart = () => this.onRecognitionStart();
        this.recognition.onend = () => this.onRecognitionEnd();
        this.recognition.onresult = (e) => this.handleRecognitionResult(e);
        this.recognition.onerror = (e) => this.onRecognitionError(e);
        
        this.recognition.onspeechstart = () => {
            // Speech started - reset error counter silently
            this.consecutiveErrors = 0;
        };
        
        this.recognition.onspeechend = () => {
            // Speech ended - handled by recognition flow
        };
        
        this.recognition.onaudiostart = () => {
            this.startWebAudioVisualization();
        };
        
        this.recognition.onaudioend = () => {
            this.stopWebAudioVisualization();
        };
    }
    
    // Start wake word detection
    async startWakeWordDetection() {
        if (this.isPaused) {
            console.log('Voice recognition is paused');
            return;
        }
        
        if (this.isListening) {
            console.log('Already listening');
            return;
        }
        
        if (this.isRestarting) {
            console.log('Restart in progress, waiting...');
            return;
        }
        
        try {
            if (this.config.useLocalDetection) {
                await this.startLocalDetection();
            } else {
                await this.startWebSpeechDetection();
            }
        } catch (error) {
            console.error('Failed to start wake word detection:', error);
            this.consecutiveErrors++;
            
            if (this.consecutiveErrors < 3) {
                if (!this.isRestarting) {
                    this.scheduleRestart(3000);
                }
            } else {
                console.log('Too many errors, switching to local detection');
                this.initLocalDetection();
                this.startLocalDetection();
            }
        }
    }
    
    async startWebSpeechDetection() {
        if (!this.recognition) return;
        
        // Request microphone permission first
        const hasPermission = await this.requestMicrophonePermission();
        if (!hasPermission) {
            console.warn('Microphone permission denied');
            return;
        }
        
        // Configure recognition for responsiveness
        this.recognition.continuous = this.config.continuous;
        this.recognition.interimResults = this.config.interimResults;
        this.recognition.lang = this.config.lang;
        this.recognition.maxAlternatives = this.config.maxAlternatives;
        
        try {
            this.recognition.start();
            this.restartAttempts = 0;
            // Only log on first start or after errors
            if (this.consecutiveErrors > 0) {
                console.log('Web Speech recognition restarted');
            }
        } catch (error) {
            if (error.message?.includes('already started')) {
                console.log('Recognition already running');
                this.isListening = true;
            } else {
                throw error;
            }
        }
    }
    
    async startLocalDetection() {
        const hasPermission = await this.requestMicrophonePermission();
        if (!hasPermission) {
            console.warn('Microphone permission denied');
            return;
        }
        
        await this.initAudioContext(this.audioStream);
        this.isListening = true;
        
        // Start audio monitoring
        const monitorAudio = () => {
            if (!this.isListening) return;
            
            this.analyser.getByteFrequencyData(this.dataArray);
            
            // Calculate average volume
            const average = this.dataArray.reduce((a, b) => a + b, 0) / this.dataArray.length;
            const normalized = average / 255;
            
            // Update visualization
            if (window.fluidSimulation) {
                window.fluidSimulation.setAudioLevel(normalized);
            }
            
            // Process with speech detector
            this.speechDetector.process(normalized);
            
            requestAnimationFrame(monitorAudio);
        };
        
        monitorAudio();
        console.log('🎤 LOCAL DETECTION MODE ACTIVE - Listening for voice...');
        
        // Show user feedback
        const voiceModeIndicator = document.getElementById('voice-mode-indicator');
        if (voiceModeIndicator) {
            voiceModeIndicator.textContent = '🔸 Local Detection Mode';
            voiceModeIndicator.style.color = '#fbbf24'; // Amber color
        }
        
        const statusBadge = document.getElementById('status-badge');
        if (statusBadge) {
            statusBadge.textContent = 'Local Mode';
            statusBadge.setAttribute('data-status', 'local');
        }
    }
    
    // Event handlers for Web Speech API
    onRecognitionStart() {
        this.isListening = true;
        this.isRestarting = false;
        this.lastSuccessfulRecognition = Date.now();
        // Only log when recovering from errors
        if (this.consecutiveErrors > 0) {
            console.log(`✅ Web Speech recognition recovered (was ${this.consecutiveErrors} errors)`);
        }
        
        if (window.UIController) {
            window.UIController.updateAudioStatus(true);
        }
    }
    
    onRecognitionEnd() {
        this.isListening = false;
        const currentState = window.AppState?.getCurrentState();
        
        if (window.UIController) {
            window.UIController.updateAudioStatus(false);
        }
        
        // Don't auto-restart here - let error handler or explicit calls handle it
        // This prevents double-scheduling restarts
        if (!this.isPaused && !this.config.useLocalDetection && !this.isRestarting) {
            const shouldRestart = !['error', 'speaking', 'thinking'].includes(currentState);
            
            if (shouldRestart) {
                // Fast restart for listening mode, slightly slower for idle
                const delay = currentState === 'listening' ? 100 : 500;
                this.scheduleRestart(delay);
            }
        }
    }
    
    onRecognitionError(event) {
        const errorType = event.error;
        const currentState = window.AppState?.getCurrentState();
        
        // Don't count errors when we're in states that don't need recognition
        if (['thinking', 'speaking'].includes(currentState)) {
            return;
        }
        
        // Aborted is expected when stopping recognition - completely silent
        if (errorType === 'aborted') {
            // This is normal Chrome behavior, no need to log
            return;
        }
        
        // Only log actual errors
        console.log('Recognition error:', errorType, `(state: ${currentState})`);
        
        this.consecutiveErrors++;
        console.log(`🔴 ERROR COUNTER: ${this.consecutiveErrors}/${this.maxConsecutiveErrors}`);
        
        if (errorType === 'network') {
            console.log(`Network error #${this.consecutiveErrors}`);
            if (this.consecutiveErrors >= 2) {
                console.log('🔄 SWITCHING TO LOCAL DETECTION MODE');
                this.config.useLocalDetection = true;
                
                // Show user feedback
                const voiceModeIndicator = document.getElementById('voice-mode-indicator');
                if (voiceModeIndicator) {
                    voiceModeIndicator.textContent = '🔸 Switching to Local Mode...';
                    voiceModeIndicator.style.color = '#fbbf24';
                }
                
                this.initLocalDetection();
                return;
            }
        } else if (errorType === 'no-speech') {
            // No speech - normal, just restart quickly
            this.consecutiveErrors = 0; // Don't count no-speech as error
            // Restart recognition immediately to continue listening
            this.scheduleRestart(100);
            return;
        }
        
        this.scheduleRestart(500);
    }
    
    onLocalCommandDetected() {
        console.log('Local command detected');
        
        // Simulate wake word detection
        this.onWakeWordDetected('voice detected');
        
        // Simulate a simple command after a delay
        setTimeout(() => {
            const commands = ['hello', 'what time is it', 'help'];
            const randomCommand = commands[Math.floor(Math.random() * commands.length)];
            this.onCommandReceived(randomCommand, 0.8);
        }, 1500);
    }
    
    // Handle recognition results for Web Speech API
    handleRecognitionResult(event) {
        const results = event.results;
        const lastResult = results[results.length - 1];
        
        const primaryTranscript = lastResult[0]?.transcript?.toLowerCase().trim() || '';
        const confidence = lastResult[0]?.confidence || 0;
        const isFinal = lastResult.isFinal;
        
        const currentState = window.AppState?.getCurrentState();
        
        // During speaking: ONLY allow wake word detection for interruption
        // With echoCancellation: "all", the TTS audio should be removed from mic input
        if (currentState === 'speaking' || this.isSpeaking) {
            // Only process final results during speaking
            if (!isFinal) {
                return;
            }
            
            // Check if user said wake word to interrupt
            if (this.detectWakeWord(primaryTranscript)) {
                console.log('🛑 Wake word detected during speaking - interrupting!');
                this.interruptSpeaking();
                // Extract command if any
                const command = this.extractCommandFromTranscript(primaryTranscript);
                if (command && command.length > 2) {
                    // Process the new command immediately
                    setTimeout(() => {
                        this.onCommandReceived(command, confidence);
                    }, 300);
                } else {
                    // Just interrupted, go to listening state
                    setTimeout(() => {
                        window.AppState?.setState('listening', { source: 'interruption' });
                        this.startListeningTimeout();
                    }, 300);
                }
            }
            // Ignore all other speech during speaking (likely TTS echo despite cancellation)
            return;
        }
        
        // Always show interim results for real-time feedback
        if (!isFinal) {
            // Show what we're hearing in real-time
            this.onInterimResult(primaryTranscript);
            
            // In listening state, also check if we should process long interim results
            if (currentState === 'listening' && primaryTranscript.length > 20) {
                // Long interim result - might be a complete sentence
                // Update UI but don't process yet
                console.log('📝 Interim:', primaryTranscript);
            }
            return;
        }
        
        // Only log final recognized speech
        console.log('🎤 Heard:', primaryTranscript, `(confidence: ${(confidence * 100).toFixed(0)}%)`);
        
        // Reset error counter on successful speech recognition
        if (primaryTranscript.length > 0) {
            this.consecutiveErrors = 0;
        }
        
        // In idle state, only respond to wake word
        if (currentState === 'idle' && !this.isInConversation) {
            if (this.detectWakeWord(primaryTranscript)) {
                this.onWakeWordDetected(primaryTranscript);
            }
        } else if (currentState === 'waking') {
            // During waking, check for wake word with command
            if (this.detectWakeWord(primaryTranscript)) {
                this.onWakeWordDetected(primaryTranscript);
            }
        } else if (currentState === 'listening') {
            // In listening state, any speech is considered a command
            if (primaryTranscript.length > 0) {
                // Reset conversation timeout since user is speaking
                this.clearConversationTimeout();
                
                // Check if it's just the wake word again (user repeated it)
                if (this.detectWakeWord(primaryTranscript)) {
                    // Extract the command part if any
                    const command = this.extractCommandFromTranscript(primaryTranscript);
                    if (command && command.length > 2) {
                        console.log(`📝 Command after wake word: "${command}"`);
                        this.onCommandReceived(command, confidence);
                    } else {
                        console.log('🔄 Wake word repeated, continuing to listen...');
                        // Restart conversation timeout
                        if (this.isInConversation) {
                            this.startConversationTimeout();
                        }
                    }
                } else {
                    // Regular command without wake word - process it!
                    console.log('💬 Conversation continues:', primaryTranscript);
                    this.onCommandReceived(primaryTranscript, confidence);
                }
            }
        }
        
        this.lastCommand = primaryTranscript;
    }
    
    detectWakeWord(transcript) {
        // Clean the transcript of punctuation and normalize
        const cleanTranscript = transcript.toLowerCase()
            .replace(/[.,!?]/g, '')  // Remove punctuation
            .replace(/\s+/g, ' ')    // Normalize spaces
            .trim();
        
        const allWakeWords = [this.wakeWord, ...this.alternativeWakeWords];
        
        for (const wakeWord of allWakeWords) {
            const cleanWakeWord = wakeWord.toLowerCase().replace(/\s+/g, ' ').trim();
            if (cleanTranscript.includes(cleanWakeWord)) {
                return true;
            }
        }
        
        return false;
    }
    
    onWakeWordDetected(transcript) {
        console.log('🌟 Hey Luna! Activating...');
        
        window.AppState?.setState('waking', { transcript });
        
        if (window.fluidSimulation) {
            window.fluidSimulation.setExcitement(0.8);
        }
        
        // Try to extract a command that follows the wake word in the same transcript
        const command = this.extractCommandFromTranscript(transcript);
        
        if (command && command.length > 2) {
            // Command was spoken together with wake word
            setTimeout(() => {
                this.onCommandReceived(command, 0.9);
            }, 600);
        } else {
            // No command yet, transition to listening state and wait
            setTimeout(() => {
                window.AppState?.setState('listening', { source: 'wake-word' });
                this.startListeningTimeout();
            }, 600);
        }
    }
    
    startListeningTimeout() {
        // Clear any existing timeout
        this.clearListeningTimeout();
        
        this.listeningTimeout = setTimeout(() => {
            const currentState = window.AppState?.getCurrentState();
            if (currentState === 'listening') {
                // Provide feedback and return to idle
                this.speak("I didn't catch that. Say 'Hey Luna' when you need me.");;
                window.AppState?.setState('idle');
            }
        }, this.listeningTimeoutDuration);
    }
    
    clearListeningTimeout() {
        if (this.listeningTimeout) {
            clearTimeout(this.listeningTimeout);
            this.listeningTimeout = null;
        }
    }
    
    // Conversation timeout - returns to idle after 15 seconds of no user input
    startConversationTimeout() {
        this.clearConversationTimeout();
        
        this.conversationTimeout = setTimeout(() => {
            const currentState = window.AppState?.getCurrentState();
            if (currentState === 'listening' && this.isInConversation) {
                console.log('⏰ Conversation timeout - returning to idle mode');
                this.isInConversation = false;
                window.AppState?.setState('idle');
                
                // Optional: Provide audio feedback
                // this.speak("I'll be here when you need me.");
            }
        }, this.conversationTimeoutDuration);
    }
    
    clearConversationTimeout() {
        if (this.conversationTimeout) {
            clearTimeout(this.conversationTimeout);
            this.conversationTimeout = null;
        }
    }
    
    extractCommandFromTranscript(transcript) {
        // Remove wake words from the transcript to get the command
        const cleanTranscript = transcript.toLowerCase()
            .replace(/[.,!?]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        
        const allWakeWords = [this.wakeWord, ...this.alternativeWakeWords];
        
        let command = cleanTranscript;
        for (const wakeWord of allWakeWords) {
            const cleanWakeWord = wakeWord.toLowerCase().replace(/\s+/g, ' ').trim();
            // Remove the wake word from the transcript
            const wakeWordIndex = command.indexOf(cleanWakeWord);
            if (wakeWordIndex !== -1) {
                command = command.substring(wakeWordIndex + cleanWakeWord.length).trim();
                break;
            }
        }
        
        return command;
    }
    
    async onCommandReceived(transcript, confidence) {
        // Clear listening timeout since we got a command
        this.clearListeningTimeout();
        this.clearConversationTimeout();
        
        // Add final user transcript to chat
        if (window.UIController) {
            window.UIController.updateTranscript(transcript, true);
        }
        
        // DO NOT stop recognition anymore - let it continue for interruption
        // With echoCancellation: "all", TTS audio should be removed from mic input
        // Recognition will stay active and only respond to wake word during speaking
        
        // Mark that we're in an active conversation
        this.isInConversation = true;
        
        window.AppState?.setState('thinking', { command: transcript, confidence });
        
        try {
            const response = await this.processCommand(transcript);
            
            // Set speaking state BEFORE starting to speak
            this.isSpeaking = true;
            window.AppState?.setState('speaking', { command: transcript, response });
            
            // Add response to chat
            if (window.UIController && response.text) {
                window.UIController.showResponse(response.text);
            }
            
            // Wait for speech to FULLY complete before changing state
            await this.speak(response.text);
            
            // Speech is done - check if we were interrupted
            if (this.isSpeaking) {
                // Speech completed naturally (not interrupted)
                this.isSpeaking = false;
                
                // Go back to LISTENING (not idle) to continue the conversation
                window.AppState?.setState('listening', { source: 'conversation-continue' });
                
                // Start conversation timeout
                this.startConversationTimeout();
            } else {
                // Was interrupted - isSpeaking was set to false by interruptSpeaking()
                console.log('✅ Speech was interrupted by user');
            }
            
            // Reset speaking flag just in case
            this.isSpeaking = false;
            
        } catch (error) {
            console.error('Command processing failed:', error);
            this.isSpeaking = false;
            window.AppState?.setState('error', { error: error.message });
            
            // Recover to listening after a short delay (stay in conversation)
            await this.delay(1500);
            window.AppState?.setState('listening', { source: 'error-recovery' });
            
            this.startConversationTimeout();
        }
    }
    
    stopWakeWordDetection() {
        this.isPaused = true;
        
        if (this.recognition && this.isListening) {
            try {
                this.recognition.stop();
            } catch (e) {
                console.log('Stop error (safe to ignore):', e.message);
            }
        }
        
        this.isListening = false;
    }
    
    resumeWakeWordDetection() {
        this.isPaused = false;
        if (!this.config.useLocalDetection) {
            this.startWakeWordDetection();
        }
    }
    
    async requestMicrophonePermission() {
        try {
            // Check if we already have an active audio stream
            if (this.audioStream && this.audioStream.active) {
                console.log('Using existing microphone stream');
                return true;
            }
            
            // Request new stream only if we don't have one
            console.log('Requesting new microphone permission...');
            
            // Detect browser and version for advanced echo cancellation
            const userAgent = navigator.userAgent;
            const chromeMatch = userAgent.match(/Chrome\/(\d+)/);
            const edgeMatch = userAgent.match(/Edg\/(\d+)/);
            const chromeVersion = chromeMatch ? parseInt(chromeMatch[1]) : 0;
            const edgeVersion = edgeMatch ? parseInt(edgeMatch[1]) : 0;
            
            // Use "all" for Chrome 141+ or Edge 141+ (removes ALL system-generated audio including TTS)
            const supportsAdvancedEchoCancellation = chromeVersion >= 141 || edgeVersion >= 141;
            const echoCancellationValue = supportsAdvancedEchoCancellation ? "all" : true;
            
            console.log(`🎤 Using echoCancellation: "${echoCancellationValue}" (Chrome: ${chromeVersion}, Edge: ${edgeVersion})`);
            
            // Request audio with enhanced settings for better sensitivity
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: echoCancellationValue,
                    noiseSuppression: true,
                    autoGainControl: true,
                    channelCount: 1,
                    sampleRate: 16000 // Optimal for speech recognition
                } 
            });
            this.audioStream = stream;
            await this.initAudioContext(stream);
            
            // Verify actual settings being used
            const audioTrack = stream.getAudioTracks()[0];
            const settings = audioTrack.getSettings();
            console.log('🎤 Actual audio settings:', {
                echoCancellation: settings.echoCancellation,
                noiseSuppression: settings.noiseSuppression,
                autoGainControl: settings.autoGainControl,
                sampleRate: settings.sampleRate
            });
            
            return true;
        } catch (error) {
            console.error('Microphone permission denied:', error);
            this.showMicrophoneError();
            return false;
        }
    }
    
    showMicrophoneError() {
        if (window.UIController) {
            window.UIController.showTemporaryMessage(
                'Microphone access is required. Please enable it in your browser settings.',
                5000
            );
        }
    }
    
    async initAudioContext(stream) {
        try {
            if (this.audioContext) return;
            
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Resume audio context if suspended (required by some browsers)
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 512; // Larger for better frequency resolution
            this.analyser.smoothingTimeConstant = 0.5; // Less smoothing = more responsive
            this.analyser.minDecibels = -90; // More sensitive to quiet sounds
            this.analyser.maxDecibels = -10;
            
            const bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(bufferLength);
            
            if (stream) {
                this.microphone = this.audioContext.createMediaStreamSource(stream);
                
                // Add a gain node for boosting sensitivity
                this.gainNode = this.audioContext.createGain();
                this.gainNode.gain.value = 1.5; // Boost input slightly
                
                this.microphone.connect(this.gainNode);
                this.gainNode.connect(this.analyser);
            }
            
            // Connect liquid visualizer to audio analyser
            if (window.voiceVisualizer) {
                console.log('Found voiceVisualizer:', window.voiceVisualizer.constructor.name);
                window.voiceVisualizer.connect(this.analyser, this.dataArray);
                console.log('Liquid voice visualizer connected to audio');
            } else {
                console.log('No voiceVisualizer found on window object');
            }
            
        } catch (error) {
            console.warn('Audio context initialization failed:', error);
        }
    }
    
    onInterimResult(transcript) {
        // Don't show interim results in chat - only log them
        console.log('📝 Interim:', transcript);
        
        // Reset conversation timeout when user is speaking (interim results)
        // This prevents timeout from firing while user is actively talking
        if (this.isInConversation && transcript.length > 3) {
            this.clearConversationTimeout();
            console.log('🗣️ User is speaking, conversation timeout reset');
        }
        
        // Update fluid simulation to show we're hearing something
        if (window.fluidSimulation && transcript.length > 0) {
            window.fluidSimulation.setExcitement(0.4);
        }
    }
    
    // Schedule restart with delay
    scheduleRestart(delay = this.restartDelay) {
        if (this.isRestarting || this.isPaused) {
            return;
        }
        
        this.isRestarting = true;
        this.restartAttempts++;
        
        // Only log if there have been multiple attempts (potential issue)
        if (this.restartAttempts > 3) {
            console.log(`Recognition restart attempt ${this.restartAttempts}`);
        }
        
        setTimeout(() => {
            this.isRestarting = false;
            if (!this.isPaused && !this.isListening) {
                this.startWakeWordDetection();
            }
        }, delay);
    }
    
    // Process command with fallback responses
    async processCommand(command) {
        // First, try to send to Luna API backend
        if (window.LunaAPI) {
            try {
                console.log('Sending command to Luna API:', command);
                
                // Check if using WebSocket (real-time)
                if (window.LunaAPI.isConnected) {
                    // WebSocket mode - response comes via callback
                    return new Promise((resolve, reject) => {
                        // Set up response handler
                        const originalHandler = window.LunaAPI.onResponse;
                        
                        window.LunaAPI.onResponse = (response) => {
                            // Restore original handler
                            window.LunaAPI.onResponse = originalHandler;
                            
                            resolve({
                                text: response.text,
                                action: 'api_response',
                                toolsUsed: response.toolsUsed
                            });
                        };
                        
                        // Set up error handler
                        const originalErrorHandler = window.LunaAPI.onError;
                        window.LunaAPI.onError = (error) => {
                            window.LunaAPI.onError = originalErrorHandler;
                            console.warn('API error, using fallback:', error);
                            resolve(this.getLocalResponse(command));
                        };
                        
                        // Send the message
                        window.LunaAPI.sendMessage(command);
                        
                        // Timeout fallback
                        setTimeout(() => {
                            if (window.LunaAPI.onResponse !== originalHandler) {
                                window.LunaAPI.onResponse = originalHandler;
                                window.LunaAPI.onError = originalErrorHandler;
                                console.warn('API timeout, using fallback');
                                resolve(this.getLocalResponse(command));
                            }
                        }, 15000);
                    });
                } else {
                    // REST API mode
                    const response = await window.LunaAPI.sendMessageRest(command);
                    return {
                        text: response.text,
                        action: 'api_response',
                        toolsUsed: response.toolsUsed
                    };
                }
            } catch (error) {
                console.warn('Luna API unavailable, using local fallback:', error);
                return this.getLocalResponse(command);
            }
        }
        
        // Fallback to local responses
        return this.getLocalResponse(command);
    }
    
    // Local fallback responses when API is unavailable
    getLocalResponse(command) {
        const cmd = command.toLowerCase();
        const responses = {
            greeting: {
                patterns: ['hello', 'hi', 'hey', 'good morning'],
                response: { text: "Hello! I'm LunaEye, your AI assistant. How can I help you today?", action: 'greeting' }
            },
            time: {
                patterns: ['time', 'what time', 'current time'],
                response: { text: `The current time is ${new Date().toLocaleTimeString()}.`, action: 'time' }
            },
            date: {
                patterns: ['date', 'what day', 'today'],
                response: { text: `Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`, action: 'date' }
            },
            help: {
                patterns: ['help', 'what can you do'],
                response: { text: "I can help you with time, date, and basic conversation. Connect me to Luna backend for full smart home control!", action: 'help' }
            },
            thanks: {
                patterns: ['thank', 'thanks', 'appreciate'],
                response: { text: "You're welcome! Is there anything else I can help you with?", action: 'thanks' }
            },
            goodbye: {
                patterns: ['bye', 'goodbye', 'see you'],
                response: { text: "Goodbye! Just speak to me again whenever you need assistance.", action: 'goodbye' }
            },
            name: {
                patterns: ['your name', 'who are you'],
                response: { text: "I'm LunaEye, your personal AI assistant with advanced 3D fluid visualization and voice interaction.", action: 'identity' }
            }
        };
        
        for (const category of Object.values(responses)) {
            for (const pattern of category.patterns) {
                if (cmd.includes(pattern)) {
                    return category.response;
                }
            }
        }
        
        return {
            text: `I heard you say "${command}". Connect to Luna backend for full capabilities, or try asking about time, date, or say "help".`,
            action: 'unknown'
        };
    }
    
    async speak(text) {
        return new Promise((resolve, reject) => {
            if (!this.synthesis) {
                console.warn('Speech synthesis not available');
                resolve();
                return;
            }
            
            // Store resolve function so we can call it if interrupted
            this.currentSpeechResolve = resolve;
            
            try {
                this.synthesis.cancel();
                
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.rate = 1.0;
                utterance.pitch = 1.0;
                utterance.volume = 1.0;
                utterance.lang = 'en-US';
                
                const voices = this.synthesis.getVoices();
                
                // Priority list of sophisticated female voices
                const femaleVoiceNames = [
                    'Microsoft Zira',      // Windows - clear, professional
                    'Google UK English Female',
                    'Google US English',
                    'Samantha',            // macOS - natural, warm
                    'Karen',               // macOS Australian
                    'Moira',               // macOS Irish
                    'Tessa',               // macOS South African
                    'Fiona',               // macOS Scottish
                    'Victoria',            // macOS
                    'Allison',             // macOS
                    'Susan',               // macOS
                    'Zira',                // Windows fallback
                    'Hazel',               // Windows UK
                    'Female',              // Generic fallback
                    'en-US',               // Language fallback
                    'en-GB'                // UK English fallback
                ];
                
                // Find the best matching female voice
                let selectedVoice = null;
                for (const voiceName of femaleVoiceNames) {
                    selectedVoice = voices.find(v => 
                        v.name.toLowerCase().includes(voiceName.toLowerCase())
                    );
                    if (selectedVoice) break;
                }
                
                // Final fallback: any English female-sounding voice
                if (!selectedVoice) {
                    selectedVoice = voices.find(v => 
                        v.lang.startsWith('en') && 
                        !v.name.toLowerCase().includes('male') &&
                        !v.name.toLowerCase().includes('david') &&
                        !v.name.toLowerCase().includes('mark') &&
                        !v.name.toLowerCase().includes('james')
                    ) || voices[0];
                }
                
                if (selectedVoice) {
                    console.log('🎙️ Using voice:', selectedVoice.name);
                    utterance.voice = selectedVoice;
                    // Slightly adjust pitch for a more pleasant tone
                    utterance.pitch = 1.05;
                    utterance.rate = 0.95; // Slightly slower for clarity
                }
                
                utterance.onstart = () => {
                    if (window.fluidSimulation) {
                        window.fluidSimulation.setExcitement(0.6);
                    }
                };
                
                utterance.onend = () => {
                    if (window.fluidSimulation) {
                        window.fluidSimulation.setExcitement(0.2);
                    }
                    this.currentSpeechResolve = null;
                    resolve();
                };
                
                utterance.onerror = (event) => {
                    console.error('Speech synthesis error:', event.error);
                    this.currentSpeechResolve = null;
                    resolve();
                };
                
                this.synthesis.speak(utterance);
                
            } catch (error) {
                console.error('Speech synthesis failed:', error);
                this.currentSpeechResolve = null;
                resolve();
            }
        });
    }
    
    // Interrupt speaking (called when user taps mic button during speaking)
    async interruptSpeaking() {
        console.log('🛑 Interrupting speech synthesis...');
        
        // Cancel any ongoing speech
        if (this.synthesis) {
            this.synthesis.cancel();
        }
        
        // Reset speaking state
        this.isSpeaking = false;
        
        // Resolve the pending speak promise if any
        if (this.currentSpeechResolve) {
            this.currentSpeechResolve();
            this.currentSpeechResolve = null;
        }
        
        // Update fluid simulation
        if (window.fluidSimulation) {
            window.fluidSimulation.setExcitement(0.4);
        }
        
        // Transition to listening state
        window.AppState?.setState('listening', { source: 'interrupt' });
        
        // Wait a moment for audio to fully stop before resuming recognition
        await this.delay(300);
        
        // Resume recognition now that speaking has stopped
        if (!this.config.useLocalDetection) {
            this.resumeWakeWordDetection();
        }
        
        // Start conversation timeout
        this.startConversationTimeout();
        
        console.log('✅ Speech interrupted - now in listening mode');
    }
    
    // Audio visualization for Web Speech API
    startWebAudioVisualization() {
        if (!this.analyser || !this.dataArray) return;
        
        const updateVisualization = () => {
            if (!this.isListening) return;
            
            this.analyser.getByteFrequencyData(this.dataArray);
            
            const average = this.dataArray.reduce((a, b) => a + b, 0) / this.dataArray.length;
            const normalized = average / 255;
            
            if (window.fluidSimulation) {
                window.fluidSimulation.setAudioLevel(normalized);
            }
            
            requestAnimationFrame(updateVisualization);
        };
        
        updateVisualization();
    }
    
    stopWebAudioVisualization() {
        // Visualization will stop automatically when isListening becomes false
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    getStatus() {
        return {
            isListening: this.isListening,
            isPaused: this.isPaused,
            isRestarting: this.isRestarting,
            isSpeaking: this.isSpeaking,
            isInConversation: this.isInConversation,
            useLocalDetection: this.config.useLocalDetection,
            hasRecognition: !!this.recognition,
            hasSynthesis: !!this.synthesis,
            lastCommand: this.lastCommand,
            restartAttempts: this.restartAttempts,
            consecutiveErrors: this.consecutiveErrors
        };
    }
    
    destroy() {
        this.stopWakeWordDetection();
        
        if (this.audioStream) {
            this.audioStream.getTracks().forEach(track => track.stop());
        }
        
        if (this.audioContext) {
            this.audioContext.close();
        }
        
        this.synthesis?.cancel();
    }
}

// Global voice manager instance
window.VoiceManager = new VoiceManager();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = VoiceManager;
}