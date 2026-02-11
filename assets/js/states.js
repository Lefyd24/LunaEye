// LunaEye State Management System
// Enhanced with transition durations and visual effect hooks

class StateManager {
    constructor() {
        this.states = {
            IDLE: 'idle',
            WAKING: 'waking', 
            LISTENING: 'listening',
            THINKING: 'thinking',
            SPEAKING: 'speaking',
            ERROR: 'error'
        };
        
        this.currentState = this.states.IDLE;
        this.previousState = null;
        this.stateHistory = [];
        this.listeners = new Map();
        this.transitionCallbacks = new Map();
        
        // Transition duration configuration per state (in milliseconds)
        this.transitionDurations = {
            [this.states.IDLE]: 1000,      // Slower return to idle
            [this.states.WAKING]: 600,     // Quick wake-up
            [this.states.LISTENING]: 400,  // Fast response to listening
            [this.states.THINKING]: 800,   // Moderate thinking transition
            [this.states.SPEAKING]: 500,   // Medium speaking transition
            [this.states.ERROR]: 300       // Quick error indication
        };
        
        // State configurations
        this.stateConfigs = {
            [this.states.IDLE]: {
                statusText: 'Listening...',
                orbClass: 'state-idle',
                showControls: false,
                showResponse: false,
                voiceVisualization: false,
                particleIntensity: 0.3,
                // Siri-like visual parameters
                glowIntensity: 0.4,
                pulseSpeed: 6,        // Slow breathing
                colorTransitionMs: 2500
            },
            [this.states.WAKING]: {
                statusText: 'Wake word detected...',
                orbClass: 'state-waking',
                showControls: false,
                showResponse: false,
                voiceVisualization: true,
                particleIntensity: 0.6,
                glowIntensity: 0.8,
                pulseSpeed: 1.2,      // Fast energetic pulse
                colorTransitionMs: 600
            },
            [this.states.LISTENING]: {
                statusText: 'Listening...',
                orbClass: 'state-listening',
                showControls: true,
                showResponse: false,
                voiceVisualization: true,
                particleIntensity: 0.8,
                glowIntensity: 0.7,
                pulseSpeed: 2,        // Responsive pulse
                colorTransitionMs: 800
            },
            [this.states.THINKING]: {
                statusText: 'Thinking...',
                orbClass: 'state-thinking',
                showControls: false,
                showResponse: false,
                voiceVisualization: false,
                particleIntensity: 0.5,
                glowIntensity: 0.6,
                pulseSpeed: 1.5,      // Processing rotation
                colorTransitionMs: 2000
            },
            [this.states.SPEAKING]: {
                statusText: 'Speaking...',
                orbClass: 'state-speaking',
                showControls: false,
                showResponse: true,
                voiceVisualization: false,
                particleIntensity: 0.7,
                glowIntensity: 0.75,
                pulseSpeed: 0.8,      // Speech rhythm
                colorTransitionMs: 1500
            },
            [this.states.ERROR]: {
                statusText: 'Error occurred',
                orbClass: 'state-error',
                showControls: true,
                showResponse: true,
                voiceVisualization: false,
                particleIntensity: 0.1,
                glowIntensity: 0.5,
                pulseSpeed: 0.3,      // Quick alert shake
                colorTransitionMs: 500
            }
        };
    }
    
    // Register pre/post transition callbacks
    onTransition(event, callback) {
        if (!this.transitionCallbacks.has(event)) {
            this.transitionCallbacks.set(event, new Set());
        }
        this.transitionCallbacks.get(event).add(callback);
        
        return () => {
            this.transitionCallbacks.get(event)?.delete(callback);
        };
    }
    
