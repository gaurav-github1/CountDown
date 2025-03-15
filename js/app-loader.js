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
window.appErrors = [];
window.addEventListener('error', function(event) {
  window.appErrors.push({
    message: event.message,
    source: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
  });
  console.error('Caught error:', event);
});

// Safe script loading function
function loadScript(src, fallbackMessage, callback) {
  console.log('Loading script:', src);
  var script = document.createElement('script');
  script.src = src;
  script.async = true;
  
  script.onload = function() {
    console.log('Loaded script:', src);
    if (callback) callback(true);
  };
  
  script.onerror = function() {
    console.error('Failed to load script:', src);
    window.appErrors.push({
      message: 'Failed to load script: ' + src,
      source: src
    });
    if (fallbackMessage) {
      console.warn(fallbackMessage);
    }
    if (callback) callback(false);
  };
  
  document.head.appendChild(script);
}

// Show error message
function showErrorMessage(message) {
  var errorContainer = document.getElementById('error-container');
  var errorMessage = document.getElementById('error-message');
  var retryButton = document.getElementById('retry-button');
  var resetButton = document.getElementById('reset-button');
  
  if (errorContainer && errorMessage) {
    errorMessage.textContent = message || 'An unknown error occurred.';
    errorContainer.classList.remove('hidden');
    
    // Hide loading overlay if visible
    var loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
      loadingOverlay.classList.add('hidden');
    }
    
    // Setup retry button
    if (retryButton) {
      retryButton.addEventListener('click', function() {
        location.reload();
      });
    }
    
    // Setup reset button
    if (resetButton) {
      resetButton.addEventListener('click', function() {
        // Try to clear localStorage as last resort
        try {
          for (var key in localStorage) {
            if (key.startsWith('timer') || key === 'setupCompleted') {
              localStorage.removeItem(key);
            }
          }
        } catch (e) {
          console.error('Failed to clear localStorage:', e);
        }
        location.reload();
      });
    }
  }
}

// Function to safely load our app modules in order
function loadAppModules() {
  // Font loading fallback
  if (!document.fonts || !document.fonts.check('1em "SF Pro Display"')) {
    console.warn('SF Pro Display font not loaded, using system fonts');
    document.body.classList.add('font-fallback');
  }
  
  // First load anime.js, then load other dependencies
  loadScript('js/anime.min.js', 'Using CSS fallbacks for animations', function(animeLoaded) {
    if (animeLoaded) {
      console.log('Anime.js loaded successfully');
    } else {
      console.warn('Failed to load anime.js, will use fallback animations');
    }
    
    // Load modules in correct dependency order
    loadScript('js/storage.js', 'Storage module failed to load', function(success) {
      if (success) {
        console.log('Storage module loaded successfully');
        window.StorageManager = StorageManager;
        
        loadScript('js/timerCalculations.js', 'Timer calculations module failed to load', function(success) {
          if (success) {
            console.log('Timer calculations module loaded successfully');
            window.TimerCalculator = TimerCalculator;
            
            // Load test helpers in debug mode
            if (window.DEBUG_MODE) {
              loadScript('js/test-helpers.js', 'Test helpers failed to load');
            }
            
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
          } else {
            showErrorMessage('Failed to load timer calculations. Please try reloading the page.');
          }
        });
      } else {
        showErrorMessage('Failed to load storage module. Please try reloading the page.');
      }
    });
  });
}

// Start loading process when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM content loaded, starting app initialization');
  loadAppModules();
}); 