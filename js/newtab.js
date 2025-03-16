/**
 * newtab.js - Main script for new tab page
 * 
 * Initializes and displays the timer based on user settings
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM content loaded');
    
    // Make sure all required modules are loaded
    if (typeof checkModulesLoaded !== 'function') {
        showError('Core modules not loaded properly. Please reload the page.');
        return;
      }
      
    if (!checkModulesLoaded()) {
        console.log('Waiting for modules to load...');
        
        // Check again after a delay
        setTimeout(function() {
            if (!checkModulesLoaded()) {
                showError('Failed to load all required modules. Please reload the page.');
            } else {
                initializeApp();
            }
        }, 1000);
    } else {
        initializeApp();
    }
});

/**
 * Initialize the timer application
 */
function initializeApp() {
    console.log('Initializing timer application');
    
    try {
        // Get timer app from ModuleRegistry if available
        let timerApp;
        
        if (window.ModuleRegistry && window.ModuleRegistry.isRegistered('TimerApp')) {
            console.log('Using TimerApp from ModuleRegistry');
            const TimerApp = window.ModuleRegistry.get('TimerApp');
            timerApp = new TimerApp();
        } else if (window.TimerApp) {
            console.log('Using global TimerApp');
            timerApp = new window.TimerApp();
        } else {
            throw new Error('TimerApp not available');
        }
        
        // Initialize the timer app
        timerApp.init()
            .then(success => {
                if (!success) {
                    console.error('Failed to initialize timer app');
                    showError('Failed to initialize timer. Please reload the page.');
                }
            })
            .catch(error => {
                console.error('Error initializing timer app:', error);
                showError('Error initializing timer: ' + error.message);
            });
        
        // Store reference to timer app globally
        window.timerApp = timerApp;
        
        // Set up global event listeners
        setupGlobalEventListeners();
        
    } catch (error) {
        console.error('Error initializing app:', error);
        showError('Failed to initialize the application. Please reload the page.');
        
        // Attempt to fall back to basic timer display
        showBasicTimer();
    }
  }
  
  /**
 * Set up global event listeners
 */
function setupGlobalEventListeners() {
    // Listen for keyboard shortcuts
    document.addEventListener('keydown', function(event) {
        // Escape key closes settings popup
        if (event.key === 'Escape') {
            const settingsPopup = document.getElementById('settings-popup');
            if (settingsPopup && !settingsPopup.classList.contains('hidden')) {
                if (window.timerApp && typeof window.timerApp.closeSettings === 'function') {
                    window.timerApp.closeSettings();
                } else {
                    settingsPopup.classList.add('hidden');
                }
            }
        }
        
        // 'S' key opens settings
        if (event.key === 's' || event.key === 'S') {
            if (!event.ctrlKey && !event.metaKey && !event.altKey) {
                if (window.timerApp && typeof window.timerApp.openSettings === 'function') {
                    window.timerApp.openSettings();
                }
            }
      }
    });
  }
  
  /**
 * Display an error message to the user
 * @param {string} message - Error message to display
 */
function showError(message) {
    console.error('Error:', message);
    
    const errorContainer = document.getElementById('error-container');
    const errorMessage = document.getElementById('error-message');
    
    if (errorContainer && errorMessage) {
        errorMessage.textContent = message;
        errorContainer.classList.remove('hidden');
        
        // Hide loading overlay if visible
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
        }
        
        // Hide timer container if visible
        const timerContainer = document.getElementById('timer-container');
        if (timerContainer) {
            timerContainer.classList.add('hidden');
        }
      } else {
        // Fallback if error elements don't exist
        alert('Error: ' + message);
    }
  }
  
  /**
 * Show a basic timer as fallback when the main timer fails
 */
function showBasicTimer() {
    console.log('Showing basic fallback timer');
    
    try {
        // Get timer container
        const timerContainer = document.getElementById('timer-container');
        
        if (!timerContainer) {
        return;
      }
      
        // Show timer container
        timerContainer.classList.remove('hidden');
        
        // Hide loading overlay
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
        }
        
        // Set timer title
        const timerTitle = document.getElementById('timer-title');
        if (timerTitle) {
            timerTitle.textContent = 'Daily Countdown';
        }
        
        // Set timer description
        const timerDescription = document.getElementById('timer-description');
        if (timerDescription) {
            timerDescription.textContent = 'Time remaining until midnight (basic fallback timer)';
        }
        
        // Start a simple daily timer
        updateBasicTimer();
        setInterval(updateBasicTimer, 1000);
        
    } catch (error) {
        console.error('Error showing basic timer:', error);
    }
  }
  
  /**
 * Update the basic fallback timer
 */
function updateBasicTimer() {
    try {
        // Get current date and time
        const now = new Date();
        
        // Time until midnight
        const hours = 23 - now.getHours();
        const minutes = 59 - now.getMinutes();
        const seconds = 59 - now.getSeconds();
        
        // Update time values
        updateDigitValue('hours', hours);
        updateDigitValue('minutes', minutes);
        updateDigitValue('seconds', seconds);
        
        // Update progress bar
        const secondsInDay = 24 * 60 * 60;
        const secondsPassed = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
        const progress = (secondsPassed / secondsInDay) * 100;
        
        const progressBar = document.getElementById('progress-bar');
        if (progressBar) {
            progressBar.style.width = progress + '%';
        }
        
        const progressPercent = document.getElementById('progress-percent');
        if (progressPercent) {
            progressPercent.textContent = Math.round(progress) + '%';
        }
        
    } catch (error) {
        console.error('Error updating basic timer:', error);
    }
  }
  
  /**
 * Update a time value in the DOM
 * @param {string} unit - Time unit (years, months, days, hours, minutes, seconds)
 * @param {number} value - Value to display
 */
function updateDigitValue(unit, value) {
    const element = document.getElementById(unit + '-value');
    if (element) {
        element.textContent = String(value).padStart(2, '0');
    }
} 