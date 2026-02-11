# Contributing to LunaEye

Thank you for your interest in contributing to LunaEye! 🌙

## 🚀 Getting Started

### Prerequisites
- Modern web browser (Chrome/Edge recommended)
- Text editor or IDE
- Git installed on your machine
- Python 3 (for local server) OR Node.js

### Fork & Clone
```bash
# Fork this repository on GitHub, then:
git clone https://github.com/lefyd24/LunaEye.git
cd LunaEye
```

### Run Locally
```bash
# Option 1: Python
python -m http.server 8000

# Option 2: Node.js
npx serve .

# Then open http://localhost:8000
```

---

## 📝 Code Guidelines

### JavaScript Style
- **ES6+ syntax**: Use classes, arrow functions, template literals
- **Naming**: camelCase for variables/functions, UPPER_CASE for constants
- **Comments**: JSDoc for functions, inline for complex logic
- **Logging**: Prefix with emoji: `console.log('🎙️ VoiceManager: ...')`

Example:
```javascript
/**
 * Process voice command and return response
 * @param {string} transcript - User's speech transcript
 * @returns {Promise<string>} AI response text
 */
async processCommand(transcript) {
    console.log('🎙️ VoiceManager: Processing:', transcript);
    // Implementation...
}
```

### CSS Style
- **Custom properties**: Use CSS variables for colors/sizes
- **Class names**: kebab-case, semantic naming
- **Organization**: Group by component/feature
- **Performance**: Prefer `transform` + `opacity` for animations

Example:
```css
.voice-circle {
    --glow-color: var(--color-listening);
    transform: scale(1.2);
    opacity: 0.9;
    will-change: transform;
}
```

---

## 🧪 Testing Your Changes

### Manual Testing Checklist
- [ ] Voice recognition works (say "Hey Luna")
- [ ] TTS speaks responses
- [ ] Animations are smooth (60fps)
- [ ] No console errors
- [ ] Works in Chrome + Edge
- [ ] Settings panel functions correctly
- [ ] Service worker caches properly

### Performance Testing
```javascript
// In browser console:
window.performance.measure('animation-frame');
console.log(window.AppState.export());
```

---

## 📤 Submitting Changes

### Commit Message Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, missing semicolons, etc.
- `refactor`: Code restructuring
- `perf`: Performance improvement
- `test`: Adding tests
- `chore`: Maintenance tasks

**Examples:**
```bash
git commit -m "feat(voice): Add Spanish language support"
git commit -m "fix(ui): Resolve settings panel overflow on mobile"
git commit -m "docs(readme): Update installation instructions"
```

### Pull Request Process
1. **Create a branch**: `git checkout -b feature/amazing-feature`
2. **Make changes**: Implement your feature/fix
3. **Test thoroughly**: Check all functionality
4. **Commit**: Use clear, descriptive messages
5. **Push**: `git push origin feature/amazing-feature`
6. **Open PR**: Describe changes, link issues
7. **Wait for review**: Maintainers will review and provide feedback

### PR Description Template
```markdown
## What does this PR do?
Brief description of changes

## Type of change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tested in Chrome
- [ ] Tested in Edge
- [ ] No console errors
- [ ] Animations smooth

## Screenshots (if applicable)
[Add screenshots/videos]

## Related Issues
Closes #123
```

---

## 🐛 Reporting Bugs

Use the [GitHub Issues](https://github.com/lefyd24/LunaEye/issues) page.

### Bug Report Template
```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
1. Go to '...'
2. Click on '...'
3. Say '...'
4. See error

**Expected behavior**
What should happen

**Screenshots**
If applicable

**Environment:**
 - OS: [e.g., Windows 11]
 - Browser: [e.g., Chrome 120]
 - Version: [e.g., 2.0.0]

**Console logs**
Paste any errors from browser console
```

---

## 💡 Feature Requests

Feature requests are welcome! Please check [existing issues](https://github.com/lefyd24/LunaEye/issues) first.

### Feature Request Template
```markdown
**Is your feature request related to a problem?**
Description of the problem

**Describe the solution you'd like**
What you want to happen

**Describe alternatives you've considered**
Other solutions you've thought about

**Additional context**
Any other context, mockups, or examples
```

---

## 📚 Development Resources

### Project Architecture
- [State Management](./docs/state-management.md) - How states work
- [Voice System](./docs/voice-system.md) - Speech recognition/synthesis
- [API Integration](./docs/api-integration.md) - Backend communication

### Useful Links
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [WebGL Fluid Simulation](https://github.com/PavelDoGreat/WebGL-Fluid-Simulation)
- [PWA Best Practices](https://web.dev/progressive-web-apps/)

---

## 🤝 Code of Conduct

### Our Pledge
We are committed to providing a welcoming and inspiring community for all.

### Our Standards
- **Be respectful** of differing viewpoints
- **Be collaborative** - work together
- **Be patient** - everyone is learning
- **Be kind** - assume good intent

### Enforcement
Report unacceptable behavior to [email]. All complaints will be reviewed.

---

## 📜 License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).

---

## 🙏 Recognition

Contributors are recognized in:
- GitHub contributors page
- Release notes
- README acknowledgments section

Thank you for making LunaEye better! 🌙✨
