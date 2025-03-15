/**
 * Storage Module for Countdown Timer Extension
 * Handles all interactions with Chrome's storage API
 */

const StorageKeys = {
  TIMER_TYPE: 'timerType',
  BIRTH_DATE: 'birthDate',
  LIFE_EXPECTANCY: 'lifeExpectancy',
  SETUP_COMPLETED: 'setupCompleted'
};

const TimerTypes = {
  LIFE: 'life',
  BIRTHDAY: 'birthday',
  DAILY: 'daily'
};

// Default settings
const DEFAULT_SETTINGS = {
  [StorageKeys.TIMER_TYPE]: TimerTypes.LIFE,
  [StorageKeys.LIFE_EXPECTANCY]: 80,
  [StorageKeys.SETUP_COMPLETED]: false
};

/**
 * Storage manager for the extension
 */
class StorageManager {
  constructor() {
    // Check if chrome.storage is available
    this.isStorageAvailable = typeof chrome !== 'undefined' && 
                              chrome.storage && 
                              chrome.storage.sync;
    
    if (!this.isStorageAvailable) {
      console.warn('Chrome storage API not available. Using localStorage instead.');
    }
  }
  
  /**
   * Save to localStorage as fallback
   * @param {Object} settings - Settings to save
   */
  _saveToLocalStorage(settings) {
    try {
      for (const key in settings) {
        localStorage.setItem(key, JSON.stringify(settings[key]));
      }
      console.log('Settings saved to localStorage:', settings);
      return true;
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      return false;
    }
  }
  
  /**
   * Get from localStorage as fallback
   * @param {string|null} key - Key to get (null for all settings)
   * @returns {Object} Settings object
   */
  _getFromLocalStorage(key) {
    try {
      if (key === null) {
        // Get all settings
        const result = {};
        for (const storageKey of Object.values(StorageKeys)) {
          const value = localStorage.getItem(storageKey);
          if (value !== null) {
            try {
              result[storageKey] = JSON.parse(value);
            } catch (e) {
              result[storageKey] = value;
            }
          }
        }
        return result;
      } else if (Array.isArray(key)) {
        // Get multiple keys
        const result = {};
        for (const k of key) {
          const value = localStorage.getItem(k);
          if (value !== null) {
            try {
              result[k] = JSON.parse(value);
            } catch (e) {
              result[k] = value;
            }
          }
        }
        return result;
      } else {
        // Get single key
        const value = localStorage.getItem(key);
        return value !== null ? { [key]: JSON.parse(value) } : {};
      }
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return {};
    }
  }
  
  /**
   * Clear localStorage data for extension
   */
  _clearLocalStorage() {
    try {
      for (const key of Object.values(StorageKeys)) {
        localStorage.removeItem(key);
      }
      return true;
    } catch (error) {
      console.error('Error clearing localStorage:', error);
      return false;
    }
  }

  /**
   * Save user settings to Chrome storage
   * @param {Object} settings - Settings object
   * @returns {Promise} Promise that resolves when settings are saved
   */
  saveSettings(settings) {
    return new Promise((resolve, reject) => {
      // Use localStorage if Chrome storage is not available
      if (!this.isStorageAvailable) {
        const success = this._saveToLocalStorage(settings);
        if (success) {
          resolve();
        } else {
          reject(new Error('Failed to save settings to localStorage'));
        }
        return;
      }
      
      // Use Chrome storage
      try {
        chrome.storage.sync.set(settings, () => {
          if (chrome.runtime.lastError) {
            console.error('Error saving settings:', chrome.runtime.lastError);
            // Try localStorage as fallback
            console.warn('Falling back to localStorage');
            const success = this._saveToLocalStorage(settings);
            if (success) {
              resolve();
            } else {
              reject(chrome.runtime.lastError);
            }
          } else {
            console.log('Settings saved successfully:', settings);
            resolve();
          }
        });
      } catch (error) {
        console.error('Exception while saving settings:', error);
        // Try localStorage as fallback
        const success = this._saveToLocalStorage(settings);
        if (success) {
          resolve();
        } else {
          reject(error);
        }
      }
    });
  }

  /**
   * Get all user settings from Chrome storage
   * @returns {Promise<Object>} Promise that resolves with settings object
   */
  getSettings() {
    return new Promise((resolve, reject) => {
      // Use localStorage if Chrome storage is not available
      if (!this.isStorageAvailable) {
        const settings = this._getFromLocalStorage(null);
        resolve(settings);
        return;
      }
      
      // Use Chrome storage
      try {
        chrome.storage.sync.get(null, (result) => {
          if (chrome.runtime.lastError) {
            console.error('Error getting settings:', chrome.runtime.lastError);
            // Try localStorage as fallback
            console.warn('Falling back to localStorage for getting settings');
            const settings = this._getFromLocalStorage(null);
            resolve(settings);
          } else {
            console.log('Settings retrieved successfully:', result);
            resolve(result);
          }
        });
      } catch (error) {
        console.error('Exception while getting settings:', error);
        // Try localStorage as fallback
        const settings = this._getFromLocalStorage(null);
        resolve(settings);
      }
    });
  }

