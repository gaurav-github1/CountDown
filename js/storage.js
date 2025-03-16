/**
 * StorageManager - Handles browser storage operations
 * 
 * Uses Chrome storage API to save and retrieve timer settings
 * Uses ModuleRegistry pattern to prevent redeclaration errors
 */

// Use IIFE to prevent global namespace pollution
(function() {
    // Skip if already registered
    if (window.ModuleRegistry && window.ModuleRegistry.isRegistered('StorageManager')) {
        console.log('StorageManager already registered, skipping definition');
        return;
    }
    
    /**
     * StorageManager class for handling browser storage operations
     */
    class StorageManager {
        constructor() {
            this.storageType = 'sync'; // Use sync storage by default
            
            // Check if running in a Chrome extension context
            if (typeof chrome === 'undefined' || !chrome.storage) {
                console.warn('Chrome storage API not available, falling back to localStorage');
                this.storageType = 'local';
            }
        }
        
        /**
         * Save timer settings to storage
         * @param {Object} settings - Settings object to save
         * @returns {Promise} Promise that resolves when settings are saved
         */
        saveSettings(settings) {
            return new Promise((resolve, reject) => {
                if (this.storageType === 'sync' && chrome.storage) {
                    chrome.storage.sync.set(settings, () => {
                        if (chrome.runtime.lastError) {
                            console.error('Error saving settings:', chrome.runtime.lastError);
                            reject(chrome.runtime.lastError);
                        } else {
                            console.log('Settings saved successfully');
                            resolve();
                        }
                    });
                } else {
                    // Fallback to localStorage
                    try {
                        Object.keys(settings).forEach(key => {
                            localStorage.setItem(key, JSON.stringify(settings[key]));
                        });
                        console.log('Settings saved to localStorage');
                        resolve();
                    } catch (error) {
                        console.error('Error saving to localStorage:', error);
                        reject(error);
                    }
                }
            });
        }
        
        /**
         * Get timer settings from storage
         * @returns {Promise<Object>} Promise that resolves with settings object
         */
        getSettings() {
            return new Promise((resolve, reject) => {
                if (this.storageType === 'sync' && chrome.storage) {
                    chrome.storage.sync.get(null, (items) => {
                        if (chrome.runtime.lastError) {
                            console.error('Error getting settings:', chrome.runtime.lastError);
                            reject(chrome.runtime.lastError);
                        } else {
                            console.log('Settings retrieved successfully');
                            resolve(items || {});
                        }
                    });
                } else {
                    // Fallback to localStorage
                    try {
                        const settings = {};
                        const keys = [
                            window.StorageKeys.TIMER_TYPE,
                            window.StorageKeys.BIRTH_DATE,
                            window.StorageKeys.LIFE_EXPECTANCY,
                            window.StorageKeys.SETUP_COMPLETED
                        ];
                        
                        keys.forEach(key => {
                            const value = localStorage.getItem(key);
                            if (value) {
                                try {
                                    settings[key] = JSON.parse(value);
                                } catch (e) {
                                    settings[key] = value;
                                }
                            }
                        });
                        
                        console.log('Settings retrieved from localStorage');
                        resolve(settings);
                    } catch (error) {
                        console.error('Error getting from localStorage:', error);
                        reject(error);
                    }
                }
            });
        }
        
        /**
         * Save timer type to storage
         * @param {string} timerType - Timer type to save
         * @returns {Promise} Promise that resolves when timer type is saved
         */
        saveTimerType(timerType) {
            return this.saveSettings({
                [window.StorageKeys.TIMER_TYPE]: timerType
            });
        }
        
        /**
         * Get current timer type from storage
         * @returns {Promise<string>} Promise that resolves with timer type
         */
        getTimerType() {
            return new Promise((resolve, reject) => {
                this.getSettings()
                    .then(settings => {
                        const timerType = settings[window.StorageKeys.TIMER_TYPE] || window.TimerTypes.DAILY;
                        resolve(timerType);
                    })
                    .catch(reject);
            });
        }
        
        /**
         * Save birth date to storage
         * @param {string} birthDate - Birth date in YYYY-MM-DD format
         * @returns {Promise} Promise that resolves when birth date is saved
         */
        saveBirthDate(birthDate) {
            return this.saveSettings({
                [window.StorageKeys.BIRTH_DATE]: birthDate
            });
        }
        
        /**
         * Save life expectancy to storage
         * @param {number} lifeExpectancy - Life expectancy in years
         * @returns {Promise} Promise that resolves when life expectancy is saved
         */
        saveLifeExpectancy(lifeExpectancy) {
            return this.saveSettings({
                [window.StorageKeys.LIFE_EXPECTANCY]: lifeExpectancy
            });
        }
        
        /**
         * Clear all settings from storage
         * @returns {Promise} Promise that resolves when settings are cleared
         */
        clearSettings() {
            return new Promise((resolve, reject) => {
                if (this.storageType === 'sync' && chrome.storage) {
                    chrome.storage.sync.clear(() => {
                        if (chrome.runtime.lastError) {
                            console.error('Error clearing settings:', chrome.runtime.lastError);
                            reject(chrome.runtime.lastError);
                        } else {
                            console.log('Settings cleared successfully');
                            resolve();
                        }
                    });
                } else {
                    // Fallback to localStorage
                    try {
                        const keys = [
                            window.StorageKeys.TIMER_TYPE,
                            window.StorageKeys.BIRTH_DATE,
                            window.StorageKeys.LIFE_EXPECTANCY,
                            window.StorageKeys.SETUP_COMPLETED
                        ];
                        
                        keys.forEach(key => {
                            localStorage.removeItem(key);
                        });
                        
                        console.log('Settings cleared from localStorage');
                        resolve();
                    } catch (error) {
                        console.error('Error clearing localStorage:', error);
                        reject(error);
                    }
                }
            });
        }
    }
    
    // Register the StorageManager class with the ModuleRegistry
    if (window.ModuleRegistry) {
        window.ModuleRegistry.register('StorageManager', StorageManager);
    }
    
    // Make StorageManager globally available (safely)
    if (typeof window !== 'undefined') {
        window.StorageManager = StorageManager;
    }
})(); 