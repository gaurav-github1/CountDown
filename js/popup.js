/**
 * popup.js - Handles the popup UI and interactions
 * Reuses the core TimerApp functionality in a more compact interface
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('Popup DOM content loaded');
    
    // Initialize the popup timer
    initializePopup();
});

/**
 * Initialize the popup interface
 */
function initializePopup() {
    console.log('Initializing popup interface');
    
    try {
        // Hide error screen if visible
        const errorScreen = document.getElementById('error-screen');
        if (errorScreen) {
            errorScreen.classList.add('hidden');
        }
        
        // Show loading indicator
        showLoadingOverlay(true);
        
        // Setup event listeners
        setupPopupEventListeners();
        
        // Set up runtime message listener for settings changes
        setupRuntimeMessageListener();
        
        // Try to get quote for the timer type
        updateQuoteForTimerType();
        
        // Wait for modules to load
        if (typeof checkModulesLoaded === 'function') {
            checkAndInitializeModules();
        } else {
            console.warn('Module system not available, using basic timer');
            showBasicPopupTimer();
        }
    } catch (error) {
        console.error('Error initializing popup:', error);
        showErrorMessage('Failed to initialize popup. Please try again.');
        showBasicPopupTimer();
    }
}

/**
 * Check if modules are loaded and initialize accordingly
 */
function checkAndInitializeModules() {
    if (!checkModulesLoaded()) {
        console.log('Waiting for modules to load...');
        
        // Show loading message
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            const loadingText = loadingOverlay.querySelector('p');
            if (loadingText) {
                loadingText.textContent = 'Loading modules...';
            }
        }
        
        // Check again after a delay, with retry mechanism
        let retryCount = 0;
        const maxRetries = 3;
        
        function checkModulesWithRetry() {
            if (!checkModulesLoaded()) {
                retryCount++;
                if (retryCount > maxRetries) {
                    console.warn(`Modules still not loaded after ${maxRetries} retries, falling back to simple timer`);
                    showErrorMessage('Could not load timer modules. Using basic timer instead.');
                    showBasicPopupTimer();
                } else {
                    console.log(`Modules not loaded, retry ${retryCount}/${maxRetries}`);
                    setTimeout(checkModulesWithRetry, 1000);
                }
            } else {
                initializeTimerFromModules();
            }
        }
        
        setTimeout(checkModulesWithRetry, 1000);
    } else {
        initializeTimerFromModules();
    }
}

/**
 * Initialize timer using the module system
 */
function initializeTimerFromModules() {
    console.log('Initializing timer from modules');
    
    try {
        // Try to access timer data from existing TimerApp instance first
        if (chrome.extension && chrome.extension.getBackgroundPage && 
            chrome.extension.getBackgroundPage().timerApp) {
            
            const bgTimerApp = chrome.extension.getBackgroundPage().timerApp;
            console.log('Found existing TimerApp instance');
            
            // Subscribe to timer updates or extract current data
            updatePopupFromTimerApp(bgTimerApp);
            return;
        }
        
        // Create a new TimerApp instance for the popup
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
        
        // Initialize the timer app for popup display
        timerApp.init()
            .then(success => {
                if (!success) {
                    console.error('Failed to initialize timer app');
                    showErrorMessage('Failed to initialize timer. Please try again.');
                    showBasicPopupTimer();
                } else {
                    // Update quote based on timer type
                    updateQuoteForTimerType(timerApp.state?.currentTimerType);
                    // Hide loading overlay with animation
                    showLoadingOverlay(false);
                }
            })
            .catch(error => {
                console.error('Error initializing timer app:', error);
                showErrorMessage('Error initializing timer: ' + error.message);
                showBasicPopupTimer();
            });
        
        // Store reference to timer app
        window.popupTimerApp = timerApp;
    } catch (error) {
        console.error('Error creating TimerApp instance:', error);
        showBasicPopupTimer();
    }
}

/**
 * Update popup from existing TimerApp instance
 * @param {Object} timerApp - TimerApp instance
 */
function updatePopupFromTimerApp(timerApp) {
    try {
        // Extract current timer type
        const timerType = timerApp.state?.currentTimerType || 'daily';
        console.log('Using timer type from existing TimerApp:', timerType);
        
        // Update timer title and description
        updateTimerDisplay(timerType);
        
        // Update quote for timer type
        updateQuoteForTimerType(timerType);
        
        // Hide loading overlay with animation
        showLoadingOverlay(false);
        
        // Start a basic timer that syncs with main app's data
        startSyncedTimer(timerType);
    } catch (error) {
        console.error('Error updating popup from TimerApp:', error);
        showBasicPopupTimer();
    }
}

/**
 * Update the timer display elements based on timer type
 * @param {string} timerType - Type of timer (daily, birthday, life)
 */
