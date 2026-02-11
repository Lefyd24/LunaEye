# 🌙 LunaEye - AI Voice Assistant

> A futuristic, Siri-inspired AI voice assistant with real-time fluid visualization, built as a Progressive Web App (PWA)

[![PWA](https://img.shields.io/badge/PWA-Installable-blue)](https://web.dev/progressive-web-apps/)
[![WebGL](https://img.shields.io/badge/WebGL-Enabled-green)](https://www.khronos.org/webgl/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

<video src='./demo_video.mp4' controls autoplay loop style="width:100%; max-width:1000px;"></video>

## ✨ Features

### 🎯 Core Capabilities
- **🎤 Voice-Activated**: Wake word detection ("Hey Luna") with continuous listening
- **🗣️ Natural Conversation**: Speech recognition + text-to-speech synthesis
- **🌊 Liquid Animations**: Siri-like morphing blob visualizations with WebGL fluid dynamics
- **📱 Progressive Web App**: Installable desktop application with offline support
- **🔄 Real-time Sync**: WebSocket-based backend communication with tool support
- **🎨 Glassmorphism UI**: Modern frosted glass effects with ambient particles

### 🎭 Visual Magic
- **Morphing Blobs**: Organic liquid motion with 8-blob system
- **Audio Waveforms**: Real-time voice visualization during listening/speaking
- **Multi-Layer Glow**: Ambient, mid, and inner glow effects
- **Fluid Simulation**: WebGL-powered background with 2-3 second color transitions
- **State Animations**: Smooth transitions between idle → waking → listening → thinking → speaking

### 🛠️ Technical Highlights
- **Modular Architecture**: ES6+ classes with clean separation of concerns
- **State Machine**: Centralized state management with transition callbacks
- **GPU-Accelerated**: Hardware-accelerated CSS transforms + Canvas rendering
- **Service Worker**: Offline functionality with intelligent resource caching
- **Tool Integration**: Backend can execute tools with real-time progress updates

---

## 🚀 Quick Start

### Prerequisites
- Modern web browser with JavaScript ES6+ support
- Microphone access for voice features
- **Chrome/Edge recommended** for full Web Speech API support

### Installation

#### Option 1: Local Development Server
```bash
# Clone the repository
git clone https://github.com/yourusername/LunaEye_v1.git
cd LunaEye_v1

# Serve with Python (recommended)
python -m http.server 8000

# OR use Node.js
npx serve .

# OR use PHP
php -S localhost:8000
```

Then open **http://localhost:8000** in your browser.

#### Option 2: PWA Installation
1. Visit the hosted URL in Chrome/Edge
2. Click the **Install** button in the address bar (⊕ icon)
3. Launch from your desktop/start menu

---

## 🔧 Configuration

### Backend Connection

LunaEye communicates with a backend server via **HTTP REST** and **WebSocket** connections.

#### Default Settings
```javascript
// assets/js/app.js
this.config = {
    apiEndpoint: 'http://localhost:8000',  // Change to your backend URL
    wakeWord: 'Hey Luna',
    autoConnectApi: true
};

// assets/js/api-client.js
this.config = {
    baseUrl: 'http://localhost',
    port: 8000,
    useWebSocket: true
};
```

#### UI Configuration
You can also configure the API connection through the **Settings Panel**:
1. Click the ⚙️ settings icon in the UI
2. Enter your backend URL (e.g., `http://192.168.1.100`)
3. Set the port (default: `8000`)
4. Toggle WebSocket on/off
5. Click **Connect** or **Test Connection**

Settings are persisted in `localStorage`.

---

## 🌐 Backend Integration

### API Routes & Protocol

LunaEye expects a backend server with the following endpoints:

#### 1. **WebSocket Connection** (Recommended)
```
ws://your-backend:8000/ws
```

**Message Format (Client → Server):**
```json
{
  "type": "voice_command",
  "text": "What's the weather today?",
  "thread_id": "lunaeye_1234567890_abc",
  "timestamp": "2024-02-11T10:30:00.000Z"
}
```

**Response Format (Server → Client):**
```json
{
  "type": "text.response",
  "text": "The weather today is sunny with a high of 72°F.",
  "thread_id": "lunaeye_1234567890_abc"
}
```

**Tool Execution Events:**
```json
// When tool starts
{
  "type": "tool.start",
  "tool": {
    "name": "get_weather",
    "description": "Fetching weather data..."
  }
}

// When tool completes
{
  "type": "tool.end",
  "tool": {
    "name": "get_weather",
    "result": "Success"
  }
}
```

#### 2. **HTTP REST API** (Fallback)
```
POST http://your-backend:8000/api/chat
Content-Type: application/json
```

**Request Body:**
```json
{
  "message": "What's the weather today?",
  "thread_id": "lunaeye_1234567890_abc",
  "context": "lunaeye-assistant"
}
```

**Response:**
```json
{
  "response": "The weather today is sunny with a high of 72°F.",
  "thread_id": "lunaeye_1234567890_abc",
  "timestamp": "2024-02-11T10:30:00.000Z"
}
```

#### 3. **Health Check**
```
GET http://your-backend:8000/health
```

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0"
}
```

### State Management Flow

```
User Says "Hey Luna"
    ↓
[IDLE] → [WAKING] (200-500ms)
    ↓
[LISTENING] (captures speech, 8s timeout)
    ↓
Transcript sent via WebSocket
    ↓
[THINKING] (awaiting backend response)
    ↓
Backend sends response + tool events
    ↓
[SPEAKING] (TTS plays response)
    ↓
[IDLE] (or stay in [LISTENING] if conversation mode)
```

### Tool Timeout Handling

When the backend uses tools that take longer than 15 seconds:
- Frontend automatically extends timeout to **60 seconds**
- Tool progress shown via `tool.start` events
- Late responses are handled gracefully with `handleLateResponse()`

---

## 📂 Project Structure

```
LunaEye_v1/
├── index.html                # Main entry point with inline SVG filters
├── manifest.json             # PWA manifest with icons + shortcuts
├── sw.js                     # Service worker for offline caching
│
├── assets/
│   ├── css/
│   │   ├── main.css          # Glassmorphism, glow effects, GPU optimizations
│   │   └── animations.css    # Blob-morph, gradient-flow, audio-ripple keyframes
│   │
│   ├── js/
│   │   ├── app.js            # Main controller, initializes all modules
│   │   ├── states.js         # State machine with transition durations + callbacks
│   │   ├── voice.js          # Speech recognition, TTS, wake word detection
│   │   ├── voice-visualizer.js  # Morphing blobs, waveforms, multi-layer glow
│   │   ├── fluid-simulation.js  # WebGL fluid dynamics with audio reactivity
│   │   ├── particles.js      # Ambient particle system
│   │   ├── ui.js             # UI controller, audio sync bridge
│   │   └── api-client.js     # WebSocket + HTTP communication
│   │
│   └── icons/
│       └── favicon.ico       # App icon
│
└── .github/
    └── copilot-instructions.md  # Development guidelines (not for public)
```

---

## 🎨 Customization

### Wake Word
```javascript
// assets/js/voice.js
this.wakeWord = 'Hey Luna';  // Change to any phrase
```

### Color Scheme
```css
/* index.html or assets/css/main.css */
:root {
    --color-idle: #4a9eff;      /* Idle state color */
    --color-listening: #06b6d4;  /* Listening state color */
    --color-thinking: #8b5cf6;   /* Thinking state color */
    --color-speaking: #ec4899;   /* Speaking state color */
}
```

### Particle Intensity
```javascript
// assets/js/states.js
[this.states.LISTENING]: {
    particleIntensity: 0.8  // 0.1 - 1.0 (higher = more particles)
}
```

### Transition Durations
```javascript
// assets/js/states.js
transitionDurations: {
    idle: 1000,       // 1 second
    waking: 600,      // 0.6 seconds
    listening: 400,   // 0.4 seconds
    thinking: 800,
    speaking: 500,
    error: 300
}
```

---

## 🖥️ Browser Compatibility

### Full Support ✅
| Feature | Chrome 88+ | Edge 88+ | Safari 14.1+ | Firefox 85+ |
|---------|------------|----------|--------------|-------------|
| Voice Recognition | ✅ | ✅ | ⚠️ Limited | ⚠️ Limited |
| Text-to-Speech | ✅ | ✅ | ✅ | ✅ |
| WebGL | ✅ | ✅ | ✅ | ✅ |
| PWA Install | ✅ | ✅ | ✅ | ✅ |
| Service Worker | ✅ | ✅ | ✅ | ✅ |
| Offline Mode | ✅ | ✅ | ✅ | ✅ |

**Note:** Voice recognition works best in Chrome/Edge. Safari/Firefox require network connectivity for speech-to-text.

---

## 🐛 Troubleshooting

### Microphone Not Working
- ✅ Grant microphone permissions (browser address bar icon)
- ✅ Ensure HTTPS or localhost (required for Web APIs)
- ✅ Try Chrome/Edge for best compatibility

### WebSocket Connection Failed
- ✅ Check backend server is running
- ✅ Verify URL/port in Settings panel
- ✅ Check browser console for CORS errors
- ✅ Ensure backend allows WebSocket connections

### Voice Recognition Not Detecting
- ✅ Speak clearly and loudly
- ✅ Check microphone isn't muted in system settings
- ✅ Try saying the wake word: "Hey Luna"
- ✅ Enable debug mode: `window.app.config.debug = true` in console

### Animations Lagging
- ✅ Close heavy background processes
- ✅ Reduce particle intensity in Settings
- ✅ Check GPU acceleration: `chrome://gpu`
- ✅ Lower screen resolution/zoom

### PWA Not Installing
- ✅ Must be served over HTTPS (or localhost)
- ✅ Check manifest.json is valid
- ✅ Verify service worker registered: DevTools → Application → Service Workers

---

## 🔍 Debugging

### Console Commands
```javascript
// Check current state
window.AppState.getCurrentState()

// View state history
window.AppState.getStateHistory(10)

// Export full debug info
window.AppState.export()

// Voice manager status
window.VoiceManager.getStatus()

// API connection status
window.LunaAPI.getStatus()

// UI state
window.UIController.getUIState()
```

### DevTools Tips
- **Network Tab**: Monitor WebSocket messages (`ws://...`)
- **Console**: Look for prefixed logs (`🎙️ VoiceManager:`, `🌐 LunaAPI:`)
- **Application Tab**: Check Service Worker status, localStorage values
- **Performance Tab**: Profile animations if lagging

---

## 🛣️ Roadmap & Future Improvements

### Planned Features 🎯
- [ ] **Multi-language support** - Voice recognition in Spanish, French, German, etc.
- [ ] **Custom wake word training** - User-defined wake phrases with ML model
- [ ] **Voice profiles** - Multiple users with personalized voices
- [ ] **Conversation history** - Persistent chat logs with search
- [ ] **Plugin system** - Extensible tool framework for custom commands
- [ ] **Mobile responsiveness** - Touch-optimized UI for tablets/phones
- [ ] **Theme customization** - User-selectable color schemes + dark/light modes
- [ ] **Gesture controls** - Hand gesture recognition via webcam
- [ ] **Emotion detection** - Voice sentiment analysis for adaptive responses
- [ ] **Offline AI mode** - Local LLM integration (e.g., Ollama, LLaMA)

### Performance Optimizations 🚀
- [ ] WebAssembly fluid simulation for 60fps on low-end devices
- [ ] Lazy-load modules with dynamic imports
- [ ] IndexedDB for offline conversation storage
- [ ] WebWorker for audio processing

### Backend Enhancements 🔧
- [ ] REST API documentation (OpenAPI/Swagger)
- [ ] Authentication/authorization (JWT tokens)
- [ ] Rate limiting and request throttling
- [ ] Streaming responses for long-form content
- [ ] Multi-modal support (image, file uploads)

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork** the repository
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Setup
```bash
# Clone your fork
git clone https://github.com/yourusername/LunaEye_v1.git
cd LunaEye_v1

# Start local server
python -m http.server 8000

# Open http://localhost:8000
```

### Code Style
- **JavaScript**: ES6+ classes, camelCase for variables/methods
- **CSS**: Custom properties for colors, kebab-case for class names
- **Logging**: Prefix with emoji + module name: `console.log('🎙️ VoiceManager: ...')`
- **Comments**: JSDoc for complex methods, inline for "why" not "what"

---

## 📜 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Web Speech API** - [MDN Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- **WebGL Fluid Simulation** - Inspired by [PavelDoGreat/WebGL-Fluid-Simulation](https://github.com/PavelDoGreat/WebGL-Fluid-Simulation)
- **Glassmorphism Design** - [UI Glass](https://ui.glass/)
- **Progressive Web Apps** - [web.dev PWA Guide](https://web.dev/progressive-web-apps/)

---

## 📧 Support

- **Issues**: [GitHub Issues](https://github.com/lefyd24/LunaEye_v1/issues)
- **Discussions**: [GitHub Discussions](https://github.com/lefyd24/LunaEye_v1/discussions)
- **Email**: fthenosyd@gmail.com

---

<div align="center">

**Built with ❤️ using modern web technologies**

[⭐ Star this repo](https://github.com/lefyd24/LunaEye_v1) | [🐛 Report Bug](https://github.com/lefyd24/LunaEye_v1/issues) | [💡 Request Feature](https://github.com/lefyd24/LunaEye_v1/issues)

</div>
