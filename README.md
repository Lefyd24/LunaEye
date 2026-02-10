# LunaEye AI Assistant

A futuristic AI personal assistant with voice interaction capabilities, built as a Progressive Web App (PWA).

## Features

### 🎯 Core Functionality
- **Voice-Activated**: Wake word detection with "Hey Assistant"
- **Full Voice Interaction**: Speech recognition and text-to-speech synthesis
- **Progressive Web App**: Installable desktop application with offline support
- **State Management**: Intelligent state transitions between idle, listening, thinking, and speaking

### 🎨 Futuristic Design
- **Glassmorphism UI**: Modern frosted glass effects with backdrop blur
- **Ambient Particles**: Dynamic particle system with state-based intensity
- **Smooth Animations**: Carefully crafted transitions between states
- **Responsive Visual Feedback**: Real-time voice visualization and waveform displays

### 🔧 Technical Features
- **Modular Architecture**: Clean separation of concerns with ES6+ modules
- **Service Worker**: Offline functionality and resource caching
- **Browser Compatibility**: Progressive enhancement with fallbacks
- **Performance Optimized**: GPU-accelerated animations and efficient rendering

## Getting Started

### Prerequisites
- Modern web browser with JavaScript ES6+ support
- Microphone access for voice features (Chrome/Edge recommended for full functionality)

### Installation
1. Clone this repository
2. Serve the files using a local web server (required for service worker functionality)
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx serve .
   
   # Using PHP
   php -S localhost:8000
   ```
3. Open `http://localhost:8000` in your browser
4. Grant microphone permissions when prompted
5. Install as a desktop app using your browser's "Install" button

### Usage
1. **Wake the Assistant**: Say "Hey Assistant" to activate listening mode
2. **Give Commands**: Speak your command when the interface shows "Listening..."
3. **Receive Responses**: The assistant will process your command and respond verbally
4. **Keyboard Shortcuts**:
   - `Space`: Toggle microphone
   - `Ctrl/Cmd + K`: Quick command
   - `Esc`: Return to idle state

## Project Structure

```
LunaEye_v1/
├── index.html                 # Main application entry point
├── manifest.json             # PWA manifest for installation
├── sw.js                     # Service worker for offline functionality
└── assets/
    ├── css/
    │   ├── main.css          # Core styles and glassmorphism effects
    │   └── animations.css    # Futuristic animations
    ├── js/
    │   ├── app.js            # Main application controller
    │   ├── states.js         # State management system
    │   ├── voice.js          # Speech recognition/synthesis
    │   ├── ui.js             # UI interaction handlers
    │   └── particles.js      # Particle system and visual effects
    └── icons/
        └── favicon.ico       # App icon
```

## Configuration

### Backend API Integration
The application includes placeholders for backend integration. Update these files:

1. **API Endpoint**: In `assets/js/app.js`, update `this.config.apiEndpoint`
2. **API Key**: In `assets/js/app.js`, update `this.config.apiKey`
3. **Command Processing**: In `assets/js/voice.js`, modify `processCommand()` method

### Customization Options
- **Wake Word**: Change in `assets/js/voice.js` - `this.wakeWord = 'hey assistant'`
- **Colors**: Modify CSS variables in `index.html` or `assets/css/main.css`
- **Particle Settings**: Adjust in `assets/js/particles.js` - `this.config`
- **Voice Settings**: Configure in `assets/js/voice.js` - `this.config`

## Browser Compatibility

### Full Support
- Chrome 88+
- Edge 88+
- Safari 14.1+ (limited voice recognition)
- Firefox 85+ (limited voice recognition)

### Feature Support Matrix
| Feature | Chrome | Edge | Safari | Firefox |
|---------|---------|------|--------|---------|
| Voice Recognition | ✅ | ✅ | ❌ | ❌ |
| Text-to-Speech | ✅ | ✅ | ✅ | ✅ |
| PWA Installation | ✅ | ✅ | ✅ | ✅ |
| Service Worker | ✅ | ✅ | ✅ | ✅ |
| Offline Support | ✅ | ✅ | ✅ | ✅ |

## API Integration

### Backend Requirements
Your backend should provide an endpoint that accepts POST requests with the following structure:

```json
{
  "command": "user command text",
  "context": "lunaeye-assistant",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "sessionId": "session_1234567890_abcdef"
}
```

### Response Format
```json
{
  "text": "Response text to be spoken",
  "action": "action_type",
  "data": {}
}
```

### Example Backend Implementation
```javascript
// Example Express.js route
app.post('/assistant/process', (req, res) => {
  const { command } = req.body;
  
  // Process command and generate response
  const response = processCommand(command);
  
  res.json(response);
});
```

## Development

### Local Development
1. Make changes to the source files
2. Refresh your browser to see changes
3. Use browser DevTools for debugging
4. Check console for logs and errors

### Debugging
- **Console Logs**: All major events are logged to the console
- **State Inspector**: `window.AppState.export()` to view current state
- **Voice Status**: `window.VoiceManager.getStatus()` for voice system status
- **UI State**: `window.UIController.getUIState()` for UI status

### Performance Optimization
- Uses `requestAnimationFrame` for smooth animations
- GPU-accelerated CSS transforms
- Efficient particle rendering with canvas
- Resource caching via service worker

## Deployment

### Static Hosting
This application can be deployed to any static hosting service:
- Netlify
- Vercel
- GitHub Pages
- Firebase Hosting
- AWS S3

### Requirements
- HTTPS required for microphone access
- Proper MIME types for service worker
- CORS headers if using external APIs

## Troubleshooting

### Common Issues

**Microphone not working:**
- Check browser permissions
- Ensure HTTPS is being used
- Try Chrome or Edge for best compatibility

**PWA not installing:**
- Check that the site is served over HTTPS
- Verify service worker is properly registered
- Check manifest.json for errors

**Voice recognition not working:**
- Chrome/Edge provide the best support
- Check if microphone permissions are granted
- Ensure you're speaking clearly and loudly enough

**Animations not smooth:**
- Check if GPU acceleration is available
- Reduce particle count in settings
- Ensure no heavy background processes

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

For support and questions:
- Open an issue on GitHub
- Check the browser console for error messages
- Refer to the troubleshooting section above

---

**Built with ❤️ using modern web technologies**