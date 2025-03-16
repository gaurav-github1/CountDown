/**
 * Application loader responsible for loading all script dependencies
 * This ensures required modules are loaded before the application initializes
 */

// Debug mode for additional console logging
window.DEBUG_MODE = true;

// Define TimerTypes globally to avoid reference errors
window.TimerTypes = {
  LIFE: 'life',
  BIRTHDAY: 'birthday',
  DAILY: 'daily'
};

// Define StorageKeys globally
window.StorageKeys = {
  TIMER_TYPE: 'timerType',
  BIRTH_DATE: 'birthDate',
  LIFE_EXPECTANCY: 'lifeExpectancy',
  SETUP_COMPLETED: 'setupCompleted'
};

// Track loaded modules
window.LOADED_MODULES = {
  moduleRegistry: false,
  anime: false,
  storage: false,
  timerCalculations: false,
  timerApp: false,
  appInitialized: false
};

// Track critical error state
window.CRITICAL_ERROR = false;
window.TIMER_RUNNING = false;
window.TIMER_INITIALIZED = false;

// Define default settings globally to prevent redeclarations
window.DEFAULT_SETTINGS = {
  [window.StorageKeys.TIMER_TYPE]: window.TimerTypes.DAILY,
  [window.StorageKeys.LIFE_EXPECTANCY]: 80,
  [window.StorageKeys.SETUP_COMPLETED]: false
};

// ErrorHandler to manage all possible declaration errors
window.ErrorHandler = {
  // Keep track of errors
  errors: [],

  // Add error to the list
  addError: function(error) {
    this.errors.push({
      message: error.message || 'Unknown error',
      timestamp: new Date(),
      stack: error.stack
    });
    console.error('Error added to tracker:', error);
  },

  // Get all errors
  getErrors: function() {
    return this.errors;
  },

  // Check for specific type of error
  hasErrorType: function(errorType) {
    return this.errors.some(err => err.message.includes(errorType));
  },

  // Try to recover from common errors
  recoverFromError: function(error) {
    const errorMsg = error.message || '';

    // Handle common syntax errors
    if (errorMsg.includes('has already been declared')) {
      console.warn('Attempting to recover from redeclaration error:', errorMsg);
      return true; // Indicate that recovery was attempted
    }

    return false; // No recovery attempted
  }
};

/**
 * Show error message to the user
 * @param {string} message - Error message to display
 * @param {boolean} isCritical - Whether this is a critical error
 */
function showErrorMessage(message, isCritical = false) {
  console.error('ERROR:', message);
  
  // Set critical error flag to prevent multiple error messages
  if (isCritical) {
    window.CRITICAL_ERROR = true;
  }
  
  // Update error message in the DOM
  const errorContainer = document.getElementById('error-container');
  const errorMessage = document.getElementById('error-message');
  
  if (errorContainer && errorMessage) {
    errorMessage.textContent = message;
    errorContainer.classList.remove('hidden');
    
    // Hide loading overlay if it's visible
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
      loadingOverlay.classList.add('hidden');
    }
    
    // Set up retry button
    const retryButton = document.getElementById('retry-button');
    if (retryButton) {
      retryButton.addEventListener('click', function() {
        location.reload();
      });
    }
    
    // Set up reset button
    const resetButton = document.getElementById('reset-button');
    if (resetButton) {
      resetButton.addEventListener('click', function() {
        // Clear storage and reload
        if (chrome && chrome.storage && chrome.storage.sync) {
          chrome.storage.sync.clear(function() {
            console.log('Settings cleared');
            location.reload();
          });
        } else {
          // Fallback to localStorage
          localStorage.clear();
          location.reload();
        }
      });
    }
  } else {
    // Fallback if error elements don't exist
    alert('Error: ' + message);
  }
}

/**
 * Load a script dynamically
 * @param {string} src - Script source URL
 * @param {string} errorMessage - Error message if loading fails
 * @param {Function} callback - Callback function when loading completes
 */
function loadScript(src, errorMessage, callback) {
  console.log('Loading script:', src);
  
  const script = document.createElement('script');
  script.src = src;
  
  script.onload = function() {
    console.log('Script loaded successfully:', src);
    if (callback) callback(true);
  };
  
  script.onerror = function() {
    console.error('Failed to load script:', src);
    if (errorMessage) showErrorMessage(errorMessage);
    if (callback) callback(false);
  };
  
  document.head.appendChild(script);
}