    // Execute transition callbacks
    executeTransitionCallbacks(event, data) {
        this.transitionCallbacks.get(event)?.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Transition callback error for ${event}:`, error);
            }
        });
    }
    
    // Get transition duration for a state
    getTransitionDuration(state) {
        return this.transitionDurations[state] || 500;
    }
    
    // Change state with validation and callbacks
    setState(newState, context = {}) {
        if (!this.isValidState(newState)) {
            console.error(`Invalid state: ${newState}`);
            return false;
        }
        
        if (this.currentState === newState) {
            return true; // Already in this state
        }
        
        // Execute pre-transition callbacks
        this.executeTransitionCallbacks('preTransition', {
            from: this.currentState,
            to: newState,
            context: context
        });
        
        // Store state history
        this.stateHistory.push({
            state: this.currentState,
            timestamp: Date.now(),
            context: context
        });
        
        // Limit history size
        if (this.stateHistory.length > 50) {
            this.stateHistory.shift();
        }
        
        this.previousState = this.currentState;
        this.currentState = newState;
        
        // Get transition duration for visual timing
        const transitionDuration = this.getTransitionDuration(newState);
        
        // Notify listeners with transition timing info
        this.notifyListeners(newState, this.previousState, {
            ...context,
            transitionDuration: transitionDuration,
            colorTransitionMs: this.stateConfigs[newState]?.colorTransitionMs || 1000
        });
        
        // Execute post-transition callbacks after transition duration
        setTimeout(() => {
            this.executeTransitionCallbacks('postTransition', {
                from: this.previousState,
                to: newState,
                context: context
            });
        }, transitionDuration);
        
        // Log state change with timing
        console.log(`🔄 State: ${this.previousState} → ${newState} (${transitionDuration}ms)`, context);
        
        return true;
    }
    
    // Validate state
    isValidState(state) {
        return Object.values(this.states).includes(state);
    }
    
    // Get current state
    getCurrentState() {
        return this.currentState;
    }
    
    // Get previous state
    getPreviousState() {
        return this.previousState;
    }
    
    // Get state configuration
    getStateConfig(state = null) {
        const targetState = state || this.currentState;
        return this.stateConfigs[targetState] || this.stateConfigs[this.states.IDLE];
    }
    
    // Subscribe to state changes
    subscribe(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
        
        // Return unsubscribe function
        return () => {
            this.listeners.get(event)?.delete(callback);
        };
    }
    
    // Notify all listeners
    notifyListeners(newState, previousState, context) {
        const events = ['stateChange', `state:${newState}`, `from:${previousState}`];
        
        events.forEach(event => {
            this.listeners.get(event)?.forEach(callback => {
                try {
                    callback(newState, previousState, context);
                } catch (error) {
                    console.error(`State listener error for ${event}:`, error);
                }
            });
        });
    }
    
    // Check if can transition to new state
    canTransitionTo(newState) {
        const transitions = {
            [this.states.IDLE]: [this.states.WAKING, this.states.ERROR],
            [this.states.WAKING]: [this.states.LISTENING, this.states.IDLE, this.states.ERROR],
            [this.states.LISTENING]: [this.states.THINKING, this.states.IDLE, this.states.ERROR],
            [this.states.THINKING]: [this.states.SPEAKING, this.states.IDLE, this.states.ERROR],
            [this.states.SPEAKING]: [this.states.IDLE, this.states.LISTENING, this.states.ERROR], // Added LISTENING for conversation mode & wake word interrupt
            [this.states.ERROR]: [this.states.IDLE]
        };
        
        return transitions[this.currentState]?.includes(newState) || false;
    }
    
    // Get state history
    getStateHistory(limit = 10) {
        return this.stateHistory.slice(-limit);
    }
    
    // Check if in error state
    isError() {
        return this.currentState === this.states.ERROR;
    }
    
    // Check if active (not idle)
    isActive() {
        return this.currentState !== this.states.IDLE;
    }
    
    // Check if processing
    isProcessing() {
        return [this.states.THINKING, this.states.SPEAKING].includes(this.currentState);
    }
    
    // Reset to idle state
    reset() {
        this.setState(this.states.IDLE, { reason: 'reset' });
    }
    
    // Get duration in current state
    getStateDuration() {
        const currentStateEntry = this.stateHistory
            .reverse()
            .find(entry => entry.state === this.currentState);
        
        return currentStateEntry 
            ? Date.now() - currentStateEntry.timestamp 
            : 0;
    }
    
    // Export state for debugging
    export() {
        return {
            current: this.currentState,
            previous: this.previousState,
            config: this.getStateConfig(),
            history: this.getStateHistory(),
            duration: this.getStateDuration(),
            listeners: Array.from(this.listeners.keys())
        };
    }
}

// Global state instance
window.AppState = new StateManager();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StateManager;
}