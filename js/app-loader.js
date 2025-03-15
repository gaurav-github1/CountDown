/**
 * App Loader Script for Countdown Timer Extension
 * Handles safe loading of dependencies and error tracking
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

// Track loaded scripts
window.LOADED_MODULES = {
  anime: false,
  storage: false,
  timerCalculations: false,
  appInitialized: false
};

// Define a global anime fallback for when anime.js fails to load
window.anime = window.anime || function(params) {
  console.warn('Using fallback anime function');
  // Simple fallback that applies final styles immediately
  if (params && params.targets) {
    // Set final styles immediately
    const targets = typeof params.targets === 'string' 
      ? document.querySelectorAll(params.targets) 
      : params.targets;
    
    if (targets) {
      if (targets.length) {
        // Collection of elements
        for (let i = 0; i < targets.length; i++) {
          // Make sure the element is visible when animating
          if (params.opacity !== undefined) {
            targets[i].style.opacity = Array.isArray(params.opacity) ? params.opacity[params.opacity.length-1] : params.opacity;
            // If opacity > 0, ensure element is displayed
            if ((Array.isArray(params.opacity) ? params.opacity[params.opacity.length-1] : params.opacity) > 0) {
              targets[i].style.display = 'block';
              targets[i].classList.remove('hidden');
            } else {
              // When fading out, hide after a short delay
              setTimeout(() => {
                targets[i].style.display = 'none';
              }, 50);
            }
          }
          
          if (params.translateY !== undefined) {
            targets[i].style.transform = `translateY(${Array.isArray(params.translateY) ? params.translateY[params.translateY.length-1] : params.translateY}px)`;
          }
          
          // Handle display property directly if specified
          if (params.display !== undefined) {
            targets[i].style.display = params.display;
          }
        }
      } else {
        // Single element
        if (params.opacity !== undefined) {
          targets.style.opacity = Array.isArray(params.opacity) ? params.opacity[params.opacity.length-1] : params.opacity;
          // If opacity > 0, ensure element is displayed
          if ((Array.isArray(params.opacity) ? params.opacity[params.opacity.length-1] : params.opacity) > 0) {
            targets.style.display = 'block';
            targets.classList.remove('hidden');
          } else {
            // When fading out, hide after a short delay
            setTimeout(() => {
              targets.style.display = 'none';
            }, 50);
          }
        }
        
        if (params.translateY !== undefined) {
          targets.style.transform = `translateY(${Array.isArray(params.translateY) ? params.translateY[params.translateY.length-1] : params.translateY}px)`;
        }
        
        // Handle display property directly if specified
        if (params.display !== undefined) {
          targets.style.display = params.display;
        }
      }
    }
    
    // Call complete callback
    if (params.complete) {
      setTimeout(params.complete, 100);
    }
  }
  
  return {
    pause: function() {},
    play: function() {},
    restart: function() {}
  };
};

// Error tracking and fallbacks
let CRITICAL_ERROR = false;
let ERROR_MESSAGE = '';

// Function to show error message in the DOM
function showErrorMessage(message, isRecoverable = false) {
  console.error('App Error:', message);
  ERROR_MESSAGE = message;
  CRITICAL_ERROR = !isRecoverable;
  
  const errorContainer = document.getElementById('error-container');
  if (errorContainer) {
    const errorMessage = document.getElementById('error-message');
    if (errorMessage) {
      errorMessage.textContent = message;
    }
    errorContainer.classList.remove('hidden');
  } else {
    // Create a fallback error display if container not found
    const errorDiv = document.createElement('div');
    errorDiv.style.position = 'fixed';
    errorDiv.style.top = '0';
    errorDiv.style.left = '0';
    errorDiv.style.width = '100%';
    errorDiv.style.padding = '20px';
    errorDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
    errorDiv.style.color = 'white';
    errorDiv.style.textAlign = 'center';
    errorDiv.style.zIndex = '9999';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
  }
}

// Function to load a script with proper error handling
function loadScript(src, errorMessage, callback) {
  if (CRITICAL_ERROR) {
    console.warn('Skipping script load due to previous critical error:', src);
    if (callback) callback(false);
    return;
  }
  
  console.log('Loading script:', src);
  
  // Check if script is already loaded
  const existingScript = document.querySelector(`script[src="${src}"]`);
  if (existingScript) {
    console.log('Script already loaded:', src);
    if (callback) callback(true);
    return;
  }
  
  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = src;
  script.async = false; // Load in order
  
  // Define what happens on success
  script.onload = function() {
    console.log('Script loaded successfully:', src);
    
    // Track specific module loading status
    if (src.includes('anime.min.js')) {
      window.LOADED_MODULES.anime = true;
    } else if (src.includes('storage.js')) {
      window.LOADED_MODULES.storage = true;
    } else if (src.includes('timerCalculations.js')) {
      window.LOADED_MODULES.timerCalculations = true;
    } else if (src.includes('newtab.js')) {
      window.LOADED_MODULES.appInitialized = true;
    }
    
    if (callback) callback(true);
  };
  
  // Define what happens on error
  script.onerror = function() {
    console.error('Failed to load script:', src);
    
    if (src.includes('anime.min.js')) {
      // Non-critical, continue without animation
      console.warn('Animation library failed to load, using fallbacks');
      if (callback) callback(true); // Continue despite error
    } else {
      showErrorMessage(errorMessage || `Failed to load ${src}`, src.includes('test-helpers.js'));
      
      // For critical scripts, ensure the failure is tracked
      if (src.includes('storage.js')) {
        window.LOADED_MODULES.storage = false;
      } else if (src.includes('timerCalculations.js')) {
        window.LOADED_MODULES.timerCalculations = false;
      }
      
      if (callback) callback(false);
    }
  };
  
  // Add the script to the page
  document.head.appendChild(script);
}

// Add event listeners for error recovery buttons if they exist
document.addEventListener('DOMContentLoaded', function() {
  const retryButton = document.getElementById('retry-button');
  if (retryButton) {
    retryButton.addEventListener('click', function() {
      console.log('Retry button clicked, reloading app');
      location.reload();
    });
  }
  
  const resetButton = document.getElementById('reset-button');
  if (resetButton) {
    resetButton.addEventListener('click', function() {
      console.log('Reset button clicked, clearing storage and reloading');
      if (chrome && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.clear(function() {
          console.log('Storage cleared');
          location.reload();
        });
      } else {
        // Fallback to localStorage if chrome.storage is not available
        localStorage.clear();
        location.reload();
      }
    });
  }
});

// Function to check module loading status
function checkModulesLoaded() {
  return {
    anime: window.LOADED_MODULES.anime,
    storage: window.LOADED_MODULES.storage,
    timerCalculations: window.LOADED_MODULES.timerCalculations,
    appInitialized: window.LOADED_MODULES.appInitialized,
    allCriticalModulesLoaded: window.LOADED_MODULES.storage && window.LOADED_MODULES.timerCalculations
  };
}

// Function to load all necessary modules
function loadAppModules() {
  // Font loading fallback
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
    // Start loading modules in sequence
    loadScript('js/anime.min.js', 'Using CSS fallbacks for animations', function(animeLoaded) {
      // Anime.js is optional, continue loading critical modules
      console.log('Anime library status:', animeLoaded ? 'loaded' : 'using fallback');
      
      loadScript('js/storage.js', 'Storage module failed to load', function(storageLoaded) {
        if (storageLoaded) {
          console.log('Storage module loaded successfully');
          window.StorageManager = StorageManager;
          
          loadScript('js/timerCalculations.js', 'Timer calculations module failed to load', function(calculationsLoaded) {
            if (calculationsLoaded) {
              console.log('Timer calculations module loaded successfully');
              window.TimerCalculator = TimerCalculator;
              
              // Load test helpers in debug mode
              if (window.DEBUG_MODE) {
                loadScript('js/test-helpers.js', 'Test helpers failed to load');
              }
              
              // Load the main application with a slight delay to ensure everything is ready
              setTimeout(function() {
                loadScript('js/newtab.js', 'App initialization failed', function(success) {
                  if (!success) {
                    showErrorMessage('Failed to load the application. Please try reloading the page.');
                  } else {
                    console.log('App initialized successfully');
                    
                    // Run tests in debug mode
                    if (window.DEBUG_MODE && window.runTests) {
                      setTimeout(window.runTests, 2000);
                    }
                  }
                });
              }, 100);
            } else {
              showErrorMessage('Failed to load timer calculations. Please try reloading the page.');
            }
          });
        } else {
          showErrorMessage('Failed to load storage module. Please try reloading the page.');
        }
      });
    });
  } catch (error) {
    console.error('Critical error during module loading:', error);
    showErrorMessage('Critical loading error: ' + error.message);
  }
}

// Add window error handling
window.onerror = function(message, source, lineno, colno, error) {
  console.error('Global error:', message, 'at', source, lineno, colno);
  if (!CRITICAL_ERROR) {
    // Only show the first critical error to avoid overwhelming the user
    showErrorMessage('An error occurred: ' + message, true);
  }
  return false; // Let other error handlers run
};

// Start loading modules
loadAppModules(); 