function updateTimerDisplay(timerType) {
    const timerTitle = document.getElementById('timer-title');
    const timerDescription = document.getElementById('timer-description');
    
    if (timerTitle && timerDescription) {
        // Apply nice transition effect
        timerTitle.style.opacity = 0;
        timerDescription.style.opacity = 0;
        
        setTimeout(() => {
            if (timerType === 'daily') {
                timerTitle.textContent = 'Daily Timer';
                timerDescription.textContent = 'Time until midnight';
            } else if (timerType === 'birthday') {
                timerTitle.textContent = 'Birthday Timer';
                timerDescription.textContent = 'Time since your birth';
            } else if (timerType === 'life') {
                timerTitle.textContent = 'Life Timer';
                timerDescription.textContent = 'Estimated time remaining in your life';
            }
            
            // Fade back in
            timerTitle.style.transition = 'opacity 0.5s ease';
            timerDescription.style.transition = 'opacity 0.5s ease';
            timerTitle.style.opacity = 1;
            timerDescription.style.opacity = 1;
        }, 300);
    }
}

/**
 * Start a timer synced with the main app's data
 * @param {string} timerType - Type of timer (daily, birthday, life)
 */
function startSyncedTimer(timerType) {
    try {
        // Clear any existing interval
        if (window.popupUpdateInterval) {
            clearInterval(window.popupUpdateInterval);
        }
        
        // Start an interval to update timer values
        const updateInterval = setInterval(() => {
            try {
                updateTimerValues(timerType);
            } catch (updateError) {
                console.error('Error updating timer values:', updateError);
            }
        }, 1000);
        
        // Store interval ID for cleanup
        window.popupUpdateInterval = updateInterval;
        
        // Do an immediate update
        updateTimerValues(timerType);
    } catch (error) {
        console.error('Error starting synced timer:', error);
        showBasicPopupTimer();
    }
}

/**
 * Update timer values based on timer type
 * @param {string} timerType - Type of timer (daily, birthday, life)
 */
function updateTimerValues(timerType) {
    try {
        // Get current date and time
        const now = new Date();
        
        let hours, minutes, seconds, progress;
        
        if (timerType === 'daily') {
            // Daily timer - time until midnight
            const midnight = new Date();
            midnight.setHours(24, 0, 0, 0);
            
            const totalSeconds = Math.floor((midnight - now) / 1000);
            hours = Math.floor(totalSeconds / 3600);
            minutes = Math.floor((totalSeconds % 3600) / 60);
            seconds = totalSeconds % 60;
            
            // Calculate progress
            const secondsInDay = 24 * 60 * 60;
            const secondsPassed = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
            progress = (secondsPassed / secondsInDay) * 100;
        } else if (timerType === 'birthday' || timerType === 'life') {
            // For birthday and life timers, we need the stored user data
            chrome.storage.sync.get(['birthDate', 'lifeExpectancy'], function(items) {
                if (chrome.runtime.lastError) {
                    console.warn('Error accessing storage:', chrome.runtime.lastError);
                    return;
                }
                
                if (items.birthDate) {
                    const birthDate = new Date(items.birthDate);
                    
                    if (timerType === 'birthday') {
                        // Calculate time since birth
                        const timeSinceBirth = new Date(now - birthDate);
                        const yearsSinceBirth = Math.floor(timeSinceBirth / (365.25 * 24 * 60 * 60 * 1000));
                        
                        // Update timer description
                        updateElement('timer-description', `You are ${yearsSinceBirth} years old`);
                    } else if (timerType === 'life' && items.lifeExpectancy) {
                        // Calculate remaining time based on life expectancy
                        const lifeExpectancy = parseFloat(items.lifeExpectancy);
                        const endDate = new Date(birthDate);
                        endDate.setFullYear(birthDate.getFullYear() + lifeExpectancy);
                        
                        // Update timer description
                        const yearsRemaining = Math.max(0, (endDate - now) / (365.25 * 24 * 60 * 60 * 1000));
                        updateElement('timer-description', `Approximately ${yearsRemaining.toFixed(1)} years remaining`);
                    }
                } else {
                    // No birth date, show message
                    updateElement('timer-description', 'Open settings to enter your birth date');
                }
            });
            
            // Default values for now
            hours = Math.floor(Math.random() * 24);
            minutes = Math.floor(Math.random() * 60);
            seconds = Math.floor(Math.random() * 60);
            progress = 50;
        }
        
        // Update DOM elements with animation
        updateElement('hours-value', formatTimeValue(hours));
        updateElement('minutes-value', formatTimeValue(minutes));
        updateElement('seconds-value', formatTimeValue(seconds));
        
        // Update progress bar
        const progressBar = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-percent');
        
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
        
        if (progressText) {
            progressText.textContent = `${Math.round(progress)}%`;
        }
    } catch (error) {
        console.error('Error updating timer values:', error);
    }
}

