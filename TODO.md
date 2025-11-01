# ✅ AI-PC System TODO List

**Last Updated:** January 6, 2025

## 🔴 High Priority (This Week)

### File Upload/Attachment Support
- [ ] Create `FileService` in backend
- [ ] Add file upload endpoint `/api/files/upload`
- [ ] Implement file storage (local filesystem first)
- [ ] Add virus scanning with ClamAV
- [ ] Create `FileUploadButton` component
- [ ] Add drag-and-drop to `ChatInput`
- [ ] Display file attachments in messages
- [ ] Support image preview inline
- [ ] Add PDF viewer component
- [ ] Implement file size limits (25MB)

### Settings Modal
- [ ] Create `SettingsModal` component
- [ ] Add AI model preferences section
- [ ] Temperature slider (0-1)
- [ ] Max tokens input (100-4000)
- [ ] Voice language selector
- [ ] Theme toggle (light/dark/system)
- [ ] Notification preferences
- [ ] API usage statistics display
- [ ] Save preferences to backend
- [ ] Apply settings per session

### Real-time WebSocket
- [ ] Fix WebSocket connection in backend
- [ ] Implement proper Socket.io rooms
- [ ] Add typing indicators
- [ ] Show online/offline status
- [ ] Message delivery confirmation
- [ ] Handle reconnection gracefully
- [ ] Add connection status indicator
- [ ] Implement message queue for offline

## 🟡 Medium Priority (Next Week)

### Gmail Integration
- [ ] Create Google OAuth consent screen
- [ ] Implement OAuth 2.0 flow
- [ ] Add Gmail scopes to permissions
- [ ] Create `GmailService` class
- [ ] List emails endpoint
- [ ] Read email endpoint
- [ ] Send email through chat
- [ ] Search emails functionality
- [ ] Handle attachments
- [ ] Add email templates

### Google Drive Integration
- [ ] Add Drive scopes to OAuth
- [ ] Create `DriveService` class
- [ ] List files/folders endpoint
- [ ] Upload file to Drive
- [ ] Download file from Drive
- [ ] Create folders
- [ ] Share files/folders
- [ ] Search Drive content
- [ ] Display Drive files in UI
- [ ] Drag files from Drive to chat

### Export Chat History
- [ ] Add export button to chat header
- [ ] Create `ExportService`
- [ ] Generate PDF with styling
- [ ] Export as Markdown
- [ ] Export as JSON
- [ ] Include message metadata
- [ ] Add date range filter
- [ ] Batch export sessions
- [ ] Email exported file option
- [ ] Progress indicator for large exports

## 🟢 Low Priority (Future)

### Advanced Voice Features
- [ ] Implement wake word detection
- [ ] Add voice activity detection (VAD)
- [ ] Support continuous recording mode
- [ ] Add noise cancellation
- [ ] Implement TTS for responses
- [ ] Multi-language voice support
- [ ] Voice command shortcuts
- [ ] Audio visualization
- [ ] Voice training/calibration

### Desktop App (Tauri)
- [ ] Set up Tauri project
- [ ] Configure build pipeline
- [ ] Add system tray icon
- [ ] Global hotkey for activation
- [ ] Native notifications
- [ ] File system integration
- [ ] Auto-start on login
- [ ] Update mechanism
- [ ] Code signing setup
- [ ] Distribution packages

### Performance Optimizations
- [ ] Implement message pagination
- [ ] Add virtual scrolling for long chats
- [ ] Optimize bundle splitting
- [ ] Add service worker for offline
- [ ] Implement response streaming
- [ ] Database query optimization
- [ ] Add Redis caching layer
- [ ] CDN for static assets
- [ ] Image optimization pipeline

## 🐛 Bug Fixes

- [ ] Fix WebSocket reconnection issues
- [ ] Handle API rate limits gracefully
- [ ] Fix voice recording on Safari
- [ ] Improve error messages
- [ ] Fix dark mode inconsistencies
- [ ] Handle large message rendering
- [ ] Fix session switching lag

## 🧪 Testing

- [ ] Set up Jest for backend
- [ ] Add React Testing Library
- [ ] Write auth flow tests
- [ ] Test AI router logic
- [ ] Add E2E tests with Playwright
- [ ] Test voice recording cross-browser
- [ ] Load testing with K6
- [ ] Security testing
- [ ] Accessibility testing

## 📚 Documentation

- [ ] API documentation with examples
- [ ] Component storybook
- [ ] Deployment guide
- [ ] Contributing guidelines
- [ ] Security best practices
- [ ] Performance tuning guide
- [ ] Troubleshooting guide
- [ ] Video tutorials

## 🔒 Security

- [ ] Implement rate limiting
- [ ] Add CSRF protection
- [ ] Set up CSP headers
- [ ] API key encryption
- [ ] Session timeout handling
- [ ] Input sanitization
- [ ] SQL injection prevention
- [ ] XSS protection
- [ ] File upload validation

## 💅 UI/UX Improvements

- [ ] Add loading skeletons
- [ ] Improve mobile layout
- [ ] Add keyboard shortcuts
- [ ] Better error messages
- [ ] Smooth animations
- [ ] Improved onboarding
- [ ] Context menus
- [ ] Tooltips for features
- [ ] Accessibility improvements

---

**Note**: Items are sorted by implementation order within each priority level.