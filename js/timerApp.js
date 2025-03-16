/**
 * TimerApp.js - Modular Countdown Timer Application
 * 
 * This file implements a timer application using a modular architecture,
 * with clean separation of concerns and robust error handling.
 * 
 * Uses ModuleRegistry pattern to prevent redeclaration.
 */

// Use ModuleRegistry to prevent redeclaration
(function() {
  // Skip if already registered
  if (window.ModuleRegistry && window.ModuleRegistry.isRegistered('TimerApp')) {
    console.log('TimerApp already registered, skipping definition');
    return;
  }

  /**
   * Main Timer Application Class
   */
  class TimerApp {
    /**
     * Initialize the timer application constructor
     */
    constructor() {
      // Configuration
      this.config = {
        debug: true,
        defaultTimerType: 'daily',
        updateInterval: 1000, // Update interval in milliseconds
      };

      // State
      this.state = {
        initialized: false,
        running: false,
        currentTimerType: null,
        settings: null,
        timerInterval: null,
        previousValues: {
          years: null,
          months: null,
          days: null,
          hours: null,
          minutes: null,
          seconds: null
        }
      };

      // DOM elements cache - will be populated in init()
      this.elements = {};

      // Dependencies
      this.storage = null;
      this.calculator = null;
      this.animator = null;

      // Bind methods to maintain 'this' context
      this.init = this.init.bind(this);
      this.startTimer = this.startTimer.bind(this);
      this.updateTimer = this.updateTimer.bind(this);
      this.setupEventListeners = this.setupEventListeners.bind(this);
      this.openSettings = this.openSettings.bind(this);
      this.closeSettings = this.closeSettings.bind(this);
      this.handleTimerTypeChange = this.handleTimerTypeChange.bind(this);
      this.handleSetupFormSubmit = this.handleSetupFormSubmit.bind(this);
      this.handleSettingsFormSubmit = this.handleSettingsFormSubmit.bind(this);
      this.handleOutsideClick = this.handleOutsideClick.bind(this);
      
      // Logging helpers
      this.log = this.log.bind(this);
      this.error = this.error.bind(this);
    }
    
    /**
     * Initialize the timer application
     * @param {string} [initialTimerType] - Initial timer type
     * @param {Object} [initialSettings] - Initial settings
     * @returns {Promise} Promise that resolves when initialization is complete
     */
    async init(initialTimerType, initialSettings) {
      try {
        console.log('[TimerApp] Initializing timer application...');
        
        // Ensure StorageKeys is defined
        if (!window.StorageKeys) {
          console.warn('[TimerApp] StorageKeys not defined, creating defaults');
          window.StorageKeys = {
            TIMER_TYPE: 'timerType',
            BIRTH_DATE: 'birthDate',
            LIFE_EXPECTANCY: 'lifeExpectancy',
            SETUP_COMPLETED: 'setupCompleted'
          };
        }
        
        // Step 1: Initialize DOM references
        this.initDomReferences();
        
        // Step 2: Show loading
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
          loadingOverlay.classList.remove('hidden');
        }
        
        // Step 3: Initialize storage and load settings
        try {
          this.storage = new StorageManager();
          this.log('Storage manager initialized successfully');
        } catch (storageError) {
          this.error('Error initializing storage manager', storageError);
          // Create a fallback storage manager that uses localStorage
          this.storage = this.createFallbackStorage();
        }
        
        let settings;
        try {
          settings = await this.storage.getSettings().catch(err => {
            this.error('Failed to load settings, using defaults', err);
            return null;
          });
          
          // If settings couldn't be loaded, use defaults
          if (!settings) {
            settings = {
              timerType: this.config.defaultTimerType,
              birthDate: null,
              lifeExpectancy: 80,
              setupCompleted: false
            };
            this.log('Using default settings due to loading error');
          }
        } catch (settingsError) {
          this.error('Error fetching settings from storage', settingsError);
          // Use default settings in case of error
          settings = {
            timerType: this.config.defaultTimerType,
            birthDate: null,
            lifeExpectancy: 80,
            setupCompleted: false
          };
          this.log('Using default settings due to error');
        }
        
        this.state.settings = settings;
        this.log('Settings loaded:', settings);
        
        // Step 4: Set up event listeners
        this.setupEventListeners();
        
        // Step 5: Initialize the timer calculator
        try {
          if (window.TimerCalculator) {
            this.calculator = new window.TimerCalculator();
            this.log('Using TimerCalculator class from registry');
          } else if (window.timerCalculator) {
            this.calculator = window.timerCalculator;
            this.log('Using global timerCalculator instance');
          } else {
            this.calculator = new TimerCalculator();
            this.log('Using direct TimerCalculator instantiation');
          }
        } catch (calcError) {
          this.error('Error initializing calculator', calcError);
          // Create a basic calculator if the real one fails
          this.calculator = this.createFallbackCalculator();
          this.log('Using fallback calculator');
        }
        
        // Step 6: Determine which timer to show
        const storageKeyTimerType = window.StorageKeys ? window.StorageKeys.TIMER_TYPE : 'timerType';
        const timerType = initialTimerType || 
                        (settings && settings[storageKeyTimerType]) || 
                        this.config.defaultTimerType;
        this.log(`Initializing with timer type: ${timerType}`);
        
        // Step 7: Show the timer screen
        try {
          await this.showTimerScreen(timerType);
        } catch (screenError) {
          this.error('Error showing timer screen', screenError);
          // Try using the default timer type if showing the selected type fails
          if (timerType !== this.config.defaultTimerType) {
            await this.showTimerScreen(this.config.defaultTimerType);
          }
        }
        
        // Step 8: Start the timer
        this.startTimer();
        
        // Step 9: Hide loading overlay once everything is ready
        if (loadingOverlay) {
          loadingOverlay.classList.add('hidden');
        }
        
        // Step 10: Show timer container
        const timerContainer = document.getElementById('timer-container');
        if (timerContainer) {
          timerContainer.classList.remove('hidden');
        }
        
        // Mark as initialized
        this.state.initialized = true;
        window.TIMER_INITIALIZED = true;
        
        this.log('TimerApp initialized successfully');
        return true;
      } catch (error) {
        this.error('Failed to initialize TimerApp', error);
        
        // Show error screen with more informative message
        const errorMsg = error ? (error.message || 'Unknown error') : 'Unknown error';
        this.showErrorScreen(`Failed to initialize timer application: ${errorMsg}. Please reload the page.`);
        
        // Try to recover with fallback timer
        try {
          console.log('[TimerApp] Attempting fallback initialization');
          
          // Hide loading overlay if visible
          const loadingOverlay = document.getElementById('loading-overlay');
          if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
          }
          
          // Try to start fallback timer
          this.startFallbackTimer();
        } catch (fallbackError) {
          console.error('[TimerApp] Complete initialization failure:', fallbackError);
        }
        
        return false;
      }
    }
    
    /**
     * Initialize references to DOM elements
     */
    initDomReferences() {
      try {
        this.log('Initializing DOM references');
        
        // Initialize the elements object to prevent undefined errors
        this.elements = {
          values: {},
          labels: {}
        };
        
        // Safely get element - returns null if element doesn't exist
        const safeGetElement = (id) => {
          try {
            return document.getElementById(id);
          } catch (error) {
            this.error(`Failed to get element with ID: ${id}`, error);
            return null;
          }
        };
        
        // Timer container
        this.elements.timerContainer = safeGetElement('timer-container');
        
        // Timer display values
        this.elements.values = {
          years: safeGetElement('years-value'),
          months: safeGetElement('months-value'),
          days: safeGetElement('days-value'),
          hours: safeGetElement('hours-value'),
          minutes: safeGetElement('minutes-value'),
          seconds: safeGetElement('seconds-value')
        };
        
        // Timer labels
        this.elements.labels = {
          years: safeGetElement('years-label'),
          months: safeGetElement('months-label'),
          days: safeGetElement('days-label'),
          hours: safeGetElement('hours-label'),
          minutes: safeGetElement('minutes-label'),
          seconds: safeGetElement('seconds-label')
        };
        
        // Progress indicator
        this.elements.progressBar = safeGetElement('progress-bar');
        this.elements.progressPercent = safeGetElement('progress-percent');
        
        // Seek bar elements
        this.elements.seekBar = safeGetElement('seek-bar');
        this.elements.seekBarFill = safeGetElement('seek-bar-fill');
        this.elements.seekBarHandle = safeGetElement('seek-bar-handle');
        
        // Log if any critical elements are missing
        if (!this.elements.seekBar) {
          this.log('Seek bar element not found. The seek bar functionality will be disabled.');
        }
        
        if (!this.elements.seekBarFill) {
          this.log('Seek bar fill element not found. The seek bar may not display progress correctly.');
        }
        
        if (!this.elements.seekBarHandle) {
          this.log('Seek bar handle element not found. The seek bar may have limited interactivity.');
        }
        
        // Timer header
        this.elements.timerTitle = safeGetElement('timer-title');
        this.elements.timerDescription = safeGetElement('timer-description');
        
        // Settings
        this.elements.settingsButton = safeGetElement('settings-button');
        this.elements.settingsPopup = safeGetElement('settings-popup');
        this.elements.settingsForm = safeGetElement('settings-form');
        this.elements.closeSettingsButton = safeGetElement('close-settings');
        this.elements.cancelSettingsButton = safeGetElement('cancel-settings-btn');
        this.elements.saveSettingsButton = safeGetElement('save-settings-btn');
        
        // Settings form elements
        this.elements.birthDateGroup = safeGetElement('birth-date-group');
        this.elements.lifeExpectancyGroup = safeGetElement('life-expectancy-group');
        this.elements.birthDateInput = safeGetElement('birth-date');
        this.elements.lifeExpectancyInput = safeGetElement('life-expectancy');
        
        // Timer type radio buttons
        this.elements.dailyTimerOption = safeGetElement('daily-timer-option');
        this.elements.birthdayTimerOption = safeGetElement('birthday-timer-option');
        this.elements.lifeTimerOption = safeGetElement('life-timer-option');
        
        // Initial setup form
        this.elements.setupForm = safeGetElement('setup-form');
        
        // Loading and error screens
        this.elements.loadingOverlay = safeGetElement('loading-overlay');
        this.elements.errorContainer = safeGetElement('error-container');
        this.elements.errorMessage = safeGetElement('error-message');
        
        // Initialize animation library if available
        if (window.anime) {
          this.animator = window.anime;
          this.log('Animation library initialized');
        } else {
          this.log('Animation library not available, using fallbacks');
        }
      } catch (error) {
        this.error('Error initializing DOM references', error);
        // Create empty objects to prevent further errors
        this.elements = this.elements || {};
        this.elements.values = this.elements.values || {};
        this.elements.labels = this.elements.labels || {};
        console.error('Failed to initialize DOM references, continuing with limited functionality');
      }
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
      try {
        // Settings button click
        if (this.elements.settingsButton) {
          this.elements.settingsButton.addEventListener('click', () => {
            this.log('Settings button clicked');
            this.openSettings();
          });
        } else {
          this.log('Settings button element not found');
        }
        
        // Close settings button
        if (this.elements.closeSettingsButton) {
          this.elements.closeSettingsButton.addEventListener('click', () => {
            this.log('Close settings button clicked');
            this.closeSettings();
          });
        }
        
        // Cancel settings button
        if (this.elements.cancelSettingsButton) {
          this.elements.cancelSettingsButton.addEventListener('click', () => {
            this.log('Cancel settings button clicked');
            this.closeSettings();
          });
        }
        
        // Settings form submission
        if (this.elements.settingsForm) {
          this.elements.settingsForm.addEventListener('submit', (event) => {
            event.preventDefault();
            this.handleSettingsFormSubmit();
          });
        }
        
        // Initial setup form submission
        if (this.elements.setupForm) {
          this.elements.setupForm.addEventListener('submit', (event) => {
            event.preventDefault();
            this.handleSetupFormSubmit();
          });
        }
        
        // Timer type radio buttons in the settings popup
        const settingsTimerTypeRadios = document.querySelectorAll('#settings-form input[name="timer-type"]');
        if (settingsTimerTypeRadios.length > 0) {
          settingsTimerTypeRadios.forEach(radio => {
            radio.addEventListener('change', (event) => {
              this.toggleSettingsFields(event.target.value);
            });
          });
        } else {
          this.log('Timer type radio buttons not found in settings form');
        }
        
        // Error handling buttons
        const retryButton = document.getElementById('retry-button');
        if (retryButton) {
          retryButton.addEventListener('click', () => {
            this.log('Retry button clicked');
            location.reload();
          });
        }
        
        // Set up the reset button event listener with a more robust approach
        this.setupResetButton();
        
        // Set up seek bar interaction if the element exists
        if (this.elements.seekBar) {
          this.setupSeekBarInteraction();
        } else {
          this.log('Seek bar element not found, skipping interaction setup');
        }
        
        this.log('Event listeners set up');
      } catch (error) {
        this.error('Failed to set up event listeners', error);
        // Continue execution without breaking the app
      }
    }
    
    /**
     * Set up reset button with a more reliable approach
     * This implementation operates independently of the class's state
     */
    setupResetButton() {
      // Get the reset button directly
      const resetButton = document.getElementById('reset-button');
      if (!resetButton) {
        console.error('[TimerApp] Reset button not found in DOM');
        return;
      }
      
      // Create a standalone reset handler that doesn't depend on this.storage
      const performReset = async () => {
        console.log('[TimerApp] Reset button clicked, performing global reset');
        
        try {
          // Show visual feedback
          resetButton.textContent = 'Resetting...';
          resetButton.disabled = true;
          
          // Show loading overlay
          const loadingOverlay = document.getElementById('loading-overlay');
          if (loadingOverlay) {
            loadingOverlay.classList.remove('hidden');
          }
          
          // Clear settings using multiple strategies to ensure reliability
          let resetSuccessful = false;
          
          // Strategy 1: Use chrome.storage API if available
          if (window.chrome && chrome.storage) {
            try {
              await new Promise((resolve, reject) => {
                chrome.storage.sync.clear(() => {
                  if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                  } else {
                    console.log('[Reset] Chrome storage cleared successfully');
                    resetSuccessful = true;
                    resolve();
                  }
                });
              });
            } catch (chromeErr) {
              console.error('[Reset] Failed to clear Chrome storage:', chromeErr);
            }
          }
          
          // Strategy 2: Use localStorage direct clearing
          try {
            // Clear known storage keys
            const knownKeys = [
              'timerType', 'birthDate', 'lifeExpectancy', 'setupCompleted',
              'timer-type', 'birth-date', 'life-expectancy', 'setup-completed'
            ];
            
            knownKeys.forEach(key => {
              try {
                localStorage.removeItem(key);
              } catch (e) {
                // Ignore individual key errors
              }
            });
            
            console.log('[Reset] Local storage cleared directly');
            resetSuccessful = true;
          } catch (localErr) {
            console.error('[Reset] Failed to clear localStorage:', localErr);
          }
          
          // Strategy 3: Try clearing through the StorageManager if available
          if (window.StorageManager && !resetSuccessful) {
            try {
              const tempStorage = new window.StorageManager();
              await tempStorage.clearSettings();
              console.log('[Reset] Settings cleared via StorageManager');
              resetSuccessful = true;
            } catch (storageErr) {
              console.error('[Reset] Failed to clear via StorageManager:', storageErr);
            }
          }
          
          // Show success message or error
          const errorMessage = document.getElementById('error-message');
          if (errorMessage) {
            if (resetSuccessful) {
              errorMessage.textContent = 'Settings reset successfully. Reloading...';
            } else {
              errorMessage.textContent = 'Settings reset partially completed. Reloading...';
            }
          }
          
          // Reload page after a short delay regardless of outcome
          setTimeout(() => {
            location.reload();
          }, 1500);
        } catch (error) {
          console.error('[Reset] Critical error during reset:', error);
          
          // Reset button state
          resetButton.textContent = 'Reset Settings';
          resetButton.disabled = false;
          
          // Show error message
          const errorMessage = document.getElementById('error-message');
          if (errorMessage) {
            errorMessage.textContent = 'Failed to reset settings. Try refreshing the page.';
          }
          
          // Hide loading overlay
          const loadingOverlay = document.getElementById('loading-overlay');
          if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
          }
        }
      };
      
      // Set up event listener
      resetButton.addEventListener('click', performReset);
      console.log('[TimerApp] Reset button event listener attached');
    }
    
    /**
     * Show the timer screen for a specific timer type
     * @param {string} timerType - Type of timer to show
     */
    async showTimerScreen(timerType) {
      this.log(`Showing timer screen for ${timerType}`);
      
      try {
        if (!timerType) {
          timerType = this.config.defaultTimerType;
        }
        
        // Save the current timer type
        this.state.currentTimerType = timerType;
        
        // Update timer type class on container
        const timerScreen = document.getElementById('timer-screen');
        if (timerScreen) {
          // Remove all timer type classes
          timerScreen.classList.remove('timer-type-daily', 'timer-type-birthday', 'timer-type-life');
          // Add the current timer type class
          timerScreen.classList.add(`timer-type-${timerType}`);
        }
        
        // Update labels and descriptions
        this.updateTimerLabels(timerType);
        
        // Update settings form if open
        this.updateSettingsForm(timerType);
        
        // Save preference if different from current
        if (this.state.settings && this.state.settings[window.StorageKeys.TIMER_TYPE] !== timerType) {
          this.log(`Saving new timer type preference: ${timerType}`);
          
          try {
            await this.storage.saveTimerType(timerType);
            this.state.settings[window.StorageKeys.TIMER_TYPE] = timerType;
          } catch (err) {
            this.error('Failed to save timer type preference', err);
          }
        }
      } catch (error) {
        this.error('Error showing timer screen', error);
      }
    }
    
    /**
     * Update timer labels based on timer type
     * @param {string} timerType - Type of timer
     */
    updateTimerLabels(timerType) {
      try {
        // Guard clause: Check if timer title/description elements exist
        if (!this.elements || !this.elements.timerTitle || !this.elements.timerDescription) {
          this.log('Timer title/description elements not found, skipping label update');
          return;
        }
        
        // Set timer title and description
        switch (timerType) {
          case 'life':
            this.elements.timerTitle.textContent = 'Life Countdown';
            this.elements.timerDescription.textContent = 'Time remaining in your life based on average life expectancy';
            break;
          case 'birthday':
            this.elements.timerTitle.textContent = 'Birthday Countdown';
            this.elements.timerDescription.textContent = 'Time until your next birthday';
            break;
          case 'daily':
            this.elements.timerTitle.textContent = 'Daily Countdown';
            this.elements.timerDescription.textContent = 'Time remaining until midnight';
            break;
          default:
            this.elements.timerTitle.textContent = 'Countdown Timer';
            this.elements.timerDescription.textContent = 'Time remaining';
        }
        
        this.log(`Timer labels updated for ${timerType}`);
      } catch (error) {
        this.error('Error updating timer labels:', error);
        // Continue execution without breaking the app
      }
    }
    
    /**
     * Toggle visibility of settings fields based on timer type
     * @param {string} timerType - Type of timer
     */
    toggleSettingsFields(timerType) {
      this.log(`Toggling settings fields for ${timerType}`);
      
      try {
        // Show/hide birth date field
        if (this.elements.birthDateGroup) {
          if (timerType === 'birthday' || timerType === 'life') {
            this.elements.birthDateGroup.classList.remove('hidden');
          } else {
            this.elements.birthDateGroup.classList.add('hidden');
          }
        }
        
        // Show/hide life expectancy field
        if (this.elements.lifeExpectancyGroup) {
          if (timerType === 'life') {
            this.elements.lifeExpectancyGroup.classList.remove('hidden');
          } else {
            this.elements.lifeExpectancyGroup.classList.add('hidden');
          }
        }
      } catch (error) {
        this.error('Error toggling settings fields', error);
      }
    }
    
    /**
     * Update settings form values based on current settings
     * @param {string} timerType - Timer type to select in form
     */
    updateSettingsForm(timerType) {
      try {
        // Guard clause: Check if settings form exists
        if (!this.elements) {
          this.log('Elements not initialized, skipping settings form update');
          return;
        }
        
        // Update timer type radio buttons
        if (this.elements.dailyTimerOption && this.elements.birthdayTimerOption && this.elements.lifeTimerOption) {
          this.elements.dailyTimerOption.checked = timerType === 'daily';
          this.elements.birthdayTimerOption.checked = timerType === 'birthday';
          this.elements.lifeTimerOption.checked = timerType === 'life';
        } else {
          this.log('Timer type radio buttons not found in settings form');
        }
        
        // Update birth date field
        if (this.elements.birthDateInput && this.state.settings && this.state.settings[window.StorageKeys.BIRTH_DATE]) {
          this.elements.birthDateInput.value = this.state.settings[window.StorageKeys.BIRTH_DATE];
        }
        
        // Update life expectancy field
        if (this.elements.lifeExpectancyInput && this.state.settings && this.state.settings[window.StorageKeys.LIFE_EXPECTANCY]) {
          this.elements.lifeExpectancyInput.value = this.state.settings[window.StorageKeys.LIFE_EXPECTANCY];
        }
        
        // Toggle field visibility based on timer type
        this.toggleSettingsFields(timerType);
        
        this.log('Settings form updated');
      } catch (error) {
        this.error('Error updating settings form:', error);
        // Continue execution without breaking the app
      }
    }
    
    /**
     * Handle timer type change
     * @param {string} timerType - New timer type
     */
    async handleTimerTypeChange(timerType) {
      this.log(`Timer type changed to ${timerType}`);
      
      // Show the appropriate timer screen
      await this.showTimerScreen(timerType);
      
      // Restart the timer with the new type
      this.startTimer();
    }
    
    /**
     * Handle settings form submission
     */
    async handleSettingsFormSubmit() {
      try {
        this.log('Processing settings form submission');
        
        // Show loading indicator if available
        if (this.elements && this.elements.loadingOverlay) {
          this.elements.loadingOverlay.classList.remove('hidden');
        }
        
        // Check if elements are initialized
        if (!this.elements) {
          throw new Error('DOM elements not initialized');
        }
        
        // Extract form data from settings popup
        const timerTypeRadios = document.querySelectorAll('#settings-form input[name="timer-type"]');
        let timerType = this.config.defaultTimerType;
        
        for (const radio of timerTypeRadios) {
          if (radio.checked) {
            timerType = radio.value;
            break;
          }
        }
        
        const birthDate = this.elements.birthDateInput?.value || null;
        const lifeExpectancy = parseInt(this.elements.lifeExpectancyInput?.value || '80', 10);
        
        this.log('Settings form data:', { timerType, birthDate, lifeExpectancy });
        
        // Validate form data
        if ((timerType === 'birthday' || timerType === 'life') && !birthDate) {
          this.showErrorMessage('Please enter your birth date');
          
          // Hide loading overlay
          if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.classList.add('hidden');
          }
          
          return;
        }
        
        // Validate birth date format
        if (birthDate) {
          const birthDateObj = new Date(birthDate);
          if (isNaN(birthDateObj.getTime())) {
            this.showErrorMessage('Please enter a valid birth date');
            
            // Hide loading overlay
            if (this.elements.loadingOverlay) {
              this.elements.loadingOverlay.classList.add('hidden');
            }
            
            return;
          }
        }
        
        // Validate life expectancy range
        if (timerType === 'life') {
          if (isNaN(lifeExpectancy) || lifeExpectancy < 1 || lifeExpectancy > 150) {
            this.showErrorMessage('Please enter a valid life expectancy between 1 and 150 years');
            
            // Hide loading overlay
            if (this.elements.loadingOverlay) {
              this.elements.loadingOverlay.classList.add('hidden');
            }
            
            return;
          }
        }
        
        // Check if storage manager is initialized
        if (!this.storage) {
          throw new Error('Storage manager not initialized');
        }
        
        // Save settings
        const settings = {
          [window.StorageKeys.TIMER_TYPE]: timerType,
          [window.StorageKeys.SETUP_COMPLETED]: true
        };
        
        if (birthDate) {
          settings[window.StorageKeys.BIRTH_DATE] = birthDate;
        }
        
        if (timerType === 'life') {
          settings[window.StorageKeys.LIFE_EXPECTANCY] = lifeExpectancy;
        }
        
        await this.storage.saveSettings(settings);
        this.log('Settings saved successfully');
        
        // Update local settings cache
        this.state.settings = { ...this.state.settings, ...settings };
        
        // Close settings popup
        this.closeSettings();
        
        // Update timer display
        await this.showTimerScreen(timerType);
        this.startTimer();
        
        // Hide loading indicator
        if (this.elements.loadingOverlay) {
          this.elements.loadingOverlay.classList.add('hidden');
        }
        
        this.log('Settings applied successfully');
      } catch (error) {
        this.error('Error saving settings:', error);
        
        // Hide loading indicator
        if (this.elements && this.elements.loadingOverlay) {
          this.elements.loadingOverlay.classList.add('hidden');
        }
        
        // Show user-friendly error
        this.showErrorMessage('Error saving settings. Please try again.');
      }
    }
    
    /**
     * Show an error message to the user
     * @param {string} message - Error message to display
     * @private
     */
    showErrorMessage(message) {
      try {
        // Show alert as the simplest method
        alert(message);
      } catch (error) {
        // Last resort error logging
        console.error('Failed to show error message:', message);
      }
    }
    
    /**
     * Open settings popup
     */
    openSettings() {
      try {
        // Guard clause: Check if settings popup exists
        if (!this.elements || !this.elements.settingsPopup) {
          this.error('Settings popup element not found');
          return;
        }
        
        // Update form first with current settings
        this.updateSettingsForm(this.state.currentTimerType);
        
        // Show popup with animation
        this.elements.settingsPopup.classList.remove('hidden');
        
        // Add click outside listener with a slight delay to prevent immediate closing
        setTimeout(() => {
          document.addEventListener('click', this.handleOutsideClick);
        }, 100);
        
        this.log('Settings popup opened');
      } catch (error) {
        this.error('Error opening settings popup:', error);
        // As a fallback, try a direct alert
        alert('Could not open settings. Please try reloading the page.');
      }
    }
    
    /**
     * Handle click outside the settings popup
     * @param {MouseEvent} event - Click event
     */
    handleOutsideClick(event) {
      try {
        if (this.elements && 
            this.elements.settingsPopup && 
            !this.elements.settingsPopup.contains(event.target) && 
            event.target !== this.elements.settingsButton) {
          this.closeSettings();
        }
      } catch (error) {
        this.error('Error handling click outside settings:', error);
        // Try to close settings as a fallback
        this.closeSettings();
      }
    }
    
    /**
     * Close settings popup
     */
    closeSettings() {
      try {
        if (this.elements && 
            this.elements.settingsPopup && 
            !this.elements.settingsPopup.classList.contains('hidden')) {
          this.elements.settingsPopup.classList.add('hidden');
          
          // Remove click outside listener
          document.removeEventListener('click', this.handleOutsideClick);
          
          this.log('Settings popup closed');
        }
      } catch (error) {
        this.error('Error closing settings popup:', error);
        // Try a more direct approach as fallback
        try {
          const settingsPopup = document.getElementById('settings-popup');
          if (settingsPopup) {
            settingsPopup.classList.add('hidden');
          }
          document.removeEventListener('click', this.handleOutsideClick);
        } catch (e) {
          // Nothing more we can do
        }
      }
    }
    
    /**
     * Start the timer
     * Handles different timer types and initializes the interval
     */
    startTimer() {
      try {
        this.log(`Starting ${this.state.currentTimerType} timer`);
        
        // Clear any existing timer interval
        if (this.state.timerInterval) {
          clearInterval(this.state.timerInterval);
          this.state.timerInterval = null;
        }
        
        // Reset previous values
        this.state.previousValues = {
          years: null,
          months: null,
          days: null,
          hours: null,
          minutes: null,
          seconds: null
        };
        
        // Perform initial update
        this.updateTimer();
        
        // Set interval for future updates
        this.state.timerInterval = setInterval(() => {
          this.updateTimer();
        }, this.config.updateInterval);
        
        this.state.running = true;
        window.TIMER_RUNNING = true;
        
        this.log('Timer started successfully');
      } catch (error) {
        this.error('Failed to start timer', error);
        
        // Try to recover with fallback timer
        this.startFallbackTimer();
      }
    }
    
    /**
     * Start a very basic fallback timer
     * Used when normal timer fails
     */
    startFallbackTimer() {
      try {
        console.error('[TimerApp] Starting emergency fallback timer');
        
        // Clear any existing timer
        if (this.state && this.state.timerInterval) {
          clearInterval(this.state.timerInterval);
        }
        
        // Initialize state if it doesn't exist
        if (!this.state) {
          this.state = {
            running: false,
            timerInterval: null,
            currentTimerType: 'daily'
          };
        }
        
        // Define standard update interval if not set
        const updateInterval = (this.config && this.config.updateInterval) || 1000;
        
        // Create a simple update function that doesn't rely on class methods
        const updateFunction = () => {
          try {
            // Get current time
            const now = new Date();
            const hours = 23 - now.getHours();
            const minutes = 59 - now.getMinutes();
            const seconds = 59 - now.getSeconds();
            
            // Basic progress calculation
            const totalSeconds = 24 * 60 * 60;
            const secondsPassed = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
            const progressPercentage = (secondsPassed / totalSeconds) * 100;
            
            // Directly update DOM elements instead of using class methods
            const updateElementText = (id, value) => {
              const el = document.getElementById(id);
              if (el) el.textContent = String(value).padStart(2, '0');
            };
            
            // Update time values directly
            updateElementText('hours-value', hours);
            updateElementText('minutes-value', minutes);
            updateElementText('seconds-value', seconds);
            
            // Update progress bar
            const progressBar = document.getElementById('progress-bar');
            if (progressBar) {
              progressBar.style.width = `${progressPercentage}%`;
            }
            
            // Update progress percentage
            const progressPercent = document.getElementById('progress-percent');
            if (progressPercent) {
              progressPercent.textContent = `${Math.round(progressPercentage)}%`;
            }
            
            // Update timer title and description if needed
            const timerTitle = document.getElementById('timer-title');
            if (timerTitle) {
              timerTitle.textContent = 'Daily Countdown';
            }
            
            const timerDescription = document.getElementById('timer-description');
            if (timerDescription) {
              timerDescription.textContent = 'Time remaining until midnight (fallback mode)';
            }
            
            // Simple update for seek bar if present
            const seekBarFill = document.getElementById('seek-bar-fill');
            if (seekBarFill) {
              seekBarFill.style.width = `${progressPercentage}%`;
            }
            
          } catch (innerError) {
            // Log error but continue execution
            console.error('[TimerApp] Error in fallback timer update:', innerError);
          }
        };
        
        // Run update immediately
        updateFunction();
        
        // Set interval for future updates
        this.state.timerInterval = setInterval(updateFunction, updateInterval);
        
        this.state.running = true;
        window.TIMER_RUNNING = true;
        
        // Show timer container (fallback mode)
        const timerContainer = document.getElementById('timer-container');
        if (timerContainer) {
          timerContainer.classList.remove('hidden');
        }
        
        // Hide loading overlay if visible
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
          loadingOverlay.classList.add('hidden');
        }
        
        // Hide error container if visible
        const errorContainer = document.getElementById('error-container');
        if (errorContainer) {
          errorContainer.classList.add('hidden');
        }
        
        console.log('[TimerApp] Fallback timer started successfully');
        return true;
      } catch (error) {
        console.error('[TimerApp] Complete failure in fallback timer:', error);
        // Show alert as absolute last resort
        try {
          alert('Critical timer failure. Please reload the page.');
        } catch (e) {
          // Nothing more we can do
        }
        return false;
      }
    }
    
    /**
     * Update the timer display
     * Calculates time remaining and updates the display
     */
    updateTimer() {
      try {
        // Skip if calculator not available
        if (!this.calculator) {
          this.error('Timer calculator not available');
          return;
        }
        
        // Calculate time remaining based on timer type
        let timerData;
        
        switch (this.state.currentTimerType) {
          case 'life':
            // Get required data from settings
            const birthDate = this.state.settings && this.state.settings[window.StorageKeys.BIRTH_DATE];
            const lifeExpectancy = this.state.settings && this.state.settings[window.StorageKeys.LIFE_EXPECTANCY];
            
            if (!birthDate) {
              this.log('Birth date not set, showing settings form');
              this.openSettings();
              return;
            }
            
            timerData = this.calculator.calculateLifeTimer(birthDate, lifeExpectancy);
            break;
            
          case 'birthday':
            // Get birth date from settings
            const birthDateForBday = this.state.settings && this.state.settings[window.StorageKeys.BIRTH_DATE];
            
            if (!birthDateForBday) {
              this.log('Birth date not set, showing settings form');
              this.openSettings();
              return;
            }
            
            timerData = this.calculator.calculateBirthdayTimer(birthDateForBday);
            break;
            
          case 'daily':
          default:
            timerData = this.calculator.calculateDailyTimer();
            break;
        }
        
        // Update display with calculated values
        if (timerData) {
          // Update time unit values
          if (timerData.hasOwnProperty('years')) this.updateDisplayValues('years', timerData.years);
          if (timerData.hasOwnProperty('months')) this.updateDisplayValues('months', timerData.months);
          if (timerData.hasOwnProperty('days')) this.updateDisplayValues('days', timerData.days);
          if (timerData.hasOwnProperty('hours')) this.updateDisplayValues('hours', timerData.hours);
          if (timerData.hasOwnProperty('minutes')) this.updateDisplayValues('minutes', timerData.minutes);
          if (timerData.hasOwnProperty('seconds')) this.updateDisplayValues('seconds', timerData.seconds);
          
          // Update progress bar and seek bar
          if (timerData.hasOwnProperty('progressPercentage')) {
            this.updateProgressDisplay(timerData.progressPercentage);
          }
          
          // Update message if any
          if (timerData.message && this.elements.timerDescription) {
            this.elements.timerDescription.textContent = timerData.message;
          }
        }
      } catch (error) {
        this.error('Error updating timer', error);
      }
    }
    
    /**
     * Update display value for a time unit with animation
     * @param {string} unit - Time unit (years, months, etc.)
     * @param {number} newValue - New value to display
     */
    updateDisplayValues(unit, newValue) {
      if (!this.elements.values || !this.elements.values[unit]) {
        return;
      }
      
      const element = this.elements.values[unit];
      const oldValue = this.state.previousValues[unit];
      
      // Format the value to always have at least 2 digits
      newValue = String(newValue).padStart(2, '0');
      
      // Only animate if the value has changed
      if (oldValue === null || String(newValue) !== String(oldValue)) {
        try {
          // Update with animation if animator is available
          if (this.animator && typeof this.animator === 'function') {
            // Note: Anime.js must be loaded for this to work
            this.animator({
              targets: element,
              opacity: [0.5, 1],
              translateY: [10, 0],
              easing: 'easeOutQuad',
              duration: 300,
              complete: function() {
                element.textContent = newValue;
              }
            });
          } else {
            // Simple fallback animation with CSS classes
            element.classList.add('digit-change');
            element.textContent = newValue;
            
            // Remove animation class after animation completes
            setTimeout(() => {
              element.classList.remove('digit-change');
            }, 300);
          }
          
          // Store the new value for comparison
          this.state.previousValues[unit] = newValue;
          
          // Log significant changes for debugging
          if (unit === 'days' || unit === 'hours') {
            this.log(`${unit} updated to ${newValue}`);
          }
        } catch (error) {
          // If animation fails, just update the text
          element.textContent = newValue;
        }
      } else {
        // No change, just update text
        element.textContent = newValue;
      }
    }
    
    /**
     * Update progress display
     * @param {number} progressPercentage - Progress percentage (0-100)
     */
    updateProgressDisplay(progressPercentage) {
      try {
        // Ensure valid percentage
        const percentage = Math.min(100, Math.max(0, progressPercentage));
        
        // Update progress bar if it exists
        if (this.elements && this.elements.progressBar) {
          this.elements.progressBar.style.width = `${percentage}%`;
        }
        
        // Update percentage text if it exists
        if (this.elements && this.elements.progressPercent) {
          this.elements.progressPercent.textContent = `${Math.round(percentage)}%`;
        }
        
        // Update seek bar if elements exist
        if (this.elements && this.elements.seekBar) {
          this.updateSeekBar(percentage);
        }
      } catch (error) {
        this.error('Error updating progress display:', error);
        // Continue execution without breaking the app
      }
    }
    
    /**
     * Update the seek bar position and fill based on progress percentage
     * @param {number} percentage - Progress percentage (0-100)
     */
    updateSeekBar(percentage) {
      try {
        // Guard clause: Check if seek bar elements exist
        if (!this.elements || !this.elements.seekBar) {
          return;
        }

        // Update seek bar fill width if it exists
        if (this.elements.seekBarFill) {
          this.elements.seekBarFill.style.width = `${percentage}%`;
        }
        
        // Update seek bar handle position if it exists
        if (this.elements.seekBarHandle) {
          this.elements.seekBarHandle.style.left = `${percentage}%`;
        }
        
        // Add a data attribute for current progress
        this.elements.seekBar.setAttribute('data-progress', percentage.toFixed(2));
        
        // Update the color based on the timer type and progress if the fill element exists
        if (this.elements.seekBarFill) {
          this.updateSeekBarColor(percentage);
        }
      } catch (error) {
        // Log the error but don't throw - this is a non-critical feature
        this.error('Error updating seek bar:', error);
      }
    }
    
    /**
     * Update the seek bar color based on timer type and progress
     * @param {number} percentage - Progress percentage (0-100)
     */
    updateSeekBarColor(percentage) {
      try {
        if (!this.elements || !this.elements.seekBarFill) {
          return;
        }
        
        let color;
        
        switch (this.state.currentTimerType) {
          case 'life':
            // Gradient from green to red as life progresses
            color = this.getGradientColor(percentage, [46, 204, 113], [231, 76, 60]);
            break;
            
          case 'birthday':
            // Gradient from blue to purple as birthday approaches
            color = this.getGradientColor(percentage, [52, 152, 219], [155, 89, 182]);
            break;
            
          case 'daily':
          default:
            // Gradient from orange to deep blue as day progresses
            color = this.getGradientColor(percentage, [241, 196, 15], [41, 128, 185]);
            break;
        }
        
        this.elements.seekBarFill.style.backgroundColor = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
      } catch (error) {
        // Log the error but don't throw
        this.error('Error updating seek bar color:', error);
      }
    }
    
    /**
     * Calculate a gradient color between two RGB colors based on percentage
     * @param {number} percentage - Progress percentage (0-100)
     * @param {number[]} startColor - Start RGB color [r, g, b]
     * @param {number[]} endColor - End RGB color [r, g, b]
     * @returns {number[]} Resulting RGB color [r, g, b]
     */
    getGradientColor(percentage, startColor, endColor) {
      // Convert percentage to factor (0-1)
      const factor = percentage / 100;
      
      // Calculate resulting RGB values
      const r = Math.round(startColor[0] + factor * (endColor[0] - startColor[0]));
      const g = Math.round(startColor[1] + factor * (endColor[1] - startColor[1]));
      const b = Math.round(startColor[2] + factor * (endColor[2] - startColor[2]));
      
      return [r, g, b];
    }
    
    /**
     * Set up interactive seek bar
     * Allows users to click on the seek bar to see what the timer would be at that point
     */
    setupSeekBarInteraction() {
      try {
        if (!this.elements || !this.elements.seekBar) {
          this.log('Seek bar element not found, skipping interaction setup');
          return;
        }
        
        // Store reference to this for use in event handlers
        const self = this;
        const seekBar = this.elements.seekBar;
        
        // Click on seek bar
        seekBar.addEventListener('click', function(event) {
          try {
            // Calculate click position percentage
            const rect = this.getBoundingClientRect();
            const clickX = event.clientX - rect.left;
            const percentage = (clickX / rect.width) * 100;
            
            // Show preview of timer at that position
            self.showSeekBarPreview(percentage);
          } catch (error) {
            console.error('[TimerApp] Error in seekBar click handler:', error);
          }
        });
        
        // Add mousemove preview
        seekBar.addEventListener('mousemove', function(event) {
          try {
            // Calculate mouse position percentage
            const rect = this.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const percentage = (mouseX / rect.width) * 100;
            
            // Show preview handle position
            if (self.elements && self.elements.seekBarHandle) {
              self.elements.seekBarHandle.style.left = `${percentage}%`;
              self.elements.seekBarHandle.style.opacity = '1';
            }
            
            // Add hover class for styling
            this.classList.add('hover');
            
            // Show tooltip with time preview
            self.showSeekTooltip(percentage, event);
            
            // Show subtle visual preview - use the element directly
            this.setAttribute('data-hover-progress', percentage.toFixed(2));
          } catch (error) {
            console.error('[TimerApp] Error in seekBar mousemove handler:', error);
          }
        });
        
        // Add mouseout reset
        seekBar.addEventListener('mouseout', function() {
          try {
            // Reset handle position
            if (self.elements && self.elements.seekBarHandle && self.elements.seekBar) {
              const currentProgress = parseFloat(self.elements.seekBar.getAttribute('data-progress') || '0');
              self.elements.seekBarHandle.style.left = `${currentProgress}%`;
              self.elements.seekBarHandle.style.opacity = '';
            }
            
            // Remove hover class
            this.classList.remove('hover');
            
            // Hide tooltip
            self.hideSeekTooltip();
            
            // Remove visual preview - use the element directly
            this.removeAttribute('data-hover-progress');
          } catch (error) {
            console.error('[TimerApp] Error in seekBar mouseout handler:', error);
          }
        });
        
        this.log('Seek bar interaction setup completed');
      } catch (error) {
        this.error('Error setting up seek bar interaction:', error);
      }
    }
    
    /**
     * Show a preview of what the timer would be at a specific progress percentage
     * @param {number} percentage - Progress percentage (0-100)
     */
    showSeekBarPreview(percentage) {
      try {
        // Guard clause: Check if seek bar exists
        if (!this.elements || !this.elements.seekBar) {
          return;
        }
        
        // Create a temporary preview overlay
        const previewEl = document.createElement('div');
        previewEl.className = 'seek-preview';
        
        // Calculate preview text based on timer type and percentage
        let previewText;
        
        switch (this.state.currentTimerType) {
          case 'life':
            // Calculate what point in life this would be
            previewText = this.calculateLifePreview(percentage);
            break;
            
          case 'birthday':
            // Calculate where in the birthday countdown this would be
            previewText = this.calculateBirthdayPreview(percentage);
            break;
            
          case 'daily':
          default:
            // Calculate what time of day this would be
            previewText = this.calculateDailyPreview(percentage);
            break;
        }
        
        // Set preview text
        previewEl.textContent = previewText;
        
        // Add to body
        document.body.appendChild(previewEl);
        
        // Position near cursor (will need to be adjusted based on UI)
        const seekRect = this.elements.seekBar.getBoundingClientRect();
        previewEl.style.top = `${seekRect.bottom + 10}px`;
        previewEl.style.left = `${seekRect.left + (seekRect.width * percentage / 100)}px`;
        
        // Remove after delay
        setTimeout(() => {
          if (document.body.contains(previewEl)) {
            document.body.removeChild(previewEl);
          }
        }, 3000);
      } catch (error) {
        this.error('Error showing seek bar preview:', error);
        // Continue execution without breaking the app
      }
    }
    
    /**
     * Calculate life preview text based on percentage
     * @param {number} percentage - Progress percentage (0-100)
     * @returns {string} Preview text
     */
    calculateLifePreview(percentage) {
      try {
        if (!this.state.settings || !this.state.settings[window.StorageKeys.BIRTH_DATE]) {
          return 'Set your birth date in settings';
        }
        
        const birthDate = new Date(this.state.settings[window.StorageKeys.BIRTH_DATE]);
        const lifeExpectancy = this.state.settings[window.StorageKeys.LIFE_EXPECTANCY] || 80;
        
        // Validate birth date
        if (isNaN(birthDate.getTime())) {
          return 'Invalid birth date. Please update your settings.';
        }
        
        // Calculate age at this percentage
        const totalLifeSpanMs = lifeExpectancy * 365.25 * 24 * 60 * 60 * 1000;
        const elapsedMs = totalLifeSpanMs * (percentage / 100);
        
        // Add to birth date to get the preview date
        const previewDate = new Date(birthDate.getTime() + elapsedMs);
        const ageYears = previewDate.getFullYear() - birthDate.getFullYear();
        
        return `At age ${ageYears} (${previewDate.toLocaleDateString()})`;
      } catch (error) {
        this.error('Error calculating life preview:', error);
        return 'Error calculating preview';
      }
    }
    
    /**
     * Calculate birthday preview text based on percentage
     * @param {number} percentage - Progress percentage (0-100)
     * @returns {string} Preview text
     */
    calculateBirthdayPreview(percentage) {
      try {
        if (!this.state.settings || !this.state.settings[window.StorageKeys.BIRTH_DATE]) {
          return 'Set your birth date in settings';
        }
        
        const now = new Date();
        const birthDate = new Date(this.state.settings[window.StorageKeys.BIRTH_DATE]);
        
        // Validate birth date
        if (isNaN(birthDate.getTime())) {
          return 'Invalid birth date. Please update your settings.';
        }
        
        // Calculate next birthday
        const nextBirthday = new Date(now.getFullYear(), birthDate.getMonth(), birthDate.getDate());
        if (nextBirthday < now) {
          nextBirthday.setFullYear(now.getFullYear() + 1);
        }
        
        // Calculate total duration and elapsed time
        const totalDurationMs = nextBirthday.getTime() - now.getTime();
        const remainingMs = totalDurationMs * (1 - percentage / 100);
        
        // Handle potential negative values
        if (remainingMs < 0) {
          return 'Birthday has passed';
        }
        
        // Calculate preview date
        const previewDate = new Date(nextBirthday.getTime() - remainingMs);
        
        // Calculate days until birthday
        const daysUntil = Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));
        
        return `${daysUntil} days until birthday (${previewDate.toLocaleDateString()})`;
      } catch (error) {
        this.error('Error calculating birthday preview:', error);
        return 'Error calculating preview';
      }
    }
    
    /**
     * Calculate daily preview text based on percentage
     * @param {number} percentage - Progress percentage (0-100)
     * @returns {string} Preview text
     */
    calculateDailyPreview(percentage) {
      try {
        const now = new Date();
        
        // Calculate midnight
        const midnight = new Date(now);
        midnight.setHours(24, 0, 0, 0);
        
        // Calculate reversed percentage (since we want time remaining)
        const reversePercentage = 100 - percentage;
        
        // Validate percentage range to avoid calculation errors
        if (reversePercentage < 0 || reversePercentage > 100) {
          return 'Invalid time calculation';
        }
        
        // Calculate seconds in day
        const secondsInDay = 24 * 60 * 60;
        const secondsRemaining = Math.max(0, (secondsInDay * reversePercentage) / 100);
        
        // Calculate hours, minutes, seconds
        const hours = Math.floor(secondsRemaining / 3600);
        const minutes = Math.floor((secondsRemaining % 3600) / 60);
        const seconds = Math.floor(secondsRemaining % 60);
        
        // Format values properly
        const hoursStr = hours.toString().padStart(2, '0');
        const minutesStr = minutes.toString().padStart(2, '0');
        const secondsStr = seconds.toString().padStart(2, '0');
        
        // Calculate time of day
        const timeOfDay = new Date();
        timeOfDay.setHours(
          Math.min(23, Math.floor(percentage * 24 / 100)), 
            Math.min(59, Math.floor((percentage * 24 % 1) * 60)), 
            0, 0
        );
        
        return `${hoursStr}:${minutesStr}:${secondsStr} remaining (${timeOfDay.toLocaleTimeString()})`;
      } catch (error) {
        this.error('Error calculating daily preview:', error);
        return 'Error calculating preview';
      }
    }
    
    /**
     * Show a tooltip with time preview at the specified percentage
     * @param {number} percentage - Progress percentage (0-100)
     * @param {MouseEvent} event - Mouse event
     */
    showSeekTooltip(percentage, event) {
      try {
        if (!this.elements) {
          console.log('[TimerApp] Cannot show seek tooltip - elements not initialized');
          return;
        }
        
        // Create tooltip if it doesn't exist
        let tooltip = document.getElementById('seek-tooltip');
        if (!tooltip) {
          tooltip = document.createElement('div');
          tooltip.id = 'seek-tooltip';
          tooltip.className = 'seek-tooltip';
          document.body.appendChild(tooltip);
        }
        
        // Calculate preview text based on timer type and percentage
        let previewText;
        const timerType = this.state?.currentTimerType || 'daily';
        
        switch (timerType) {
          case 'life':
            previewText = this.calculateLifePreview(percentage);
            break;
            
          case 'birthday':
            previewText = this.calculateBirthdayPreview(percentage);
            break;
            
          case 'daily':
          default:
            previewText = this.calculateDailyPreview(percentage);
            break;
        }
        
        // Update tooltip content
        tooltip.textContent = previewText;
        
        // Position tooltip near cursor
        if (this.elements.seekBar) {
          const seekRect = this.elements.seekBar.getBoundingClientRect();
          tooltip.style.top = `${seekRect.top - 35}px`;
          tooltip.style.left = `${event.clientX}px`;
        } else {
          // Fallback positioning if seekBar is not available
          tooltip.style.top = `${event.clientY - 35}px`;
          tooltip.style.left = `${event.clientX}px`;
        }
        
        // Show tooltip
        tooltip.classList.add('visible');
      } catch (error) {
        console.error('[TimerApp] Error showing seek tooltip:', error);
      }
    }
    
    /**
     * Hide the seek tooltip
     */
    hideSeekTooltip() {
      try {
        const tooltip = document.getElementById('seek-tooltip');
        if (tooltip) {
          tooltip.classList.remove('visible');
        }
      } catch (error) {
        console.error('[TimerApp] Error hiding seek tooltip:', error);
      }
    }
    
    /**
     * Show error screen with message
     * @param {string} message - Error message to display
     */
    showErrorScreen(message) {
      try {
        // Log the error for debugging
        console.error(`[TimerApp] Error screen: ${message}`);
        
        // Safely get DOM elements
        const errorContainer = document.getElementById('error-container');
        const errorMessage = document.getElementById('error-message');
        
        if (errorContainer && errorMessage) {
          // Set error message text
          errorMessage.textContent = message || 'An error occurred. Please try again.';
          
          // Show error container
          errorContainer.classList.remove('hidden');
          
          // Hide other containers
          const loadingOverlay = document.getElementById('loading-overlay');
          if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
          }
          
          const timerContainer = document.getElementById('timer-container');
          if (timerContainer) {
            timerContainer.classList.add('hidden');
          }
          
          this.log('Error screen shown with message:', message);
        } else {
          // Fallback if error elements don't exist
          console.error('Error elements not found in DOM, showing alert instead');
          alert(message || 'An error occurred. Please try again.');
        }
      } catch (error) {
        // Last resort error handling
        console.error('Critical error in error handling:', error);
        console.error('Original error message:', message);
        try {
          alert('Critical error: ' + message);
        } catch (e) {
          // Nothing more we can do at this point
        }
      }
    }
    
    /**
     * Get default timer data for error cases
     * @returns {Object} Default timer data
     * @private
     */
    _getDefaultTimerData() {
      // For fallback, show time until midnight
      const now = new Date();
      const hours = 23 - now.getHours();
      const minutes = 59 - now.getMinutes();
      const seconds = 59 - now.getSeconds();
      
      return {
        years: 0,
        months: 0,
        days: 0,
        hours: hours,
        minutes: minutes,
        seconds: seconds,
        progressPercentage: (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) / 86400 * 100,
        isPassed: false,
        message: 'Using fallback timer'
      };
    }
    
    /**
     * Log message to console
     * @param {string} message - Message to log
     * @param {any} [data] - Additional data to log
     */
    log(message, data) {
      try {
        // If config is not initialized or debug is not set, default to true for logging
        const debugEnabled = this.config?.debug !== undefined ? this.config.debug : true;
        
        if (debugEnabled) {
          if (data !== undefined) {
            console.log(`[TimerApp] ${message}`, data);
          } else {
            console.log(`[TimerApp] ${message}`);
          }
        }
      } catch (e) {
        // Last resort fallback - at least log something
        console.log(`[TimerApp Log Error] ${message}`, e);
      }
    }
    
    /**
     * Log error to console
     * @param {string} message - Error message
     * @param {Error} [error] - Error object
     */
    error(message, error) {
      try {
        if (error) {
          console.error(`[TimerApp] ERROR: ${message}`, error);
        } else {
          console.error(`[TimerApp] ERROR: ${message}`);
        }
      } catch (e) {
        // Last resort fallback
        console.error(`[TimerApp] Error logging failed`, e);
      }
    }

    /**
     * Handle setup form submission
     */
    async handleSetupFormSubmit() {
      try {
        this.log('Processing initial setup form submission');
        
        // Show loading indicator if available
        if (this.elements && this.elements.loadingOverlay) {
          this.elements.loadingOverlay.classList.remove('hidden');
        }
        
        // Extract form data from initial setup
        const timerType = document.querySelector('#setup-form input[name="timer-type"]:checked')?.value || this.config.defaultTimerType;
        const birthDate = document.getElementById('birthdate')?.value || null;
        const lifeExpectancy = parseInt(document.getElementById('life-expectancy')?.value || '80', 10);
        
        this.log('Setup form data:', { timerType, birthDate, lifeExpectancy });
        
        // Validate form data
        if ((timerType === 'birthday' || timerType === 'life') && !birthDate) {
          this.showErrorMessage('Please enter your birth date');
          
          // Hide loading overlay
          if (this.elements && this.elements.loadingOverlay) {
            this.elements.loadingOverlay.classList.add('hidden');
          }
          
          return;
        }
        
        // Validate birth date format
        if (birthDate) {
          const birthDateObj = new Date(birthDate);
          if (isNaN(birthDateObj.getTime())) {
            this.showErrorMessage('Please enter a valid birth date');
            
            // Hide loading overlay
            if (this.elements && this.elements.loadingOverlay) {
              this.elements.loadingOverlay.classList.add('hidden');
            }
            
            return;
          }
        }
        
        // Validate life expectancy range
        if (timerType === 'life') {
          if (isNaN(lifeExpectancy) || lifeExpectancy < 1 || lifeExpectancy > 150) {
            this.showErrorMessage('Please enter a valid life expectancy between 1 and 150 years');
            
            // Hide loading overlay
            if (this.elements && this.elements.loadingOverlay) {
              this.elements.loadingOverlay.classList.add('hidden');
            }
            
            return;
          }
        }
        
        // Check if storage manager is initialized
        if (!this.storage) {
          throw new Error('Storage manager not initialized');
        }
        
        // Save settings
        const settings = {
          [window.StorageKeys.TIMER_TYPE]: timerType,
          [window.StorageKeys.SETUP_COMPLETED]: true
        };
        
        if (birthDate) {
          settings[window.StorageKeys.BIRTH_DATE] = birthDate;
        }
        
        if (timerType === 'life') {
          settings[window.StorageKeys.LIFE_EXPECTANCY] = lifeExpectancy;
        }
        
        await this.storage.saveSettings(settings);
        this.log('Setup settings saved successfully');
        
        // Update local settings cache
        this.state.settings = { ...this.state.settings, ...settings };
        
        // Hide setup screen and show timer screen
        const setupScreen = document.getElementById('setup-screen');
        if (setupScreen) {
          setupScreen.classList.add('hidden');
        }
        
        // Update timer display
        await this.showTimerScreen(timerType);
        this.startTimer();
        
        // Hide loading overlay
        if (this.elements && this.elements.loadingOverlay) {
          this.elements.loadingOverlay.classList.add('hidden');
        }
        
        this.log('Setup completed successfully');
      } catch (error) {
        this.error('Error during setup:', error);
        
        // Hide loading overlay
        if (this.elements && this.elements.loadingOverlay) {
          this.elements.loadingOverlay.classList.add('hidden');
        }
        
        // Show user-friendly error
        this.showErrorMessage('Error saving setup settings. Please try again.');
      }
    }

    /**
     * Create a fallback storage manager when normal initialization fails
     * @returns {Object} Fallback storage manager
     */
    createFallbackStorage() {
      return {
        // Save settings to localStorage
        saveSettings: async (settings) => {
          try {
            for (const key in settings) {
              localStorage.setItem(key, JSON.stringify(settings[key]));
            }
            return true;
          } catch (error) {
            console.error('Fallback storage saveSettings error:', error);
            return false;
          }
        },
        
        // Get settings from localStorage
        getSettings: async () => {
          try {
            const settings = {};
            const keys = Object.values(window.StorageKeys || {
              TIMER_TYPE: 'timerType',
              BIRTH_DATE: 'birthDate',
              LIFE_EXPECTANCY: 'lifeExpectancy',
              SETUP_COMPLETED: 'setupCompleted'
            });
            
            keys.forEach(key => {
              const value = localStorage.getItem(key);
              if (value) {
                try {
                  settings[key] = JSON.parse(value);
                } catch {
                  settings[key] = value;
                }
              }
            });
            
            return settings;
          } catch (error) {
            console.error('Fallback storage getSettings error:', error);
            return null;
          }
        },
        
        // Save timer type to localStorage
        saveTimerType: async (timerType) => {
          try {
            localStorage.setItem(window.StorageKeys?.TIMER_TYPE || 'timerType', timerType);
            return true;
          } catch (error) {
            console.error('Fallback storage saveTimerType error:', error);
            return false;
          }
        },
        
        // Clear settings from localStorage
        clearSettings: async () => {
          try {
            const keys = Object.values(window.StorageKeys || {
              TIMER_TYPE: 'timerType',
              BIRTH_DATE: 'birthDate',
              LIFE_EXPECTANCY: 'lifeExpectancy',
              SETUP_COMPLETED: 'setupCompleted'
            });
            
            keys.forEach(key => {
              localStorage.removeItem(key);
            });
            
            return true;
          } catch (error) {
            console.error('Fallback storage clearSettings error:', error);
            throw error; // Re-throw to handle in the reset button handler
          }
        }
      };
    }
    
    /**
     * Create a fallback calculator when normal initialization fails
     * @returns {Object} Fallback timer calculator
     */
    createFallbackCalculator() {
      return {
        calculateLifeTimer: () => this._getDefaultTimerData(),
        calculateBirthdayTimer: () => this._getDefaultTimerData(),
        calculateDailyTimer: () => {
          // Calculate basic daily timer
          const now = new Date();
          const hours = 23 - now.getHours();
          const minutes = 59 - now.getMinutes();
          const seconds = 59 - now.getSeconds();
          const totalSeconds = 24 * 60 * 60;
          const secondsPassed = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
          
          return {
            years: 0,
            months: 0,
            days: 0,
            hours: hours,
            minutes: minutes,
            seconds: seconds,
            progressPercentage: (secondsPassed / totalSeconds) * 100,
            isPassed: false,
            message: 'Time remaining until midnight'
          };
        }
      };
    }
  }

  // Register the TimerApp class with the ModuleRegistry
  if (window.ModuleRegistry) {
    window.ModuleRegistry.register('TimerApp', TimerApp);
  }

  // Make TimerApp globally available (safely)
  if (typeof window !== 'undefined') {
    window.TimerApp = TimerApp;
  }

  // Initialize TimerApp when the document is ready
  document.addEventListener('DOMContentLoaded', () => {
    // Create app instance if newtab.js hasn't created one already
    if (!window.TIMER_INITIALIZED && !window.timerApp && !window.TIMER_RUNNING) {
      console.log('Auto-creating TimerApp instance from timerApp.js');
      try {
        window.timerApp = new TimerApp();
        window.timerApp.init().catch(err => {
          console.error('Auto-initialization error:', err);
        });
      } catch (error) {
        console.error('Failed to auto-create TimerApp instance:', error);
      }
    }
  });
})(); 