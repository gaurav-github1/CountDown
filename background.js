/**
 * Background Service Worker for Countdown Timer Extension
 * Handles background tasks like notifications, alarms, and communication
 */

// Constants
const ALARM_CHECK_INTERVAL = 'check-timer-events';
const CHECK_INTERVAL_MINUTES = 60; // Check once per hour

// Define TimerTypes constants that match the ones used in other files
const TimerTypes = {
  LIFE: 'life',
  BIRTHDAY: 'birthday',
  DAILY: 'daily'
};

// Debug mode for additional logging
const DEBUG = true;

// Listen for installation event
chrome.runtime.onInstalled.addListener(function(details) {
  // Handle first install
  if (details.reason === 'install') {
    log('First install - initializing defaults');
    initializeDefaultSettings();
  } 
  // Handle update
  else if (details.reason === 'update') {
    log(`Updated from version ${details.previousVersion}`);
    // Check if we need to migrate settings
    checkSettingsMigration();
  }
  
  // Start alarm for periodic checks
  setupAlarm();
});

/**
 * Listen for messages from other extension components
 */
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  log('Received message:', message);
  
  // Message from popup to reload tabs after settings change
  if (message.action === 'reloadNewTabs') {
    log('Reload requested for new tabs');
    reloadNewTabs()
      .then(() => {
        sendResponse({ success: true, message: 'Tabs reloaded successfully' });
      })
      .catch(error => {
        log('Error reloading tabs:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep channel open for async response
  }
  
  // Check settings status
  if (message.action === 'checkSettings') {
    log('Settings check requested');
    getSettings()
      .then(settings => {
        sendResponse({ success: true, settings });
      })
      .catch(error => {
        log('Error checking settings:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep channel open for async response
  }
  
  // Reset all settings
  if (message.action === 'resetSettings') {
    log('Settings reset requested');
    resetSettings()
      .then(() => {
        sendResponse({ success: true });
      })
      .catch(error => {
        log('Error resetting settings:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep channel open for async response
  }
  
  // Default response for unhandled messages
  sendResponse({ success: false, error: 'Unknown message action' });
  return false;
});

/**
 * Initialize default settings for new installations
 * @returns {Promise} - Resolves when settings are initialized
 */
function initializeDefaultSettings() {
  return new Promise((resolve, reject) => {
    const defaultSettings = {
      timerType: TimerTypes.DAILY,
      setupCompleted: true
    };
    
    chrome.storage.sync.set(defaultSettings, function() {
      if (chrome.runtime.lastError) {
        log('Error initializing default settings:', chrome.runtime.lastError);
        reject(new Error('Failed to initialize settings'));
      } else {
        log('Default settings initialized');
        resolve();
      }
    });
  });
}

/**
 * Check if settings need migration (e.g., after an update)
 * @returns {Promise} - Resolves when migration check is complete
 */
function checkSettingsMigration() {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(null, function(settings) {
      if (chrome.runtime.lastError) {
        log('Error checking settings for migration:', chrome.runtime.lastError);
        reject(new Error('Failed to check settings'));
        return;
      }
      
      let needsMigration = false;
      let migratedSettings = {};
      
      // Check if we have old format or missing keys
      if (settings.timerType === undefined) {
        log('Missing timerType, adding default');
        migratedSettings.timerType = TimerTypes.DAILY;
        needsMigration = true;
      } else if (typeof settings.timerType === 'object') {
        // Handle case where timerType might be stored in old format
        log('Converting timerType object to string');
        
        // Try to determine the correct timer type from old format
        if (settings.timerType.LIFE === true) {
          migratedSettings.timerType = TimerTypes.LIFE;
        } else if (settings.timerType.BIRTHDAY === true) {
          migratedSettings.timerType = TimerTypes.BIRTHDAY;
        } else {
          migratedSettings.timerType = TimerTypes.DAILY;
        }
        
        needsMigration = true;
      }
      
      // Ensure setupCompleted exists
      if (settings.setupCompleted === undefined) {
        log('Missing setupCompleted, setting to true');
        migratedSettings.setupCompleted = true;
        needsMigration = true;
      }
      
      // Apply migrations if needed
      if (needsMigration) {
        log('Applying settings migration:', migratedSettings);
        
        chrome.storage.sync.set(migratedSettings, function() {
          if (chrome.runtime.lastError) {
            log('Error migrating settings:', chrome.runtime.lastError);
            reject(new Error('Failed to migrate settings'));
          } else {
            log('Settings migration complete');
            resolve();
          }
        });
      } else {
        log('No settings migration needed');
        resolve();
      }
    });
  });
}

/**
 * Reset all settings to defaults
 * @returns {Promise} - Resolves when settings are reset
 */
function resetSettings() {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.clear(function() {
      if (chrome.runtime.lastError) {
        log('Error clearing settings:', chrome.runtime.lastError);
        reject(new Error('Failed to clear settings'));
      } else {
        log('Settings cleared');
        
        // Reinitialize with defaults
        initializeDefaultSettings()
          .then(() => {
            log('Default settings reinitialized');
            resolve();
          })
          .catch(reject);
      }
    });
  });
}

/**
 * Get all settings
 * @returns {Promise<Object>} - Resolves with settings object
 */
function getSettings() {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(null, function(settings) {
      if (chrome.runtime.lastError) {
        log('Error getting settings:', chrome.runtime.lastError);
        reject(new Error('Failed to get settings'));
      } else {
        log('Settings retrieved:', settings);
        resolve(settings);
      }
    });
  });
}

/**
 * Reload all new tab pages to reflect new settings
 * @returns {Promise} - Resolves when tabs are reloaded
 */
function reloadNewTabs() {
  return new Promise((resolve, reject) => {
    try {
      chrome.tabs.query({ url: "chrome://newtab/*" }, function(tabs) {
        log(`Found ${tabs.length} new tab pages to reload`);
        
        if (!tabs || tabs.length === 0) {
          // No new tabs found, resolve immediately
          resolve();
          return;
        }
        
        // Counter for reloaded tabs
        let reloadedTabs = 0;
        const totalTabs = tabs.length;
        
        // Reload each new tab page
        tabs.forEach(tab => {
          log(`Reloading tab ${tab.id}`);
          
          chrome.tabs.reload(tab.id, {}, function() {
            if (chrome.runtime.lastError) {
              log(`Error reloading tab ${tab.id}:`, chrome.runtime.lastError);
            } else {
              log(`Tab ${tab.id} reloaded successfully`);
            }
            
            reloadedTabs++;
            
            // All tabs reloaded
            if (reloadedTabs >= totalTabs) {
              resolve();
            }
          });
        });
        
        // Timeout in case some reloads take too long
        setTimeout(() => {
          if (reloadedTabs < totalTabs) {
            log(`Timeout waiting for ${totalTabs - reloadedTabs} tabs to reload`);
            resolve();
          }
        }, 5000);
      });
    } catch (error) {
      log('Error in reloadNewTabs:', error);
      reject(error);
    }
  });
}

/**
 * Log message to console if in debug mode
 * @param {...any} args - Arguments to log
 */
function log(...args) {
  if (DEBUG) {
    console.log('[Background]', ...args);
  }
}

// Setup periodic alarm for checking timer events
function setupAlarm() {
  // Clear any existing alarms
  chrome.alarms.clear(ALARM_CHECK_INTERVAL, () => {
    // Create new alarm
    chrome.alarms.create(ALARM_CHECK_INTERVAL, {
      periodInMinutes: CHECK_INTERVAL_MINUTES
    });
    
    console.log(`Alarm set to check timer events every ${CHECK_INTERVAL_MINUTES} minutes`);
  });
}

// Listen for alarm events
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_CHECK_INTERVAL) {
    checkTimerEvents();
  }
});