/**
 * Show a basic timer when module system fails
 */
function showBasicPopupTimer() {
    console.log('Showing basic popup timer');
    
    try {
        // Hide loading overlay
        showLoadingOverlay(false);
        
        // Use the daily timer as fallback
        updateTimerDisplay('daily');
        
        // Clear any existing interval
        if (window.popupUpdateInterval) {
            clearInterval(window.popupUpdateInterval);
        }
        
        // Start a basic timer
        const updateInterval = setInterval(updateBasicTimer, 1000);
        window.popupUpdateInterval = updateInterval;
        
        // Do an immediate update
        updateBasicTimer();
    } catch (error) {
        console.error('Error showing basic timer:', error);
        showErrorMessage('Failed to display timer. Please reload the extension.');
    }
}

/**
 * Update the basic timer display
 */
function updateBasicTimer() {
    try {
        // Calculate time until midnight
        const now = new Date();
        const midnight = new Date();
        midnight.setHours(24, 0, 0, 0);
        
        const totalSeconds = Math.floor((midnight - now) / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        // Update DOM elements
        updateElement('hours-value', formatTimeValue(hours));
        updateElement('minutes-value', formatTimeValue(minutes));
        updateElement('seconds-value', formatTimeValue(seconds));
        
        // Calculate and update progress
        const secondsInDay = 24 * 60 * 60;
        const secondsPassed = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
        const progress = (secondsPassed / secondsInDay) * 100;
        
        const progressBar = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-percent');
        
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
        
        if (progressText) {
            progressText.textContent = `${Math.round(progress)}%`;
        }
    } catch (error) {
        console.error('Error updating basic timer:', error);
    }
}

/**
 * Format time value as two digits
 * @param {number} value - Time value to format
 * @returns {string} Formatted time value
 */
function formatTimeValue(value) {
    return value < 10 ? `0${value}` : `${value}`;
}

/**
 * Update an element's text content
 * @param {string} id - Element ID
 * @param {string} value - New value
 */
function updateElement(id, value) {
    const element = document.getElementById(id);
    if (element && element.textContent !== value) {
        element.textContent = value;
    }
}

/**
 * Set up event listeners for popup UI
 */
function setupPopupEventListeners() {
    try {
        // Settings button
        const settingsButton = document.getElementById('open-settings-button');
        if (settingsButton) {
            settingsButton.addEventListener('click', openSettings);
        }
        
        // New tab button
        const newTabButton = document.getElementById('open-newtab-button');
        if (newTabButton) {
            newTabButton.addEventListener('click', openNewTab);
        }
        
        // Retry button
        const retryButton = document.getElementById('retry-button');
        if (retryButton) {
            retryButton.addEventListener('click', function() {
                // Hide error screen
                const errorScreen = document.getElementById('error-screen');
                if (errorScreen) {
                    errorScreen.classList.add('hidden');
                }
                
                // Reinitialize
                initializePopup();
            });
        }
        
        // Reset button
        const resetButton = document.getElementById('reset-button');
        if (resetButton) {
            resetButton.addEventListener('click', resetSettings);
        }
    } catch (error) {
        console.error('Error setting up event listeners:', error);
    }
}

/**
 * Open settings popup or page
 */
function openSettings() {
    try {
        // Try to use the settings module if available
        if (window.popupTimerApp && typeof window.popupTimerApp.openSettings === 'function') {
            window.popupTimerApp.openSettings();
            return;
        }
        
        // Fallback to opening options page
        if (chrome.runtime.openOptionsPage) {
            chrome.runtime.openOptionsPage();
        } else {
            // For older Chrome versions
            window.open(chrome.runtime.getURL('options.html'));
        }
    } catch (error) {
        console.error('Error opening settings:', error);
        showErrorMessage('Could not open settings. Please try again.');
    }
}

/**
 * Open the new tab page
 */
function openNewTab() {
    try {
        // Create a new tab with the extension's new tab page
        chrome.tabs.create({ url: chrome.runtime.getURL('newtab.html') });
        
        // Close the popup
        window.close();
    } catch (error) {
        console.error('Error opening new tab:', error);
        showErrorMessage('Could not open timer in new tab. Please try again.');
    }
}

/**
 * Reset settings and reload
 */
function resetSettings() {
    try {
        // Show loading overlay while resetting
        showLoadingOverlay(true, 'Resetting settings...');
        
        // Reset settings in storage
        chrome.storage.sync.clear(function() {
            if (chrome.runtime.lastError) {
                console.error('Error clearing settings:', chrome.runtime.lastError);
                showErrorMessage('Failed to reset settings: ' + chrome.runtime.lastError.message);
                return;
            }
            
            console.log('Settings reset successfully');
            
            // Also clear local storage
            chrome.storage.local.clear(function() {
                if (chrome.runtime.lastError) {
                    console.warn('Error clearing local storage:', chrome.runtime.lastError);
                }
                
                // Reload the popup
                setTimeout(function() {
                    window.location.reload();
                }, 1000);
            });
        });
    } catch (error) {
        console.error('Error resetting settings:', error);
        showErrorMessage('Error resetting settings: ' + error.message);
    }
}

/**
 * Show loading overlay
 * @param {boolean} show - Whether to show or hide
 * @param {string} message - Optional message to display
 */
function showLoadingOverlay(show, message) {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (!loadingOverlay) return;
    
    if (show) {
        loadingOverlay.classList.remove('hidden');
        
        // Update message if provided
        if (message) {
            const loadingText = loadingOverlay.querySelector('p');
            if (loadingText) {
                loadingText.textContent = message;
            }
        }
    } else {
        loadingOverlay.classList.add('hidden');
    }
}

/**
 * Show error message
 * @param {string} message - Error message to display
 */
function showErrorMessage(message) {
    try {
        // Hide loading overlay
        showLoadingOverlay(false);
        
        // Show error screen
        const errorScreen = document.getElementById('error-screen');
        const errorMessage = document.getElementById('error-message');
        
        if (errorScreen && errorMessage) {
            errorMessage.textContent = message || 'An unknown error occurred. Please try again.';
            errorScreen.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Error showing error message:', error);
        alert('Error: ' + message);
    }
}

/**
 * Update the quote based on timer type
 * @param {string} timerType - Timer type
 */
function updateQuoteForTimerType(timerType = 'daily') {
    // Collection of quotes for each timer type
    const quotes = {
        daily: [
            "Every day is a new opportunity.",
            "Make today count.",
            "Present moments, precious memories.",
            "Each day has its own miracle."
        ],
        birthday: [
            "Life is not measured by the breaths we take, but by the moments that take our breath away.",
            "Age is merely the number of years the world has been enjoying you.",
            "Today is the oldest you've ever been, and the youngest you'll ever be again."
        ],
        life: [
            "Life is short, but sweet for certain.",
            "It's not the years in your life that count. It's the life in your years.",
            "Yesterday is history, tomorrow is a mystery, today is a gift."
        ]
    };
    
    // Get quote container and description element
    const timerDescription = document.getElementById('timer-description');
    
    if (timerDescription) {
        // Select a random quote for the timer type
        const typeQuotes = quotes[timerType] || quotes.daily;
        const randomIndex = Math.floor(Math.random() * typeQuotes.length);
        const quote = typeQuotes[randomIndex];
        
        // Apply with fade effect
        timerDescription.style.opacity = 0;
        
        setTimeout(() => {
            timerDescription.textContent = quote;
            timerDescription.style.transition = 'opacity 0.5s ease';
            timerDescription.style.opacity = 1;
        }, 300);
    }
}

/**
 * Set up a runtime message listener to handle settings updates
 */
function setupRuntimeMessageListener() {
    try {
        chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
            // Check if the message is a settings update
            if (message.action === 'settingsUpdated' && message.settings) {
                console.log('Received settings update:', message.settings);
                
                // Apply theme if it changed
                if (message.settings.theme) {
                    applyTheme(message.settings.theme);
                }
                
                // Update timer if the timer type changed
                if (message.settings.timerType) {
                    updateTimerDisplay(message.settings.timerType);
                    
                    // If we have a running timer, update it
                    if (window.popupUpdateInterval) {
                        clearInterval(window.popupUpdateInterval);
                        startSyncedTimer(message.settings.timerType);
                    }
                    
                    // Update the quote
                    updateQuoteForTimerType(message.settings.timerType);
                }
                
                // Send response to confirm receipt
                if (sendResponse) {
                    sendResponse({status: 'Settings applied in popup'});
                }
            }
            
            // Return true to indicate you might respond asynchronously
            return true;
        });
    } catch (error) {
        console.error('Error setting up runtime message listener:', error);
    }
}

/**
 * Apply theme to the document
 * @param {string} theme - Theme name ('auto', 'dark', or 'light')
 */
function applyTheme(theme) {
    try {
        // Remove existing theme attribute
        document.documentElement.removeAttribute('data-theme');
        
        // Set new theme if not auto
        if (theme === 'dark' || theme === 'light') {
            document.documentElement.setAttribute('data-theme', theme);
        }
        
        console.log('Applied theme:', theme);
    } catch (error) {
        console.error('Error applying theme:', error);
    }
}

// Clean up when popup is closed
window.addEventListener('unload', function() {
    // Clear any intervals
    if (window.popupUpdateInterval) {
        clearInterval(window.popupUpdateInterval);
    }
}); 