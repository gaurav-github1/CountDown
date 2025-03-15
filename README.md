# Countdown Timer Chrome Extension

A Chrome extension that replaces the new tab page with a customizable countdown timer for important life events.

## Features

- **Three Timer Types:**
  - **Life Timer:** Counts down based on your birthdate and estimated life expectancy
  - **Birthday Timer:** Counts down to your next birthday
  - **Daily Timer:** Counts down to midnight of the current day

- **Intuitive UI:**
  - Clean, distraction-free interface
  - Real-time updates every second
  - Visual progress indicator
  - Motivational quotes based on timer type

- **Customizable:**
  - Simple setup process for first-time users
  - Easy settings management through extension popup
  - Persistent storage of preferences across devices
  - Reset option for starting over

- **Accessibility:**
  - Support for dark mode based on system preferences
  - High-contrast typography for readability
  - Responsive design for all screen sizes

## Installation

### From Chrome Web Store (Recommended)

1. Visit the [Chrome Web Store](https://chrome.google.com/webstore/) and search for "Countdown Timer"
2. Click "Add to Chrome"
3. Confirm the installation

### Manual Installation (Developer Mode)

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the extension directory
5. The extension is now installed and will override your new tab page

## Usage

1. **First-Time Setup:**
   - When you open a new tab for the first time, you'll see the setup screen
   - Choose your preferred timer type
   - Enter required information (birthdate, life expectancy)
   - Click "Start Countdown" to begin

2. **Changing Settings:**
   - Click the extension icon in your browser toolbar
   - Modify settings in the popup
   - Click "Save Changes" to update

3. **Resetting Settings:**
   - Click the extension icon in your browser toolbar
   - Click "Reset All Settings" in the popup
   - Confirm the reset when prompted

## Privacy

This extension respects your privacy:
- All data is stored locally on your device using Chrome's secure storage
- No data is transmitted to external servers
- No analytics or tracking is implemented

## Development

### Project Structure

- `manifest.json`: Extension configuration
- `newtab.html/css/js`: New tab page implementation
- `popup.html/css/js`: Settings popup implementation
- `background.js`: Background service worker
- `js/storage.js`: Storage management
- `js/timerCalculations.js`: Timer calculation logic
- `icons/`: Extension icons

### Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with CSS, HTML, and JavaScript
- Icons by [Feather Icons](https://feathericons.com/)
- Fonts from Google Fonts 