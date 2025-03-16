/**
 * tabOverride.test.js
 * 
 * Manual test script to verify the tab override functionality
 */

// This is a manual test script to verify the tab override functionality

console.log('=== Tab Override Test ===');
console.log('Instructions:');
console.log('1. Install the extension');
console.log('2. Open a new browser window');
console.log('3. Open a new tab - THIS SHOULD SHOW THE DEFAULT CHROME NEW TAB PAGE');
console.log('4. Open another new tab - THIS SHOULD SHOW THE CUSTOM TIMER PAGE');
console.log('5. Close the window and repeat steps 2-4 to verify the behavior persists');
console.log('=== End Test ===');

// You can also use these commands in the Chrome DevTools console to verify the state:

/*
// In the background service worker console:
await chrome.windows.getAll({ populate: true });  // Get all windows and tabs

// If you have access to TabManager:
const tabManager = await import('./modules/tabManager.js');
tabManager.default.getWindowMap();  // Get current window map
*/ 