/**
 * Check if all required modules are loaded
 * @returns {boolean} True if all modules are loaded
 */
function checkModulesLoaded() {
  try {
    console.log('Checking module availability...');
    
    // Primary check: Use LOADED_MODULES object
    const modules = window.LOADED_MODULES || {};
    const requiredModules = ['moduleRegistry', 'storage', 'timerCalculations', 'timerApp'];
    
    let allLoaded = true;
    for (const module of requiredModules) {
      if (!modules[module]) {
        console.warn(`Required module not loaded via LOADED_MODULES: ${module}`);
        allLoaded = false;
      }
    }
    
    if (allLoaded) {
      console.log('All modules loaded according to LOADED_MODULES');
      return true;
    }
    
    // Secondary check: Try to verify module availability directly
    const hasModuleRegistry = window.ModuleRegistry && typeof window.ModuleRegistry.register === 'function';
    const hasStorage = window.StorageManager || window.ModuleRegistry?.isRegistered('StorageManager');
    const hasTimerCalculations = window.TimerCalculator || window.ModuleRegistry?.isRegistered('TimerCalculator');
    const hasTimerApp = window.TimerApp || window.ModuleRegistry?.isRegistered('TimerApp');
    
    // Update LOADED_MODULES object if it exists to reflect reality
    if (window.LOADED_MODULES) {
      window.LOADED_MODULES.moduleRegistry = hasModuleRegistry;
      window.LOADED_MODULES.storage = hasStorage;
      window.LOADED_MODULES.timerCalculations = hasTimerCalculations;
      window.LOADED_MODULES.timerApp = hasTimerApp;
    }
    
    const directCheck = hasModuleRegistry && hasStorage && hasTimerCalculations && hasTimerApp;
    
    console.log('Module direct check results:', {
      moduleRegistry: hasModuleRegistry,
      storage: hasStorage,
      timerCalculations: hasTimerCalculations,
      timerApp: hasTimerApp
    });
    
    // If most critical components are available, proceed anyway
    if (hasTimerApp && (hasStorage || hasTimerCalculations)) {
      console.log('Critical modules are available, proceeding despite missing some dependencies');
      return true;
    }
    
    return directCheck;
  } catch (error) {
    console.error('Error checking modules:', error);
    // In case of error, make a simpler check for just the TimerApp
    return !!(window.TimerApp || (window.ModuleRegistry && window.ModuleRegistry.isRegistered('TimerApp')));
  }
}

// Function to load all necessary modules
function loadAppModules() {
  console.log('Starting app module loading sequence');
  
  // Check for potential storage permission issues
  if (chrome && chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(null, function(items) {
      if (chrome.runtime.lastError) {
        console.warn('Storage permission issue detected:', chrome.runtime.lastError);
        showErrorMessage('Storage permission issue. You may need to reset the extension.', true);
      } else {
        console.log('Storage permission OK');
      }
    });
  }
  
  // Use try-catch to handle unexpected errors during loading
  try {
    // Load ModuleRegistry first
    loadScript('js/moduleRegistry.js', 'Module registry failed to load', function(moduleRegistryLoaded) {
      if (moduleRegistryLoaded) {
        console.log('Module registry loaded successfully');
        window.LOADED_MODULES.moduleRegistry = true;
        
        // Start loading modules in sequence
        loadScript('js/anime.min.js', null, function(animeLoaded) {
          // Anime.js is optional, continue loading critical modules
          console.log('Anime library status:', animeLoaded ? 'loaded' : 'using fallback');
          window.LOADED_MODULES.anime = animeLoaded;
          
          loadScript('js/storage.js', 'Storage module failed to load', function(storageLoaded) {
            if (storageLoaded) {
              console.log('Storage module loaded successfully');
              window.LOADED_MODULES.storage = true;
              
              loadScript('js/timerCalculations.js', 'Timer calculations module failed to load', function(calculationsLoaded) {
                if (calculationsLoaded) {
                  console.log('Timer calculations module loaded successfully');
                  window.LOADED_MODULES.timerCalculations = true;
                  
                  // Load the timer app module
                  loadScript('js/timerApp.js', 'Timer app failed to load', function(timerAppLoaded) {
                    if (timerAppLoaded) {
                      console.log('Timer app loaded successfully');
                      window.LOADED_MODULES.timerApp = true;
                      
                      console.log('All critical modules loaded successfully');
                      
                      // Check module presence using registry
                      if (window.ModuleRegistry && window.ModuleRegistry.isRegistered('TimerApp')) {
                        console.log('TimerApp registered in ModuleRegistry');
                      } else {
                        console.warn('TimerApp not found in ModuleRegistry');
                      }
                    } else {
                      showErrorMessage('Timer app module failed to load', true);
                    }
                  });
                } else {
                  showErrorMessage('Timer calculations module failed to load', true);
                }
              });
            } else {
              showErrorMessage('Storage module failed to load', true);
            }
          });
        });
      } else {
        showErrorMessage('Module registry failed to load', true);
      }
    });
  } catch (error) {
    console.error('Unexpected error during module loading:', error);
    window.ErrorHandler.addError(error);
    showErrorMessage('An unexpected error occurred during loading: ' + error.message, true);
  }
}

