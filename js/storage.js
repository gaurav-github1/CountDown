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
 * Storage Manager for Countdown Timer Extension
 * Provides an interface for saving and retrieving settings from Chrome storage
 */

class StorageManager {
  constructor() {
    // Define storage keys
    this.keys = {
      TIMER_TYPE: 'timerType',
      BIRTH_DATE: 'birthDate',
      LIFE_EXPECTANCY: 'lifeExpectancy',
      SETUP_COMPLETED: 'setupCompleted'
    };
    
    // Default values when no settings are found
    this.defaults = {
      [this.keys.TIMER_TYPE]: 'daily',
      [this.keys.LIFE_EXPECTANCY]: 80,
      [this.keys.SETUP_COMPLETED]: false
    };
    
    // Validate that chrome.storage is available
    this.storageAvailable = typeof chrome !== 'undefined' && 
                          chrome.storage && 
                          chrome.storage.sync;
    
    if (!this.storageAvailable) {
      console.warn('Chrome storage API not available, using localStorage fallback');
    }
  }
  
  /**
   * Save a single value to storage
   * @param {string} key - The key to save
   * @param {any} value - The value to save
   * @returns {Promise} - Resolves when saved
   */
  async save(key, value) {
    return new Promise((resolve, reject) => {
      try {
        console.log(`Saving ${key}:`, value);
        
        if (this.storageAvailable) {
          // Use Chrome storage API
          chrome.storage.sync.set({ [key]: value }, () => {
            if (chrome.runtime.lastError) {
              console.error(`Error saving ${key}:`, chrome.runtime.lastError);
              reject(new Error(`Failed to save ${key}: ${chrome.runtime.lastError.message}`));
            } else {
              console.log(`${key} saved successfully`);
              resolve();
            }
          });
        } else {
          // Fallback to localStorage
          try {
            localStorage.setItem(key, JSON.stringify(value));
            console.log(`${key} saved to localStorage`);
            resolve();
          } catch (err) {
            console.error(`Error saving ${key} to localStorage:`, err);
            reject(new Error(`Failed to save ${key} to localStorage`));
          }
        }
      } catch (error) {
        console.error(`Critical error saving ${key}:`, error);
        reject(error);
      }
    });
  }
  
  /**
   * Get a single value from storage
   * @param {string} key - The key to retrieve
   * @param {any} defaultValue - Default if key not found
   * @returns {Promise<any>} - Resolves with the value
   */
  async get(key, defaultValue) {
    return new Promise((resolve, reject) => {
      try {
        if (this.storageAvailable) {
          // Use Chrome storage API
          chrome.storage.sync.get(key, (result) => {
            if (chrome.runtime.lastError) {
              console.error(`Error getting ${key}:`, chrome.runtime.lastError);
              resolve(defaultValue);
            } else {
              const value = result[key];
              console.log(`Retrieved ${key}:`, value !== undefined ? value : defaultValue);
              resolve(value !== undefined ? value : defaultValue);
            }
          });
        } else {
          // Fallback to localStorage
          try {
            const storedValue = localStorage.getItem(key);
            
            if (storedValue !== null) {
              const parsedValue = JSON.parse(storedValue);
              console.log(`Retrieved ${key} from localStorage:`, parsedValue);
              resolve(parsedValue);
            } else {
              console.log(`${key} not found in localStorage, using default:`, defaultValue);
              resolve(defaultValue);
            }
          } catch (err) {
            console.error(`Error getting ${key} from localStorage:`, err);
            resolve(defaultValue);
          }
        }
      } catch (error) {
        console.error(`Critical error getting ${key}:`, error);
        resolve(defaultValue);
      }
    });
  }
  
  /**
   * Save multiple settings at once
   * @param {Object} settings - Object with settings
   * @returns {Promise} - Resolves when all settings are saved
   */
  async saveSettings(settings) {
    return new Promise((resolve, reject) => {
      console.log('Saving settings:', settings);
      
      try {
        if (this.storageAvailable) {
          // Use Chrome storage API
          chrome.storage.sync.set(settings, () => {
            if (chrome.runtime.lastError) {
              console.error('Error saving settings:', chrome.runtime.lastError);
              reject(new Error(`Failed to save settings: ${chrome.runtime.lastError.message}`));
            } else {
              console.log('Settings saved successfully');
              resolve();
            }
          });
        } else {
          // Fallback to localStorage
          try {
            for (const key in settings) {
              if (settings.hasOwnProperty(key)) {
                localStorage.setItem(key, JSON.stringify(settings[key]));
              }
            }
            console.log('Settings saved to localStorage');
            resolve();
          } catch (err) {
            console.error('Error saving settings to localStorage:', err);
            reject(new Error('Failed to save settings to localStorage'));
          }
        }
      } catch (error) {
        console.error('Critical error saving settings:', error);
        reject(error);
      }
    });
  }
  
