// LunaEye State Management System
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
        
        // State configurations
        this.stateConfigs = {
            [this.states.IDLE]: {
                statusText: 'Listening...',
                orbClass: 'state-idle',
                showControls: false,
                showResponse: false,
                voiceVisualization: false,
                particleIntensity: 0.3
            },
            [this.states.WAKING]: {
                statusText: 'Wake word detected...',
                orbClass: 'state-waking',
                showControls: false,
                showResponse: false,
                voiceVisualization: true,
                particleIntensity: 0.6
            },
            [this.states.LISTENING]: {
                statusText: 'Listening...',
                orbClass: 'state-listening',
                showControls: true,
                showResponse: false,
                voiceVisualization: true,
                particleIntensity: 0.8
            },
            [this.states.THINKING]: {
                statusText: 'Thinking...',
                orbClass: 'state-thinking',
                showControls: false,
                showResponse: false,
                voiceVisualization: false,
                particleIntensity: 0.5
            },
            [this.states.SPEAKING]: {
                statusText: 'Speaking...',
                orbClass: 'state-speaking',
                showControls: false,
                showResponse: true,
                voiceVisualization: false,
                particleIntensity: 0.7
            },
            [this.states.ERROR]: {
                statusText: 'Error occurred',
                orbClass: 'state-error',
                showControls: true,
                showResponse: true,
                voiceVisualization: false,
                particleIntensity: 0.1
            }
        };
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
        
        // Notify listeners
        this.notifyListeners(newState, this.previousState, context);
        
        // Log state change
        console.log(`State changed: ${this.previousState} -> ${newState}`, context);
        
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
            [this.states.SPEAKING]: [this.states.IDLE, this.states.ERROR],
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