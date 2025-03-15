/**
 * Background Service Worker for Countdown Timer Extension
 */

// Constants
const ALARM_CHECK_INTERVAL = 'check-timer-events';
const CHECK_INTERVAL_MINUTES = 60; // Check once per hour

// Initialize when installed or updated
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed or updated:', details.reason);
  
  // Start alarm for periodic checks
  setupAlarm();
});

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

// Get settings from storage
function getSettings() {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.sync.get(null, (result) => {
        if (chrome.runtime.lastError) {
          console.error('Error getting settings:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          resolve(result);
        }
      });
    } catch (error) {
      console.error('Exception while getting settings:', error);
      reject(error);
    }
  });
} 