  /**
   * Get all settings
   * @returns {Promise<Object>} - Resolves with settings object
   */
  async getSettings() {
    return new Promise((resolve, reject) => {
      try {
        const settingsKeys = [
          this.keys.TIMER_TYPE,
          this.keys.BIRTH_DATE,
          this.keys.LIFE_EXPECTANCY,
          this.keys.SETUP_COMPLETED
        ];
        
        if (this.storageAvailable) {
          // Use Chrome storage API
          chrome.storage.sync.get(settingsKeys, (result) => {
            if (chrome.runtime.lastError) {
              console.error('Error getting settings:', chrome.runtime.lastError);
              // Apply default values with any existing settings
              const settings = { ...this.defaults };
              console.log('Using default settings due to error:', settings);
              resolve(settings);
            } else {
              // Merge with defaults to ensure all properties exist
              const settings = { ...this.defaults, ...result };
              console.log('Retrieved settings:', settings);
              resolve(settings);
            }
          });
        } else {
          // Fallback to localStorage
          try {
            const settings = { ...this.defaults };
            
            for (const key of settingsKeys) {
              const storedValue = localStorage.getItem(key);
              
              if (storedValue !== null) {
                settings[key] = JSON.parse(storedValue);
              }
            }
            
            console.log('Retrieved settings from localStorage:', settings);
            resolve(settings);
          } catch (err) {
            console.error('Error getting settings from localStorage:', err);
            resolve({ ...this.defaults });
          }
        }
      } catch (error) {
        console.error('Critical error getting settings:', error);
        // Even when there's an error, return defaults to keep app running
        resolve({ ...this.defaults });
      }
    });
  }
  
  /**
   * Clear all settings
   * @returns {Promise} - Resolves when settings are cleared
   */
  async clearSettings() {
    return new Promise((resolve, reject) => {
      try {
        if (this.storageAvailable) {
          // Use Chrome storage API
          chrome.storage.sync.clear(() => {
            if (chrome.runtime.lastError) {
              console.error('Error clearing settings:', chrome.runtime.lastError);
              reject(new Error(`Failed to clear settings: ${chrome.runtime.lastError.message}`));
            } else {
              console.log('Settings cleared successfully');
              resolve();
            }
          });
        } else {
          // Fallback to localStorage
          try {
            const settingsKeys = [
              this.keys.TIMER_TYPE,
              this.keys.BIRTH_DATE,
              this.keys.LIFE_EXPECTANCY,
              this.keys.SETUP_COMPLETED
            ];
            
            for (const key of settingsKeys) {
              localStorage.removeItem(key);
            }
            
            console.log('Settings cleared from localStorage');
            resolve();
          } catch (err) {
            console.error('Error clearing localStorage:', err);
            reject(new Error('Failed to clear localStorage'));
          }
        }
      } catch (error) {
        console.error('Critical error clearing settings:', error);
        reject(error);
      }
    });
  }
  
  /**
   * Save timer type
   * @param {string} timerType - The timer type to save
   * @returns {Promise} - Resolves when saved
   */
  async saveTimerType(timerType) {
    // Validate timer type
    const validTypes = ['life', 'birthday', 'daily'];
    const type = validTypes.includes(timerType) ? timerType : 'daily';
    
    return this.save(this.keys.TIMER_TYPE, type);
  }
  
  /**
   * Get timer type
   * @returns {Promise<string>} - Resolves with timer type
   */
  async getTimerType() {
    return this.get(this.keys.TIMER_TYPE, this.defaults[this.keys.TIMER_TYPE]);
  }
  
  /**
   * Save birth date
   * @param {string} birthDate - Birth date in YYYY-MM-DD format
   * @returns {Promise} - Resolves when saved
   */
  async saveBirthDate(birthDate) {
    return this.save(this.keys.BIRTH_DATE, birthDate);
  }
  
  /**
   * Get birth date
   * @returns {Promise<string>} - Resolves with birth date
   */
  async getBirthDate() {
    return this.get(this.keys.BIRTH_DATE, '');
  }
  
  /**
   * Save life expectancy
   * @param {number} lifeExpectancy - Life expectancy in years
   * @returns {Promise} - Resolves when saved
   */
  async saveLifeExpectancy(lifeExpectancy) {
    // Ensure it's a number and has a reasonable value
    const expectancy = parseInt(lifeExpectancy, 10);
    const validExpectancy = isNaN(expectancy) || expectancy < 1 ? 
                          this.defaults[this.keys.LIFE_EXPECTANCY] : 
                          expectancy;
    
    return this.save(this.keys.LIFE_EXPECTANCY, validExpectancy);
  }
  
  /**
   * Get life expectancy
   * @returns {Promise<number>} - Resolves with life expectancy
   */
  async getLifeExpectancy() {
    return this.get(this.keys.LIFE_EXPECTANCY, this.defaults[this.keys.LIFE_EXPECTANCY]);
  }
  
  /**
   * Mark setup as completed
   * @returns {Promise} - Resolves when saved
   */
  async completeSetup() {
    return this.save(this.keys.SETUP_COMPLETED, true);
  }
  
  /**
   * Check if setup is completed
   * @returns {Promise<boolean>} - Resolves with setup status
   */
  async isSetupCompleted() {
    return this.get(this.keys.SETUP_COMPLETED, this.defaults[this.keys.SETUP_COMPLETED]);
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