// Start loading modules when document is ready
document.addEventListener('DOMContentLoaded', function() {
  console.log('Document ready, starting module loader');
  loadAppModules();
});

// Add window error handling with improved recovery
window.onerror = function(message, source, lineno, colno, error) {
  console.error('Global error:', message, 'at', source, lineno, colno);
  
  // Add to error tracker
  if (window.ErrorHandler) {
    window.ErrorHandler.addError(error || { message });
    
    // Handle redeclaration errors using ModuleRegistry
    if (message.includes('has already been declared')) {
      const identifierMatch = message.match(/Identifier '(\w+)' has already been declared/);
      if (identifierMatch && identifierMatch[1]) {
        const identifier = identifierMatch[1];
        console.warn(`Redeclaration error for '${identifier}', checking if it's a registered module...`);
        
        // If the identifier is a registered module, this is expected and we can suppress the error
        if (window.ModuleRegistry && window.ModuleRegistry.isRegistered(identifier)) {
          console.log(`'${identifier}' is a registered module, suppressing error`);
          return true; // Handled, prevent the error from showing
        }
      }
      
      // For other redeclaration errors, we can reload the page after a slight delay
      const reloadCount = parseInt(sessionStorage.getItem('errorReloadCount') || '0');
      if (reloadCount < 2) { // Limit to prevent infinite loops
        sessionStorage.setItem('errorReloadCount', String(reloadCount + 1));
        console.log(`Auto-reloading due to declaration error (attempt ${reloadCount + 1}/2)...`);
        setTimeout(() => {
          location.reload();
        }, 500);
        return true; // Handled
      } else {
        console.warn('Max reload attempts reached, showing error instead');
      }
    }
  }
  
  if (!window.CRITICAL_ERROR) {
    // Only show the first critical error to avoid overwhelming the user
    showErrorMessage('An error occurred: ' + message, true);
  }
  
  return false; // Let other error handlers run
};

// Expose window debugging function to check app state
window.debugTimerApp = function() {
  console.log('=== Timer App Debug Info ===');
  console.log('Loaded modules:', window.LOADED_MODULES);
  console.log('TimerCalculator exists:', !!window.TimerCalculator);
  console.log('StorageManager exists:', !!window.StorageManager);
  console.log('TimerApp exists:', !!window.TimerApp);
  console.log('Timer running:', window.TIMER_RUNNING || false);
  console.log('Timer initialized:', window.TIMER_INITIALIZED || false);
  
  // Check for DOM elements
  const elements = {
    yearsValue: !!document.getElementById('years-value'),
    monthsValue: !!document.getElementById('months-value'),
    daysValue: !!document.getElementById('days-value'),
    hoursValue: !!document.getElementById('hours-value'),
    minutesValue: !!document.getElementById('minutes-value'),
    secondsValue: !!document.getElementById('seconds-value'),
    progressBar: !!document.getElementById('progress-bar'),
    timerContainer: !!document.getElementById('timer-container')
  };
  
  console.log('DOM elements:', elements);
  
  return {
    loadedModules: window.LOADED_MODULES,
    hasTimerCalculator: !!window.TimerCalculator,
    hasStorageManager: !!window.StorageManager,
    hasTimerApp: !!window.TimerApp,
    timerRunning: window.TIMER_RUNNING || false,
    timerInitialized: window.TIMER_INITIALIZED || false,
    elements
  };
}; 