// Check for timer events (birthdays, etc.)
async function checkTimerEvents() {
  try {
    // Get user settings
    const settings = await getSettings();
    
    // If no settings or setup not completed, nothing to do
    if (!settings || !settings.setupCompleted) {
      return;
    }
    
    // Check for special events based on timer type
    switch (settings.timerType) {
      case 'birthday':
        checkForBirthday(settings.birthDate);
        break;
      
      case 'life':
        // Could check for milestone events in the life timer
        break;
        
      case 'daily':
        // Nothing special to check for daily timer
        break;
    }
    
  } catch (error) {
    console.error('Error checking timer events:', error);
  }
}

// Check if today is the user's birthday
function checkForBirthday(birthDateStr) {
  if (!birthDateStr) return;
  
  const birthDate = new Date(birthDateStr);
  const today = new Date();
  
  // Check if today is the birthday (same month and day)
  if (birthDate.getMonth() === today.getMonth() && 
      birthDate.getDate() === today.getDate()) {
    
    // Calculate age
    const age = today.getFullYear() - birthDate.getFullYear();
    
    // Create notification for birthday
    chrome.notifications.create('birthday-notification', {
      type: 'basic',
      iconUrl: 'icons/IMG_20220426_120041 (Custom).jpg',
      title: 'Happy Birthday!',
      message: `Today is your ${age}${getOrdinalSuffix(age)} birthday! 🎂`,
      priority: 2
    });
  }
}

// Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
function getOrdinalSuffix(num) {
  const j = num % 10;
  const k = num % 100;
  
  if (j === 1 && k !== 11) {
    return 'st';
  }
  if (j === 2 && k !== 12) {
    return 'nd';
  }
  if (j === 3 && k !== 13) {
    return 'rd';
  }
  return 'th';
}

// Set up a relay for message passing (in case direct messaging fails)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);
  
  // Check if this is a message relay request
  if (message.action === 'relayToNewTabs') {
    try {
      // Query for new tab pages
      chrome.tabs.query({url: chrome.runtime.getURL('newtab.html')}, (tabs) => {
        console.log(`Found ${tabs.length} new tab pages to relay message to`);
        
        // Counter for successful relays
        let successCount = 0;
        
        // Send message to each tab
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, message.payload, (response) => {
            if (chrome.runtime.lastError) {
              console.warn(`Error relaying message to tab ${tab.id}:`, chrome.runtime.lastError);
            } else {
              console.log(`Successfully relayed message to tab ${tab.id}:`, response);
              successCount++;
            }
            
            // If all tabs have been processed, send response
            if (successCount === tabs.length) {
              sendResponse({ 
                status: 'success', 
                message: `Successfully relayed message to ${successCount} tabs` 
              });
            }
          });
        });
        
        // If no tabs found, respond immediately
        if (tabs.length === 0) {
          sendResponse({ 
            status: 'warning', 
            message: 'No new tab pages found to relay message to' 
          });
        }
      });
      
      return true; // Indicates we'll send a response asynchronously
    } catch (error) {
      console.error('Error relaying message:', error);
      sendResponse({ 
        status: 'error', 
        message: `Error relaying message: ${error.message}` 
      });
    }
  } else if (message.action === 'checkPlatform') {
    // Provide platform information to help optimize UI
    let isWindows11 = false;
    
    // Try to detect Windows 11 (imperfect but can help)
    const userAgent = navigator.userAgent;
    if (userAgent.indexOf('Windows NT 10') !== -1) {
      // Windows 10 or 11 (Windows 11 reports as NT 10 but with newer build numbers)
      isWindows11 = userAgent.indexOf('Build/22') !== -1; // Build numbers for Win11 start with 22xxx
    }
    
    sendResponse({
      status: 'success',
      platform: {
        isWindows: userAgent.indexOf('Windows') !== -1,
        isWindows11: isWindows11,
        userAgent: userAgent
      }
    });
  }
  
  // Default behavior for unhandled messages
  return false;
}); 