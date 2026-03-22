# Troubleshooting Guide

## Common Issues & Solutions

### Drawing & Writing Issues

#### Q: My drawings are not appearing on the canvas
**Solutions:**
1. Check browser compatibility (Chrome 90+, Firefox 88+, Safari 14+)
2. Clear browser cache: Settings → Privacy → Clear browsing data
3. Try a different browser to isolate the issue
4. Check console for errors: F12 → Console tab

#### Q: Drawing feels laggy or stuttering
**Solutions:**
1. Close other browser tabs to free memory
2. Disable browser extensions (especially ad blockers)
3. Check internet connection stability
4. Update browser to latest version
5. Reduce drawing brush size for better performance
6. Restart the browser or computer

#### Q: Text input not responding
**Solutions:**
1. Click on the text area again to ensure focus
2. Check if Caps Lock is on
3. Try different keyboard layout (if applicable)
4. Disable browser keyboard shortcuts temporarily
5. Clear browser cache and reload

### Save & Storage Issues

#### Q: My notes are not saving
**Troubleshooting:**
1. Check storage quota: Open DevTools → Application → Storage
2. Free up storage space (delete old downloads/cache)
3. Disable browser cache restrictions
4. Try incognito/private mode (different storage)
5. Check browser privacy settings allow local storage

**Fix:**
- Export note as file backup
- Clear old notes to free space
- Try in different browser

#### Q: "Storage quota exceeded" error
**Solutions:**
1. Delete old export files from Downloads
2. Clear temporary browser data
3. Clear application storage: 
   - Chrome: Settings → Privacy → Delete browsing data → Cookies and site data
4. Reduce undo history limit
5. Export and archive old notes

### Offline & Sync Issues

#### Q: App not working without internet
**Solutions:**
1. Ensure PWA is properly installed
2. First visit the app online to cache files
3. Check Service Worker status: DevTools → Application → Service Workers
4. Clear Service Worker cache and reinstall

**Commands:**
```javascript
// Open DevTools Console and run:
navigator.serviceWorker.getRegistrations()
  .then(registrations => {
    registrations.forEach(r => r.unregister())
  })
// Then reload page
```

#### Q: Changes not syncing across devices
**Note:** Cloud sync not available in v1.3.1
- Export notes as backup
- Manual sync recommended
- Cloud sync coming in v1.4.0

### Export Issues

#### Q: PDF export fails or shows blank
**Solutions:**
1. Reduce canvas size (zoom out first)
2. Try PNG export instead
3. Check browser memory (close tabs)
4. Clear browser cache
5. Try different file format (SVG, Markdown)

#### Q: Exported images have poor quality
**Solutions:**
1. Use PNG instead of JPG
2. Increase export resolution
3. Make sure drawing is zoomed to 100%
4. Try SVG for vector quality

#### Q: Cannot download exported file
**Solutions:**
1. Check if downloads are blocked in permissions
2. Verify download folder has write access
3. Disable download protection
4. Try private/incognito mode
5. Restart browser

### UI & Theme Issues

#### Q: Dark mode not working
**Solutions:**
1. Refresh page: Ctrl+F5 (hard refresh)
2. Clear browser cache
3. Check system theme setting
4. Verify browser dark mode preference
5. Try manual theme toggle in app

#### Q: Buttons or menus not responding
**Solutions:**
1. Zoom out: Ctrl+- (if interface too large)
2. Maximize browser window
3. Try different screen resolution
4. Disable browser zoom: Ctrl+0
5. Hard refresh: Ctrl+Shift+Delete

#### Q: Command palette (Ctrl+P) not opening
**Solutions:**
1. Check if Ctrl+P is hijacked by browser
2. Try Cmd+P on macOS
3. Access via menu instead
4. Check browser search override settings

### Mobile Issues

#### Q: Touch input not working on mobile
**Solutions:**
1. Ensure non-palm rejection is enabled
2. Try capacitor app from GitHub releases
3. Use stylus instead of finger
4. Check device moisture (capacitive touch)
5. Restart mobile browser

#### Q: Keyboard not appearing on mobile
**Solutions:**
1. Tap text area again to trigger keyboard
2. Check iOS/Android keyboard settings
3. Try different keyboard app
4. Disable accessibility zoom features
5. Restart device

### Performance Issues

#### Q: App is slow or freezes
**Solutions:**
1. Close browser tabs to free memory
2. Reduce undo history size
3. Clear browser cache
4. Restart browser
5. Restart computer

**Check:**
- Open Task Manager (Windows) or Activity Monitor (Mac)
- Look for high CPU/Memory usage
- Close background applications

#### Q: Large files crash the browser
**Solutions:**
1. Work with smaller canvas sizes
2. Export and start new note regularly
3. Increase system RAM (if possible)
4. Use capacitor desktop app for better performance
5. Split large project into multiple notes

### Account & Permissions

#### Q: Permission denied errors
**Solutions:**
1. Check browser permissions: Settings → Privacy & security → Permissions
2. Allow local storage access for the app
3. Allow clipboard access for copy/paste
4. Restart browser to reset permissions
5. Check parental controls

#### Q: Cannot use camera/microphone
**Note:** Not required for MindNotes Pro
- Camera/mic features not available in v1.3.1
- Coming in future versions

### Browser-Specific Issues

#### Firefox
```
Issue: Slow performance
Fix: Disable hardware acceleration: about:config → layers.acceleration.force-enabled
```

#### Safari  
```
Issue: export not working
Fix: Enable 3rd party cookies in Privacy settings
```

#### Edge
```
Issue: Sync issues
Fix: Sync not available in Edge until cloud sync launched (v1.4.0)
```

## Getting Help

### Still stuck?

1. **Check Status:** https://github.com/11suixing11/mindnotes-pro/issues
2. **Search Discussions:** https://github.com/11suixing11/mindnotes-pro/discussions
3. **Report Issue:** https://github.com/11suixing11/mindnotes-pro/issues/new
4. **Contact:** 1977717178@qq.com

### When reporting issues, include:
- Browser name & version
- Operating system
- Steps to reproduce
- Screenshot/video if possible
- Console errors (F12 → Console)
- Browser storage status

## Advanced Troubleshooting

### Reset Application State
```javascript
// Open DevTools Console and run:
localStorage.clear()
window.location.reload()
```

### Disable Service Worker Temporarily
```javascript
navigator.serviceWorker.controller?.postMessage({
  type: 'SKIP_WAITING'
})
```

### View Debug Logs
```bash
# Set environment variable before building
VITE_ENABLE_DEBUG_LOGS=true npm run build
```

### Check Network Activity
1. DevTools → Network tab
2. Reload page
3. Look for failed requests (red)
4. Check response codes and messages

---

**Last Updated:** v1.3.1 (2026-03-22)
**For latest troubleshooting:** https://github.com/11suixing11/mindnotes-pro/discussions