  /**
   * Get a specific setting from Chrome storage
   * @param {string} key - The key to retrieve
   * @returns {Promise<any>} Promise that resolves with the setting value
   */
  getSetting(key) {
    return new Promise((resolve, reject) => {
      // Use localStorage if Chrome storage is not available
      if (!this.isStorageAvailable) {
        const result = this._getFromLocalStorage(key);
        resolve(result[key]);
        return;
      }
      
      // Use Chrome storage
      try {
        chrome.storage.sync.get([key], (result) => {
          if (chrome.runtime.lastError) {
            console.error(`Error getting setting ${key}:`, chrome.runtime.lastError);
            // Try localStorage as fallback
            const localResult = this._getFromLocalStorage(key);
            resolve(localResult[key]);
          } else {
            console.log(`Setting ${key} retrieved:`, result[key]);
            resolve(result[key]);
          }
        });
      } catch (error) {
        console.error(`Exception while getting setting ${key}:`, error);
        // Try localStorage as fallback
        const localResult = this._getFromLocalStorage(key);
        resolve(localResult[key]);
      }
    });
  }

  /**
   * Check if setup has been completed
   * @returns {Promise<boolean>} Promise that resolves with setup status
   */
  isSetupCompleted() {
    return this.getSetting(StorageKeys.SETUP_COMPLETED)
      .then(completed => !!completed)
      .catch(() => {
        // Extra fallback - check localStorage directly
        try {
          const value = localStorage.getItem(StorageKeys.SETUP_COMPLETED);
          return value !== null ? JSON.parse(value) : false;
        } catch (e) {
          return false;
        }
      });
  }

  /**
   * Save the timer type selection
   * @param {string} timerType - Selected timer type
   * @returns {Promise} Promise that resolves when timer type is saved
   */
  saveTimerType(timerType) {
    return this.saveSettings({ [StorageKeys.TIMER_TYPE]: timerType });
  }

  /**
   * Save birth date
   * @param {string} birthDate - Birth date in ISO format
   * @returns {Promise} Promise that resolves when birth date is saved
   */
  saveBirthDate(birthDate) {
    return this.saveSettings({ [StorageKeys.BIRTH_DATE]: birthDate });
  }

  /**
   * Save life expectancy
   * @param {number} years - Life expectancy in years
   * @returns {Promise} Promise that resolves when life expectancy is saved
   */
  saveLifeExpectancy(years) {
    return this.saveSettings({ [StorageKeys.LIFE_EXPECTANCY]: years });
  }

  /**
   * Mark setup as completed
   * @returns {Promise} Promise that resolves when setup status is saved
   */
  completeSetup() {
    return this.saveSettings({ [StorageKeys.SETUP_COMPLETED]: true });
  }

  /**
   * Reset all settings to defaults
   * @returns {Promise} Promise that resolves when settings are reset
   */
  resetSettings() {
    return new Promise((resolve, reject) => {
      // Use localStorage if Chrome storage is not available
      if (!this.isStorageAvailable) {
        const success = this._clearLocalStorage();
        if (success) {
          this._saveToLocalStorage(DEFAULT_SETTINGS);
          resolve();
        } else {
          reject(new Error('Failed to clear localStorage'));
        }
        return;
      }
      
      // Use Chrome storage
      try {
        chrome.storage.sync.clear(() => {
          if (chrome.runtime.lastError) {
            console.error('Error clearing settings:', chrome.runtime.lastError);
            // Try localStorage as fallback
            const success = this._clearLocalStorage();
            if (success) {
              this._saveToLocalStorage(DEFAULT_SETTINGS);
              resolve();
            } else {
              reject(chrome.runtime.lastError);
            }
          } else {
            console.log('Settings cleared successfully');
            // Set default settings after clearing
            this.saveSettings(DEFAULT_SETTINGS)
              .then(resolve)
              .catch(reject);
          }
        });
      } catch (error) {
        console.error('Exception while clearing settings:', error);
        // Try localStorage as fallback
        const success = this._clearLocalStorage();
        if (success) {
          this._saveToLocalStorage(DEFAULT_SETTINGS);
          resolve();
        } else {
          reject(error);
        }
      }
    });
  }
}

// Create and export a singleton instance
const storageManager = new StorageManager();

// For testing in non-extension environments
if (typeof chrome === 'undefined' || !chrome.storage) {
  console.warn('Chrome storage API not available. Using a mock implementation.');
  
  // Create a simple storage mock for testing
  const mockStorage = {};
  
  // Mock Chrome storage API
  window.chrome = {
    runtime: { lastError: null },
    storage: {
      sync: {
        get: (keys, callback) => {
          if (keys === null) {
            callback(Object.assign({}, mockStorage));
          } else if (typeof keys === 'string') {
            callback({ [keys]: mockStorage[keys] });
          } else if (Array.isArray(keys)) {
            const result = {};
            keys.forEach(key => {
              if (mockStorage[key] !== undefined) {
                result[key] = mockStorage[key];
              }
            });
            callback(result);
          } else {
            callback(Object.keys(keys).reduce((result, key) => {
              result[key] = mockStorage[key] !== undefined ? mockStorage[key] : keys[key];
              return result;
            }, {}));
          }
        },
        set: (items, callback) => {
          Object.assign(mockStorage, items);
          if (callback) callback();
        },
        clear: (callback) => {
          Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
          if (callback) callback();
        }
      }
    }
  };
} 