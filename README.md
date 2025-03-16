# Timer Chrome Extension

A Chrome extension that displays a countdown timer on the new tab page. The extension features various timer types including daily, birthday, and life timers.

## Features

- Custom new tab page with countdown timer
- Multiple timer types (daily, birthday, life)
- Settings customization
- First tab in new window shows default Chrome new tab
- Subsequent tabs in the same window show the timer

## Architecture

The extension is built with a modular architecture, separating concerns into different modules:

### Core Files

- `manifest.json` - Extension configuration
- `newtab.html` - Custom new tab page
- `popup.html` - Extension popup interface

### JavaScript Modules

- `js/background.js` - Service worker that manages tab overrides
- `js/timerApp.js` - Main timer application logic
- `js/modules/tabManager.js` - Tab and window management
- `js/modules/diagnostic.js` - Diagnostic and debugging utilities

### CSS

- `styles/newtab.css` - Styles for the new tab page
- `styles/popup.css` - Styles for the extension popup

## Tab Override Behavior

The extension implements a special tab override behavior:

1. The first new tab opened in a new browser window will display Chrome's default new tab page
2. Subsequent new tabs in the same window will display the custom timer page
3. This pattern repeats for each new window that is opened

## Installation

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in the top-right)
4. Click "Load unpacked" and select the extension directory
5. The extension should now be installed and active

## Development

### Setting Up

1. Clone the repository
2. Navigate to the extension directory
3. The extension can be loaded directly into Chrome without a build step

### Testing

The extension includes diagnostic tools for testing the tab override functionality:

```javascript
// In Chrome DevTools console of the extension's background page:

// Test tab override behavior
const Diagnostic = await import('./modules/diagnostic.js');
await Diagnostic.default.testTabOverride();

// View current window and tab state
await Diagnostic.default.logCurrentState();

// Reset tab counts (for testing)
await Diagnostic.default.resetTracking();
```

### Debugging

If you encounter issues with the tab override functionality:

1. Open `chrome://extensions/` in Chrome
2. Find the Timer extension and click "Details"
3. Click "Background page" under "Inspect views" to open DevTools for the background page
4. View the console for detailed logs about tab detection and override decisions
5. Use the Diagnostic module's tools to gather detailed information:

```javascript
// Generate and download a complete diagnostic report
const Diagnostic = await import('./modules/diagnostic.js');
await Diagnostic.default.downloadDiagnosticInfo();
```

## Edge Cases Handled

The extension includes comprehensive handling for various edge cases:

- Race conditions in tab creation/updating
- Browser startup and extension initialization
- Service worker termination and restarts
- Multiple rapid tab openings
- Tab closures during redirection
- Memory leaks and resource cleanup
- Error recovery and graceful degradation

## Troubleshooting

### Timer Not Showing On New Tabs

If the timer is not showing on new tabs:

1. Check if the extension is enabled in `chrome://extensions/`
2. Verify that the first tab in each window is showing the default Chrome new tab (this is expected behavior)
3. Open the background page DevTools and check for any error messages
4. Try resetting the tab tracking by running the diagnostic reset tool

### Extension Popup Not Working

If the extension popup is not working:

1. Check the console for errors in the popup's DevTools
2. Verify that the extension has the necessary permissions
3. Try reloading the extension from `chrome://extensions/`

## License

[MIT License](LICENSE) 