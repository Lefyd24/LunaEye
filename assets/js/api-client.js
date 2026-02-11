// LunaEye API Client - Handles communication with Luna backend
class LunaAPIClient {
    constructor() {
        // Default API configuration
        this.config = {
            baseUrl: 'http://localhost',  // Change to your backend URL
            port: 8000,
            useWebSocket: true,
            reconnectInterval: 3000,
            maxReconnectAttempts: 5
        };
        
        // State
        this.ws = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.threadId = this.generateThreadId();
        this.messageQueue = [];
        this.pendingCallbacks = new Map();
        
        // Load saved configuration
        this.loadConfig();
        
        // Event handlers
        this.onStateChange = null;
        this.onResponse = null;
        this.onToolStart = null;
        this.onError = null;
        this.onConnectionChange = null;
        
        console.log('Luna API Client initialized');
    }
    
    // Generate unique thread ID for this session
    generateThreadId() {
        return `lunaeye_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Get full API URL
    getApiUrl() {
        const url = this.config.baseUrl.replace(/\/$/, '');
        return this.config.port ? `${url}:${this.config.port}` : url;
    }
    
    // Get WebSocket URL
    getWsUrl() {
        const httpUrl = this.getApiUrl();
        return httpUrl.replace(/^http/, 'ws') + '/ws';
    }
    
    // Load configuration from localStorage
    loadConfig() {
        try {
            const saved = localStorage.getItem('lunaeye-api-config');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.config = { ...this.config, ...parsed };
                console.log('Loaded API config:', this.config);
            }
        } catch (e) {
            console.warn('Failed to load API config:', e);
        }
    }
    
    // Save configuration to localStorage
    saveConfig() {
        try {
            localStorage.setItem('lunaeye-api-config', JSON.stringify(this.config));
            console.log('Saved API config');
        } catch (e) {
            console.warn('Failed to save API config:', e);
        }
    }
    
    // Update API URL
    setApiUrl(url, port = null) {
        this.config.baseUrl = url;
        if (port !== null) {
            this.config.port = port;
        }
        this.saveConfig();
        
        // Reconnect WebSocket with new URL
        if (this.ws) {
            this.disconnect();
            this.connect();
        }
    }
    
    // Connect via WebSocket
    async connect() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.log('WebSocket already connected');
            return true;
        }
        
        return new Promise((resolve) => {
            try {
                const wsUrl = this.getWsUrl();
                console.log('Connecting to WebSocket:', wsUrl);
                
                this.ws = new WebSocket(wsUrl);
                
                this.ws.onopen = () => {
                    console.log('WebSocket connected');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    
                    if (this.onConnectionChange) {
                        this.onConnectionChange(true);
                    }
                    
                    // Process queued messages
                    this.processMessageQueue();
                    
                    resolve(true);
                };
                
                this.ws.onmessage = (event) => {
                    this.handleWsMessage(event.data);
                };
                
                this.ws.onclose = (event) => {
                    console.log('WebSocket closed:', event.code, event.reason);
                    this.isConnected = false;
                    
                    if (this.onConnectionChange) {
                        this.onConnectionChange(false);
                    }
                    
                    // Attempt reconnection
                    this.attemptReconnect();
                };
                
                this.ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    this.isConnected = false;
                    
                    if (this.onError) {
                        this.onError('Connection error');
                    }
                    
                    resolve(false);
                };
                
                // Timeout for connection
                setTimeout(() => {
                    if (!this.isConnected) {
                        console.warn('WebSocket connection timeout');
                        resolve(false);
                    }
                }, 5000);
                
            } catch (error) {
                console.error('Failed to create WebSocket:', error);
                resolve(false);
            }
        });
    }
    
    // Disconnect WebSocket
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
    }
    
    // Attempt reconnection
    attemptReconnect() {
        if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
            console.log('Max reconnect attempts reached');
            return;
        }
        
        this.reconnectAttempts++;
        console.log(`Reconnecting in ${this.config.reconnectInterval}ms (attempt ${this.reconnectAttempts})`);
        
        setTimeout(() => {
            this.connect();
        }, this.config.reconnectInterval);
    }
    
    // Handle incoming WebSocket message
    handleWsMessage(data) {
        try {
            const message = JSON.parse(data);
            
            // Only log important messages, not heartbeats
            if (!['heartbeat_ack', 'hello'].includes(message.type)) {
                console.log('🌙 Luna:', message.type, message.text || '');
            }
            
            switch (message.type) {
                case 'hello':
                    // Update thread ID from server
                    if (message.thread_id) {
                        this.threadId = message.thread_id;
                    }
                    break;
                    
                case 'heartbeat_ack':
                    // Heartbeat acknowledged
                    break;
                    
                case 'state.change':
                    if (this.onStateChange) {
                        this.onStateChange(message.state.toLowerCase());
                    }
                    break;
                    
                case 'tool.start':
                    if (this.onToolStart) {
                        this.onToolStart(message.tool, message.arguments);
                    }
                    break;
                    
                case 'text.response':
                    if (this.onResponse) {
                        this.onResponse({
                            text: message.text,
                            toolsUsed: message.tools_used || []
                        });
                    }
                    break;
                    
                case 'error':
                    if (this.onError) {
                        this.onError(message.message || 'Unknown error');
                    }
                    break;
                    
                case 'cleared':
                    console.log('Conversation cleared');
                    break;
            }
            
        } catch (error) {
            console.error('Failed to parse WS message:', error);
        }
    }
    
    // Process queued messages after connection
    processMessageQueue() {
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            this.sendWsMessage(message);
        }
    }
    
    // Send WebSocket message
    sendWsMessage(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
            return true;
        } else {
            // Queue message for later
            this.messageQueue.push(message);
            // Try to connect
            this.connect();
            return false;
        }
    }
    
    // Send text message via WebSocket
    async sendMessage(text) {
        if (this.config.useWebSocket && this.isConnected) {
            return this.sendWsMessage({
                type: 'input.text',
                text: text
            });
        } else {
            // Fallback to REST API
            return this.sendMessageRest(text);
        }
    }
    
    // Send message via REST API
    async sendMessageRest(text) {
        try {
            const url = `${this.getApiUrl()}/chat`;
            console.log('Sending REST message to:', url);
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: text,
                    thread_id: this.threadId,
                    user_name: 'lunaeye_user'
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            return {
                text: data.response,
                toolsUsed: data.tools_used || []
            };
            
        } catch (error) {
            console.error('REST API error:', error);
            throw error;
        }
    }
    
    // Check API status
    async checkStatus() {
        try {
            const url = `${this.getApiUrl()}/status`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                return { connected: false, status: 'error' };
            }
            
            const data = await response.json();
            return {
                connected: true,
                status: data.status,
                agentReady: data.agent_ready,
                toolsCount: data.tools_count
            };
            
        } catch (error) {
            console.warn('Status check failed:', error);
            return { connected: false, status: 'unreachable' };
        }
    }
    
    // Clear conversation history
    async clearHistory() {
        if (this.config.useWebSocket && this.isConnected) {
            this.sendWsMessage({ type: 'clear' });
        } else {
            try {
                await fetch(`${this.getApiUrl()}/clear`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        thread_id: this.threadId
                    })
                });
            } catch (error) {
                console.error('Failed to clear history:', error);
            }
        }
        
        // Generate new thread ID
        this.threadId = this.generateThreadId();
    }
    
    // Send heartbeat
    sendHeartbeat() {
        if (this.isConnected) {
            this.sendWsMessage({ type: 'heartbeat' });
        }
    }
    
    // Get current configuration
    getConfig() {
        return { ...this.config };
    }
    
    // Get connection status
    getStatus() {
        return {
            isConnected: this.isConnected,
            apiUrl: this.getApiUrl(),
            wsUrl: this.getWsUrl(),
            threadId: this.threadId,
            reconnectAttempts: this.reconnectAttempts
        };
    }
}

// Global API client instance
window.LunaAPI = new LunaAPIClient();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LunaAPIClient;
}
