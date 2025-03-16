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
      // Initialize logging system first
      this.initLogging();
      
      this.log('Initializing TimerApp');
      
      // Configuration
      this.config = {
        defaultTimerType: 'daily',
        defaultUpdateFrequency: 1000, // Default update frequency in ms (1 second)
        backgroundUpdateFrequency: 10000, // Update frequency when tab is not visible (10 seconds)
        seekBarSnapThreshold: 0.05, // 5% threshold for seek bar snapping
        animationDuration: 300, // Default animation duration in ms
        minLifeExpectancy: 1,
        maxLifeExpectancy: 120,
        defaultLifeExpectancy: 80,
        errorRecoveryAttempts: 3, // Number of times to attempt recovery
        developmentMode: false, // Set to true for additional debug logging
        quoteUpdateInterval: { min: 40000, max: 60000 } // Random interval to update quotes (40-60 sec)
      };
      
      // Application state
      this.state = {
        isInitialized: false,
        isTimerRunning: false,
        timerWasRunning: false,
        isTabVisible: document.visibilityState === 'visible',
        currentTimerType: this.config.defaultTimerType,
        lastProgress: 0,
        previousValues: {},
        currentValues: {},
        updateFrequency: this.config.defaultUpdateFrequency,
        recoveryAttempts: 0,
        settings: {},
        quoteUpdateTimeoutId: null
      };
      
      // Setup event bindings
      this._animationFrameId = null;
      this._lastTimestamp = 0;
      
      // Initialize elements as an empty object early to prevent undefined access
      this.elements = {};
      
      // Initialize storage - use StorageManager directly instead of trying to call initializeStorage
      try {
        if (window.StorageManager) {
          this.storage = new StorageManager();
          this.log('Storage manager initialized successfully');
        } else {
          this.log('StorageManager not available, creating fallback storage');
          this.storage = this.createFallbackStorage();
        }
      } catch (storageError) {
        this.error('Error initializing storage manager', storageError);
        // Create a fallback storage manager that uses localStorage
        this.storage = this.createFallbackStorage();
      }
      
      // Dependencies
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
     * Initialize logging system
     * Creates a structured logging system with different severity levels
     */
    initLogging() {
      try {
        // Define log levels
        this.LOG_LEVELS = {
          DEBUG: 0,
          INFO: 1,
          WARN: 2,
          ERROR: 3,
          NONE: 4
        };
        
        // Set current log level (can be adjusted based on environment)
        this.currentLogLevel = this.LOG_LEVELS.INFO;
        
        // Initialize error storage
        this.errorLog = [];
        this.maxErrorLogSize = 50; // Limit number of stored errors
        
        // Determine if we're in development mode (safely check without using process.env)
        this.isDev = (typeof chrome === 'undefined' || !chrome?.runtime?.id);
        
        // Override console methods to add structured logging
        this.log = (message, ...args) => {
          if (this.currentLogLevel <= this.LOG_LEVELS.INFO) {
            console.log(`[INFO] ${message}`, ...args);
          }
          
          // In dev mode, we always log to help with debugging
          if (this.isDev && this.currentLogLevel > this.LOG_LEVELS.INFO) {
            console.log(`[DEV-INFO] ${message}`, ...args);
          }
        };
        
        this.debug = (message, ...args) => {
          if (this.currentLogLevel <= this.LOG_LEVELS.DEBUG) {
            console.debug(`[DEBUG] ${message}`, ...args);
          }
        };
        
        this.warn = (message, ...args) => {
          if (this.currentLogLevel <= this.LOG_LEVELS.WARN) {
            console.warn(`[WARN] ${message}`, ...args);
          }
        };
        
        this.error = (message, error, ...args) => {
          if (this.currentLogLevel <= this.LOG_LEVELS.ERROR) {
            console.error(`[ERROR] ${message}`, error, ...args);
          }
          
          // Store error for potential reporting
          this.storeError(message, error, args);
        };
        
        console.log('[TimerApp] Logging system initialized');
      } catch (e) {
        // Fallback if logging setup fails
        console.error('[TimerApp] Error initializing logging system:', e);
        
        // Set up minimal logging functions to prevent further errors
        this.log = console.log.bind(console, '[TimerApp]');
        this.debug = console.debug.bind(console, '[TimerApp]');
        this.warn = console.warn.bind(console, '[TimerApp]');
        this.error = console.error.bind(console, '[TimerApp]');
      }
    }
    
    /**
     * Store error information for potential reporting
     * @param {string} message - Error message
     * @param {Error} error - Error object
     * @param {Array} args - Additional arguments
     */
    storeError(message, error, args = []) {
      try {
        // Create error entry with timestamp and stack
        const errorEntry = {
          timestamp: new Date().toISOString(),
          message: message,
          error: error ? {
            name: error.name,
            message: error.message,
            stack: error.stack
          } : null,
          additionalInfo: args,
          userAgent: navigator.userAgent,
          url: window.location.href
        };
        
        // Add to error log
        this.errorLog.unshift(errorEntry);
        
        // Trim log if it exceeds maximum size
        if (this.errorLog.length > this.maxErrorLogSize) {
          this.errorLog = this.errorLog.slice(0, this.maxErrorLogSize);
        }
        
        // Store errors in local storage for potential reporting
        try {
          localStorage.setItem('timerErrorLog', JSON.stringify(this.errorLog));
        } catch (e) {
          // If storing fails (e.g., quota exceeded), just log the issue
          console.warn('Failed to store error log', e);
        }
      } catch (storeError) {
        // Last resort logging if error storage itself fails
        console.error('Failed to process error', storeError);
      }
    }
    
    /**
     * Initialize the timer application
     * @param {string} [initialTimerType] - Initial timer type
     * @param {Object} [initialSettings] - Initial settings
     * @returns {Promise} Promise that resolves when initialization is complete
     */
    async init(initialTimerType, initialSettings) {
      try {
        this.log('Initializing timer application...');
        
        // Ensure StorageKeys is defined
        if (!window.StorageKeys) {
          this.warn('StorageKeys not defined, creating defaults');
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
        
        // Step 3: Load settings (storage already initialized in constructor)
        if (!this.storage) {
          this.error('Storage not initialized', new Error('Storage initialization failed'));
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
        
        // Step 7: Run diagnostics
        await this._runDiagnostics();
        
        // Step 8: Show the timer screen
        try {
          await this.showTimerScreen(timerType);
        } catch (screenError) {
          this.error('Error showing timer screen', screenError);
          // Try using the default timer type if showing the selected type fails
          if (timerType !== this.config.defaultTimerType) {
            await this.showTimerScreen(this.config.defaultTimerType);
          }
        }
        
        // Step 9: Start the timer
        this.startTimer();
        
        // Step 10: Hide loading overlay once everything is ready
        if (loadingOverlay) {
          loadingOverlay.classList.add('hidden');
        }
        
        // Step 11: Show timer container
        const timerContainer = document.getElementById('timer-container');
        if (timerContainer) {
          timerContainer.classList.remove('hidden');
        }
        
        // Mark as initialized
        this.state.isInitialized = true;
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
     * Run diagnostic checks to ensure the environment is ready
     * @private
     */
    async _runDiagnostics() {
      try {
        this.log('Running diagnostic checks');
        
        // Check local storage access - make check more resilient
        try {
          // Use a unique key that won't conflict with actual settings
          const testKey = `timerApp_diagnostic_test_${Date.now()}`;
          localStorage.setItem(testKey, 'test');
          const testValue = localStorage.getItem(testKey);
          localStorage.removeItem(testKey);
          
          if (testValue !== 'test') {
            this.warn('LocalStorage read/write test failed, but continuing');
          } else {
            this.log('LocalStorage test successful');
          }
        } catch (storageError) {
          // Don't fail completely, just log the issue
          this.warn('LocalStorage access limited - extension may have reduced functionality', storageError);
        }
        
        // Check DOM access - softened check
        if (typeof document === 'undefined') {
          this.warn('Document object is not available - limited functionality');
        }
        
        // Check for critical DOM elements - made more resilient
        const criticalElements = ['timer-screen', 'error-screen'];
        const missingElements = criticalElements.filter(id => !document.getElementById(id));
        
        if (missingElements.length > 0) {
          this.warn('Some UI elements are missing, interface may be limited', missingElements);
          // Create missing elements if needed
          this._createMissingElements(missingElements);
        }
        
        // Performance check with defensive coding
        try {
          if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
            const perfStart = performance.now();
            let sum = 0;
            for (let i = 0; i < 5000; i++) { // Reduced iteration count
              sum += i;
            }
            const perfEnd = performance.now();
            
            // Only warn if performance is significantly degraded
            if (perfEnd - perfStart > 200) { // Increased threshold
              this.warn('Performance check indicates potential issues', { 
                duration: perfEnd - perfStart,
                threshold: 200
              });
            }
          } else {
            // Just log, don't treat as critical
            this.log('Performance API not available, skipping performance check');
          }
        } catch (perfError) {
          this.log('Performance check skipped due to error', perfError);
        }
        
        this.log('Diagnostic checks completed');
        return true; // Always return true to continue initialization
      } catch (error) {
        // Don't fail initialization due to diagnostic errors
        this.error('Diagnostic checks had errors, continuing anyway', error);
        return true;
      }
    }
    
    /**
     * Create missing critical elements when needed
     * @private
     * @param {string[]} missingElements - Array of missing element IDs
     */
    _createMissingElements(missingElements) {
      try {
        for (const id of missingElements) {
          this.log(`Creating missing element: ${id}`);
          
          const element = document.createElement('div');
          element.id = id;
          
          // Apply appropriate styles based on element type
          if (id === 'timer-screen') {
            element.className = 'screen';
            element.innerHTML = `
              <div class="timer-container">
                <h1 class="timer-title">Timer</h1>
                <div class="timer-values">
                  <div class="timer-value-group">
                    <div class="timer-value" id="hours-value">00</div>
                    <div class="timer-label">Hours</div>
                  </div>
                  <div class="timer-separator">:</div>
                  <div class="timer-value-group">
                    <div class="timer-value" id="minutes-value">00</div>
                    <div class="timer-label">Minutes</div>
                  </div>
                  <div class="timer-separator">:</div>
                  <div class="timer-value-group">
                    <div class="timer-value" id="seconds-value">00</div>
                    <div class="timer-label">Seconds</div>
                  </div>
                </div>
                <div class="progress-container">
                  <div class="progress-bar" id="progress-bar"></div>
                </div>
                <div class="timer-controls">
                  <button id="settings-button" class="settings-button">Settings</button>
                </div>
              </div>
            `;
          } else if (id === 'error-screen') {
            element.className = 'screen hidden';
            element.innerHTML = `
              <div class="error-container">
                <h2>Something went wrong</h2>
                <p id="error-message">An error occurred while loading the timer.</p>
                <div class="error-actions">
                  <button id="retry-button">Retry</button>
                  <button id="reset-button">Reset Settings</button>
                </div>
              </div>
            `;
          }
          
          document.body.appendChild(element);
        }
      } catch (error) {
        this.error('Failed to create missing elements', error);
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
        this.log('Setting up event listeners');
        
        // Track whether event listeners are already attached to prevent duplicates
        if (this._eventListenersAttached) {
          this.log('Event listeners already attached, skipping setup');
          return;
        }
        
        // Settings button click - use direct DOM access for reliability
        const settingsButton = document.getElementById('settings-button');
        if (settingsButton) {
          // Remove any existing event listeners first
          const oldClone = settingsButton.cloneNode(true);
          if (settingsButton.parentNode) {
            settingsButton.parentNode.replaceChild(oldClone, settingsButton);
          }
          
          // Add fresh event listener
          oldClone.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.log('Settings button clicked');
            this.openSettings();
          });
          
          // Store updated reference
          this.elements.settingsButton = oldClone;
        } else {
          this.log('Settings button element not found');
        }
        
        // Close settings button
        const closeSettingsButton = document.getElementById('close-settings');
        if (closeSettingsButton) {
          closeSettingsButton.addEventListener('click', (e) => {
            e.preventDefault();
            this.log('Close settings button clicked');
            this.closeSettings();
          });
          this.elements.closeSettingsButton = closeSettingsButton;
        }
        
        // Cancel settings button
        const cancelSettingsButton = document.getElementById('cancel-settings-btn');
        if (cancelSettingsButton) {
          cancelSettingsButton.addEventListener('click', (e) => {
            e.preventDefault();
            this.log('Cancel settings button clicked');
            this.closeSettings();
          });
          this.elements.cancelSettingsButton = cancelSettingsButton;
        }
        
        // Settings form submission
        const settingsForm = document.getElementById('settings-form');
        if (settingsForm) {
          settingsForm.addEventListener('submit', (event) => {
            event.preventDefault();
            this.handleSettingsFormSubmit();
          });
          this.elements.settingsForm = settingsForm;
        }
        
        // Initial setup form submission
        const setupForm = document.getElementById('setup-form');
        if (setupForm) {
          setupForm.addEventListener('submit', (event) => {
            event.preventDefault();
            this.handleSetupFormSubmit();
          });
          this.elements.setupForm = setupForm;
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
        
        // Keyboard shortcuts for settings
        document.addEventListener('keydown', (event) => {
          // ESC key to close settings
          if (event.key === 'Escape') {
            const settingsPopup = document.getElementById('settings-popup');
            if (settingsPopup && !settingsPopup.classList.contains('hidden')) {
              this.closeSettings();
            }
          }
          
          // 'S' key to open settings
          if ((event.key === 's' || event.key === 'S') && 
              !event.ctrlKey && !event.metaKey && !event.altKey) {
            const activeElement = document.activeElement;
            // Only trigger if not in an input/textarea
            if (!(activeElement instanceof HTMLInputElement || 
                activeElement instanceof HTMLTextAreaElement)) {
              this.openSettings();
            }
          }
        });
        
        // Set up the reset button event listener with a more robust approach
        this.setupResetButton();
        
        // Set up seek bar interaction if the element exists
        if (this.elements.seekBar) {
          this.setupSeekBarInteraction();
        } else {
          this.log('Seek bar element not found, skipping interaction setup');
        }
        
        // Mark that event listeners have been attached
        this._eventListenersAttached = true;
        
        this.log('Event listeners set up successfully');
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
     * Update settings form values based on current settings
     * @param {string} timerType - Timer type to select in form
     */
    updateSettingsForm(timerType) {
      try {
        this.log('Updating settings form with current values');
        
        // Default to daily timer if no type provided
        if (!timerType) {
          timerType = this.state?.currentTimerType || 'daily';
        }
        
        // Get radio buttons directly from DOM for reliability
        const dailyTimerOption = document.getElementById('daily-timer-option');
        const birthdayTimerOption = document.getElementById('birthday-timer-option');
        const lifeTimerOption = document.getElementById('life-timer-option');
        
        // Update timer type radio buttons
        if (dailyTimerOption && birthdayTimerOption && lifeTimerOption) {
          // Set checked property directly
          dailyTimerOption.checked = timerType === 'daily';
          birthdayTimerOption.checked = timerType === 'birthday';
          lifeTimerOption.checked = timerType === 'life';
          
          // Force checked attribute to ensure visuals match state
          if (timerType === 'daily') {
            dailyTimerOption.setAttribute('checked', 'checked');
            birthdayTimerOption.removeAttribute('checked');
            lifeTimerOption.removeAttribute('checked');
          } else if (timerType === 'birthday') {
            dailyTimerOption.removeAttribute('checked');
            birthdayTimerOption.setAttribute('checked', 'checked');
            lifeTimerOption.removeAttribute('checked');
          } else if (timerType === 'life') {
            dailyTimerOption.removeAttribute('checked');
            birthdayTimerOption.removeAttribute('checked');
            lifeTimerOption.setAttribute('checked', 'checked');
          }
          
          this.log(`Radio button set to: ${timerType}`);
        } else {
          this.log('Timer type radio buttons not found in settings form');
        }
        
        // Update birth date field - get directly from DOM
        const birthDateInput = document.getElementById('birth-date');
        const birthDateFromSettings = this.state?.settings?.[window.StorageKeys?.BIRTH_DATE];
        
        if (birthDateInput && birthDateFromSettings) {
          birthDateInput.value = birthDateFromSettings;
          this.log(`Birth date set to: ${birthDateFromSettings}`);
        } else if (birthDateInput) {
          // Clear input if no value in settings
          birthDateInput.value = '';
        }
        
        // Update life expectancy field - get directly from DOM
        const lifeExpectancyInput = document.getElementById('life-expectancy');
        const lifeExpectancyFromSettings = this.state?.settings?.[window.StorageKeys?.LIFE_EXPECTANCY];
        
        if (lifeExpectancyInput && lifeExpectancyFromSettings) {
          lifeExpectancyInput.value = lifeExpectancyFromSettings;
          this.log(`Life expectancy set to: ${lifeExpectancyFromSettings}`);
        } else if (lifeExpectancyInput) {
          // Set default if no value in settings
          lifeExpectancyInput.value = '80';
        }
        
        // Toggle field visibility based on timer type
        this.toggleSettingsFields(timerType);
        
        this.log('Settings form updated successfully');
      } catch (error) {
        this.error('Error updating settings form:', error);
        // Continue execution without breaking the app
        
        // Attempt to recover
        try {
          // Force toggle visibility based on timer type as a fallback
          const birthDateGroup = document.getElementById('birth-date-group');
          const lifeExpectancyGroup = document.getElementById('life-expectancy-group');
          
          if (birthDateGroup) {
            birthDateGroup.style.display = (timerType === 'birthday' || timerType === 'life') ? 'block' : 'none';
            birthDateGroup.classList.toggle('hidden', !(timerType === 'birthday' || timerType === 'life'));
          }
          
          if (lifeExpectancyGroup) {
            lifeExpectancyGroup.style.display = (timerType === 'life') ? 'block' : 'none';
            lifeExpectancyGroup.classList.toggle('hidden', timerType !== 'life');
          }
        } catch (fallbackError) {
          this.error('Failed to recover settings form update:', fallbackError);
        }
      }
    }
    
    /**
     * Toggle visibility of settings fields based on timer type
     * @param {string} timerType - Type of timer
     */
    toggleSettingsFields(timerType) {
      this.log(`Toggling settings fields for ${timerType}`);
      
      try {
        // Get elements directly from DOM for reliability
        const birthDateGroup = document.getElementById('birth-date-group');
        const lifeExpectancyGroup = document.getElementById('life-expectancy-group');
        
        // Show/hide birth date field
        if (birthDateGroup) {
          if (timerType === 'birthday' || timerType === 'life') {
            birthDateGroup.classList.remove('hidden');
            birthDateGroup.style.display = 'block'; // For redundancy
          } else {
            birthDateGroup.classList.add('hidden');
            birthDateGroup.style.display = 'none'; // For redundancy
          }
        }
        
        // Show/hide life expectancy field
        if (lifeExpectancyGroup) {
          if (timerType === 'life') {
            lifeExpectancyGroup.classList.remove('hidden');
            lifeExpectancyGroup.style.display = 'block'; // For redundancy
          } else {
            lifeExpectancyGroup.classList.add('hidden');
            lifeExpectancyGroup.style.display = 'none'; // For redundancy
          }
        }
        
        this.log(`Settings fields toggled for ${timerType}`);
      } catch (error) {
        this.error('Error toggling settings fields', error);
        
        // Try a more direct approach as fallback
        try {
          const birthDateGroup = document.getElementById('birth-date-group');
          const lifeExpectancyGroup = document.getElementById('life-expectancy-group');
          
          if (birthDateGroup) {
            // Toggle with both class and style for redundancy
            birthDateGroup.classList.toggle('hidden', !(timerType === 'birthday' || timerType === 'life'));
            birthDateGroup.style.display = (timerType === 'birthday' || timerType === 'life') ? 'block' : 'none';
          }
          
          if (lifeExpectancyGroup) {
            // Toggle with both class and style for redundancy
            lifeExpectancyGroup.classList.toggle('hidden', timerType !== 'life');
            lifeExpectancyGroup.style.display = (timerType === 'life') ? 'block' : 'none';
          }
        } catch (fallbackError) {
          this.error('Fallback for toggling settings fields failed', fallbackError);
        }
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
        
        // Extract form data from settings popup - get directly from DOM
        const timerTypeRadios = document.querySelectorAll('#settings-form input[name="timer-type"]');
        let timerType = this.config.defaultTimerType;
        
        for (const radio of timerTypeRadios) {
          if (radio.checked) {
            timerType = radio.value;
            break;
          }
        }
        
        const birthDateInput = document.getElementById('birth-date');
        const lifeExpectancyInput = document.getElementById('life-expectancy');
        
        const birthDate = birthDateInput?.value || null;
        const lifeExpectancy = parseInt(lifeExpectancyInput?.value || '80', 10);
        
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
        
        // Reset settings failure counter on success
        this._settingsFailureCounter = 0;
        
        this.log('Settings applied successfully');
      } catch (error) {
        this.error('Error saving settings:', error);
        
        // Hide loading indicator
        if (this.elements && this.elements.loadingOverlay) {
          this.elements.loadingOverlay.classList.add('hidden');
        }
        
        // Increment settings failure counter
        this._settingsFailureCounter = (this._settingsFailureCounter || 0) + 1;
        
        // If we've had multiple failures, try refreshing the settings interface
        if (this._settingsFailureCounter >= 2) {
          this.log('Multiple settings failures detected, refreshing interface');
          this.refreshSettingsInterface();
          this._settingsFailureCounter = 0;
          
          // Show user-friendly error with recovery message
          this.showErrorMessage('Settings interface has been refreshed due to errors. Please try again.');
        } else {
          // Show user-friendly error
          this.showErrorMessage('Error saving settings. Please try again.');
        }
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
        this.log('Opening settings popup');
        
        // Get settings popup directly in case elements reference is stale
        const settingsPopup = document.getElementById('settings-popup');
        if (!settingsPopup) {
          throw new Error('Settings popup element not found in DOM');
        }
        
        // Update form first with current settings
        this.updateSettingsForm(this.state.currentTimerType);
        
        // Ensure popup is visible
        settingsPopup.style.display = 'block';
        settingsPopup.classList.remove('hidden');
        
        // Cache the reference
        this.elements.settingsPopup = settingsPopup;
        
        // Add a semi-transparent overlay to prevent clicking underneath
        let overlay = document.getElementById('settings-overlay');
        if (!overlay) {
          overlay = document.createElement('div');
          overlay.id = 'settings-overlay';
          overlay.className = 'settings-overlay';
          overlay.style.position = 'fixed';
          overlay.style.top = '0';
          overlay.style.left = '0';
          overlay.style.width = '100%';
          overlay.style.height = '100%';
          overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
          overlay.style.zIndex = '999';
          document.body.appendChild(overlay);
          
          // Make clicking overlay close settings
          overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
              this.closeSettings();
            }
          });
        } else {
          overlay.style.display = 'block';
        }
        
        // Set popup z-index to be above overlay
        settingsPopup.style.zIndex = '1000';
        
        // Add click outside listener with a slight delay to prevent immediate closing
        setTimeout(() => {
          document.addEventListener('click', this.handleOutsideClick);
        }, 100);
        
        this.log('Settings popup opened successfully');
      } catch (error) {
        this.error('Error opening settings popup:', error);
        
        // As a fallback, try a direct approach
        try {
          const settingsPopup = document.getElementById('settings-popup');
          if (settingsPopup) {
            // Force visible with inline styles
            settingsPopup.style.display = 'block';
            settingsPopup.classList.remove('hidden');
            this.log('Settings opened with fallback method');
          } else {
            // Last resort error
            alert('Could not open settings. The settings popup element was not found.');
          }
        } catch (fallbackError) {
          this.error('Critical error opening settings:', fallbackError);
          alert('Could not open settings. Please try reloading the page.');
        }
      }
    }
    
    /**
     * Close settings popup
     */
    closeSettings() {
      try {
        this.log('Closing settings popup');
        
        // Get settings popup directly
        const settingsPopup = document.getElementById('settings-popup');
        if (settingsPopup) {
          // Hide with both methods for redundancy
          settingsPopup.classList.add('hidden');
          settingsPopup.style.display = 'none';
        }
        
        // Remove overlay if it exists
        const overlay = document.getElementById('settings-overlay');
        if (overlay) {
          overlay.style.display = 'none';
        }
        
        // Remove click outside listener
        document.removeEventListener('click', this.handleOutsideClick);
        
        this.log('Settings popup closed successfully');
      } catch (error) {
        this.error('Error closing settings popup:', error);
        
        // Try a more direct approach as fallback
        try {
          const settingsPopup = document.getElementById('settings-popup');
          if (settingsPopup) {
            // Force hide with inline styles
            settingsPopup.style.display = 'none';
            settingsPopup.classList.add('hidden');
            this.log('Settings closed with fallback method');
          }
          
          // Remove overlay
          const overlay = document.getElementById('settings-overlay');
          if (overlay) {
            overlay.style.display = 'none';
          }
          
          document.removeEventListener('click', this.handleOutsideClick);
        } catch (fallbackError) {
          this.error('Critical error closing settings:', fallbackError);
          // Nothing more we can do
        }
      }
    }
    
    /**
     * Handle click outside the settings popup
     * @param {MouseEvent} event - Click event
     */
    handleOutsideClick(event) {
      try {
        // Get elements directly to avoid stale references
        const settingsPopup = document.getElementById('settings-popup');
        const settingsButton = document.getElementById('settings-button');
        
        if (settingsPopup && 
            !settingsPopup.contains(event.target) && 
            event.target !== settingsButton) {
          // Call instance method via window.timerApp since this may be detached
          if (window.timerApp && typeof window.timerApp.closeSettings === 'function') {
            window.timerApp.closeSettings();
          } else {
            // Fallback: directly modify the popup
            settingsPopup.classList.add('hidden');
            settingsPopup.style.display = 'none';
            
            // Remove overlay
            const overlay = document.getElementById('settings-overlay');
            if (overlay) {
              overlay.style.display = 'none';
            }
            
            document.removeEventListener('click', this.handleOutsideClick);
          }
        }
      } catch (error) {
        console.error('[TimerApp] Error handling click outside settings:', error);
        // Fallback: try to close settings directly
        try {
          const settingsPopup = document.getElementById('settings-popup');
          if (settingsPopup) {
            settingsPopup.classList.add('hidden');
            settingsPopup.style.display = 'none';
          }
          
          // Remove overlay
          const overlay = document.getElementById('settings-overlay');
          if (overlay) {
            overlay.style.display = 'none';
          }
          
          document.removeEventListener('click', this.handleOutsideClick);
        } catch (e) {
          // Nothing more we can do
        }
      }
    }
    
    /**
     * Start the timer
     * Handles different timer types and initializes the animation frame
     */
    startTimer() {
      try {
        this.log(`Starting timer with type: ${this.state.currentTimerType}`);
        
        // Stop any existing timer first
        this.stopTimer();
        
        // Initialize timestamp for animation
        if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
          this._lastTimestamp = performance.now();
        } else {
          // Fallback to Date.now if performance API not available
          this._lastTimestamp = Date.now();
          this.warn('Performance API not available, using Date.now() as fallback');
        }
        
        // Use requestAnimationFrame for smoother updates if available
        if (typeof requestAnimationFrame === 'function') {
          this._animationFrameId = requestAnimationFrame(this._animationFrame.bind(this));
          this.log('Using requestAnimationFrame for timer updates');
        } else {
          // Fallback to setInterval
          this.state.timerInterval = setInterval(() => {
            this.updateTimer();
          }, this.config.defaultUpdateFrequency);
          this.log('Fallback to setInterval for timer updates');
        }
        
        // Perform initial update
        this.updateTimer();
        
        // Mark timer as running
        this.state.isTimerRunning = true;
        window.TIMER_RUNNING = true;
        
        this.log('Timer started successfully');
      } catch (error) {
        this.error('Failed to start timer', error);
        
        // Try to recover with fallback timer
        this.startFallbackTimer();
      }
    }
    
    /**
     * Animation frame update function
     * @param {number} timestamp - Current timestamp from requestAnimationFrame
     * @private
     */
    _animationFrame(timestamp) {
      try {
        // Safe guard for timestamp in case it's not provided
        if (timestamp === undefined || isNaN(timestamp)) {
          timestamp = typeof performance !== 'undefined' && 
                     typeof performance.now === 'function' ? 
                     performance.now() : Date.now();
        }
        
        // Calculate elapsed time
        const elapsed = timestamp - this._lastTimestamp;
        
        // Only update timer if enough time has passed
        if (elapsed >= this.config.defaultUpdateFrequency) {
          this.updateTimer();
          this._lastTimestamp = timestamp;
        }
        
        // Continue the animation loop if timer is running
        if (this.state.isTimerRunning) {
          this._animationFrameId = requestAnimationFrame(this._animationFrame.bind(this));
        }
      } catch (error) {
        this.error('Error in animation frame', error);
        
        // Fallback to interval timer if animation frame fails
        this.log('Falling back to interval timer');
        this.startFallbackTimer();
      }
    }
    
    /**
     * Stop the timer
     * @param {boolean} resetState - Whether to reset the timer state
     */
    stopTimer(resetState = true) {
      try {
        this.log('Stopping timer');
        
        // Cancel any existing animation frame
        if (this._animationFrameId) {
          cancelAnimationFrame(this._animationFrameId);
          this._animationFrameId = null;
        }
        
        // Clear any existing interval
        if (this.state.timerInterval) {
          clearInterval(this.state.timerInterval);
          this.state.timerInterval = null;
        }
        
        // Reset state if requested
        if (resetState) {
          this.state.isTimerRunning = false;
          window.TIMER_RUNNING = false;
        }
        
        this.log('Timer stopped successfully');
      } catch (error) {
        this.error('Error stopping timer', error);
      }
    }
    
    /**
     * Start a very basic fallback timer
     * Used when normal timer fails
     */
    startFallbackTimer() {
      try {
        this.log('Starting emergency fallback timer');
        
        // Stop any existing timers
        this.stopTimer(false);
        
        // Use setInterval for reliability
        this.state.timerInterval = setInterval(() => {
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
            
            // Directly update DOM elements - safer approach
            this.updateElementText('hours-value', hours);
            this.updateElementText('minutes-value', minutes);
            this.updateElementText('seconds-value', seconds);
            
            // Update progress bar and percentage
            this.updateElementStyle('progress-bar', 'width', `${progressPercentage}%`);
            this.updateElementText('progress-percent', `${Math.round(progressPercentage)}%`);
            
            // Update seek bar elements if they exist
            this.updateElementStyle('seek-bar-fill', 'width', `${progressPercentage}%`);
            this.updateElementStyle('seek-bar-handle', 'left', `${progressPercentage}%`);
            
            // Update timer title and description for clarity
            this.updateElementText('timer-title', 'Daily Countdown');
            this.updateElementText('timer-description', 'Time until midnight (fallback mode)');
            
          } catch (updateError) {
            this.error('Error in fallback timer update', updateError);
          }
        }, this.config.defaultUpdateFrequency || 1000);
        
        // Show timer containers if they're hidden
        const timerContainer = document.getElementById('timer-container');
        if (timerContainer) {
          timerContainer.classList.remove('hidden');
        }
        
        // Hide error container if visible
        const errorContainer = document.getElementById('error-container');
        if (errorContainer) {
          errorContainer.classList.add('hidden');
        }
        
        // Hide loading overlay if visible
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
          loadingOverlay.classList.add('hidden');
        }
        
        // Mark timer as running
        this.state.isTimerRunning = true;
        window.TIMER_RUNNING = true;
        
        this.log('Fallback timer started successfully');
        return true;
      } catch (error) {
        this.error('Critical error in fallback timer', error);
        
        // Show a simple alert as absolute last resort
        try {
          alert('Critical timer failure. Please reload the page.');
        } catch (e) {
          // Nothing more we can do
          console.error('Complete timer failure');
        }
        return false;
      }
    }
    
    /**
     * Helper function to safely update element text
     * @param {string} id - Element ID
     * @param {string} text - Text to set
     * @private
     */
    updateElementText(id, text) {
      try {
        const element = document.getElementById(id);
        if (element) {
          element.textContent = text;
        }
      } catch (error) {
        // Silent error - fail gracefully
      }
    }
    
    /**
     * Helper function to safely update element style
     * @param {string} id - Element ID
     * @param {string} property - CSS property
     * @param {string} value - CSS value
     * @private
     */
    updateElementStyle(id, property, value) {
      try {
        const element = document.getElementById(id);
        if (element && element.style) {
          element.style[property] = value;
        }
      } catch (error) {
        // Silent error - fail gracefully
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
    
    /**
     * Ensure the settings interface is properly initialized and responsive
     * This fixes issues where settings might become stale or unresponsive
     */
    ensureSettingsInterface() {
      try {
        this.log('Ensuring settings interface is responsive');
        
        // Get the settings popup
        const settingsPopup = document.getElementById('settings-popup');
        if (!settingsPopup) {
          this.error('Settings popup not found in DOM');
          return;
        }
        
        // Make sure it's initially hidden
        settingsPopup.classList.add('hidden');
        settingsPopup.style.display = 'none';
        
        // Clear any existing overlay
        const existingOverlay = document.getElementById('settings-overlay');
        if (existingOverlay) {
          existingOverlay.remove();
        }
        
        // Get all form elements
        const birthDateGroup = document.getElementById('birth-date-group');
        const lifeExpectancyGroup = document.getElementById('life-expectancy-group');
        const birthDateInput = document.getElementById('birth-date');
        const lifeExpectancyInput = document.getElementById('life-expectancy');
        
        // Ensure they are in the proper initial state
        if (birthDateGroup) {
          // Default to hidden until toggled by timer type
          birthDateGroup.classList.add('hidden');
          birthDateGroup.style.display = 'none';
          
          // Store reference
          this.elements.birthDateGroup = birthDateGroup;
        }
        
        if (lifeExpectancyGroup) {
          // Default to hidden until toggled by timer type
          lifeExpectancyGroup.classList.add('hidden');
          lifeExpectancyGroup.style.display = 'none';
          
          // Store reference
          this.elements.lifeExpectancyGroup = lifeExpectancyGroup;
        }
        
        if (birthDateInput) {
          // Clear any stale value
          birthDateInput.value = this.state?.settings?.[window.StorageKeys?.BIRTH_DATE] || '';
          
          // Store reference
          this.elements.birthDateInput = birthDateInput;
        }
        
        if (lifeExpectancyInput) {
          // Set default value
          lifeExpectancyInput.value = this.state?.settings?.[window.StorageKeys?.LIFE_EXPECTANCY] || '80';
          
          // Store reference
          this.elements.lifeExpectancyInput = lifeExpectancyInput;
        }
        
        // Get radio buttons
        const dailyTimerOption = document.getElementById('daily-timer-option');
        const birthdayTimerOption = document.getElementById('birthday-timer-option');
        const lifeTimerOption = document.getElementById('life-timer-option');
        
        // Reset all radio buttons
        if (dailyTimerOption) {
          dailyTimerOption.checked = this.state?.currentTimerType === 'daily';
          this.elements.dailyTimerOption = dailyTimerOption;
        }
        
        if (birthdayTimerOption) {
          birthdayTimerOption.checked = this.state?.currentTimerType === 'birthday';
          this.elements.birthdayTimerOption = birthdayTimerOption;
        }
        
        if (lifeTimerOption) {
          lifeTimerOption.checked = this.state?.currentTimerType === 'life';
          this.elements.lifeTimerOption = lifeTimerOption;
        }
        
        // Store popup in elements
        this.elements.settingsPopup = settingsPopup;
        
        this.log('Settings interface prepared successfully');
      } catch (error) {
        this.error('Error ensuring settings interface:', error);
        // Non-critical error, continue execution
      }
    }
    
    /**
     * Force a refresh of the settings interface if it becomes stale
     * Call this method if settings aren't working properly
     */
    refreshSettingsInterface() {
      try {
        this.log('Refreshing settings interface');
        
        // First close settings if open
        this.closeSettings();
        
        // Remove any stale event listeners by cloning and replacing elements
        const refreshElement = (id) => {
          const element = document.getElementById(id);
          if (element) {
            const clone = element.cloneNode(true);
            if (element.parentNode) {
              element.parentNode.replaceChild(clone, element);
            }
            return clone;
          }
          return null;
        };
        
        // Refresh critical settings elements
        const settingsButton = refreshElement('settings-button');
        const closeSettingsButton = refreshElement('close-settings');
        const cancelSettingsButton = refreshElement('cancel-settings-btn');
        const settingsForm = refreshElement('settings-form');
        
        // Update references
        if (settingsButton) {
          settingsButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.openSettings();
          });
          this.elements.settingsButton = settingsButton;
        }
        
        if (closeSettingsButton) {
          closeSettingsButton.addEventListener('click', (e) => {
            e.preventDefault();
            this.closeSettings();
          });
          this.elements.closeSettingsButton = closeSettingsButton;
        }
        
        if (cancelSettingsButton) {
          cancelSettingsButton.addEventListener('click', (e) => {
            e.preventDefault();
            this.closeSettings();
          });
          this.elements.cancelSettingsButton = cancelSettingsButton;
        }
        
        if (settingsForm) {
          settingsForm.addEventListener('submit', (event) => {
            event.preventDefault();
            this.handleSettingsFormSubmit();
          });
          this.elements.settingsForm = settingsForm;
        }
        
        // Re-initialize the settings interface
        this.ensureSettingsInterface();
        
        // Update form with current settings
        this.updateSettingsForm(this.state.currentTimerType);
        
        this.log('Settings interface successfully refreshed');
      } catch (error) {
        this.error('Error refreshing settings interface:', error);
        
        // Last resort: force DOM updates directly
        try {
          // Get settings popup directly
          const settingsPopup = document.getElementById('settings-popup');
          if (settingsPopup) {
            // Make sure it's initially hidden
            settingsPopup.classList.add('hidden');
            settingsPopup.style.display = 'none';
          }
          
          // Re-attach click handler to settings button
          const settingsButton = document.getElementById('settings-button');
          if (settingsButton) {
            settingsButton.onclick = () => this.openSettings();
          }
        } catch (e) {
          this.error('Fatal error refreshing settings:', e);
        }
      }
    }

    /**
     * Set up auto-refresh for settings to recover from errors
     * This adds a listener that monitors for errors and auto-recovers
     */
    setupSettingsAutoRecovery() {
      try {
        // Don't set up multiple listeners
        if (this._autoRecoverySetup) {
          return;
        }
        
        this.log('Setting up settings auto-recovery');
        
        // Add click handler to settings button with auto-recovery
        const settingsButton = document.getElementById('settings-button');
        
        if (settingsButton) {
          // Track clicks on settings button to detect when it's not working
          let lastSettingsClick = 0;
          let rapidClickCount = 0;
          
          const handleSettingsClick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const now = Date.now();
            
            // Check if this is a rapid click (within 2 seconds of previous)
            if (now - lastSettingsClick < 2000) {
              rapidClickCount++;
              
              // If user clicks 3+ times rapidly, settings might be broken
              if (rapidClickCount >= 3) {
                this.log('Rapid settings clicks detected, refreshing interface');
                
                // Reset counter
                rapidClickCount = 0;
                
                // Force refresh settings interface
                this.refreshSettingsInterface();
                
                // Then try to open settings again
                setTimeout(() => {
                  this.openSettings();
                }, 100);
                
                return;
              }
            } else {
              // Reset counter if not a rapid click
              rapidClickCount = 0;
            }
            
            // Update last click time
            lastSettingsClick = now;
            
            // Normal behavior - open settings
            this.openSettings();
          };
          
          // Remove existing listeners and add our auto-recovery one
          const newButton = settingsButton.cloneNode(true);
          if (settingsButton.parentNode) {
            settingsButton.parentNode.replaceChild(newButton, settingsButton);
          }
          
          newButton.addEventListener('click', handleSettingsClick);
          
          // Update reference
          this.elements.settingsButton = newButton;
        }
        
        // Create an interval to check and fix settings interface
        this._settingsCheckInterval = setInterval(() => {
          try {
            // Check for common broken state indicators
            const settingsPopup = document.getElementById('settings-popup');
            const settingsButton = document.getElementById('settings-button');
            
            if (!settingsPopup || !settingsButton) {
              return; // Elements don't exist yet, nothing to fix
            }
            
            // Cases that indicate broken settings:
            // 1. Settings popup not hidden but no visible overlay
            // 2. Stale event listeners (button doesn't respond)
            
            // Check if popup is shown but possibly broken
            if (!settingsPopup.classList.contains('hidden') && 
                settingsPopup.style.display !== 'none') {
              
              // Look for missing overlay
              const overlay = document.getElementById('settings-overlay');
              if (!overlay || overlay.style.display === 'none') {
                this.log('Detected broken settings state: popup visible but no overlay');
                
                // Force close and refresh
                this.closeSettings();
                this.refreshSettingsInterface();
              }
            }
          } catch (e) {
            // Silently handle errors in auto-recovery
            console.error('[TimerApp] Error in settings auto-recovery check:', e);
          }
        }, 5000); // Check every 5 seconds
        
        this._autoRecoverySetup = true;
        this.log('Settings auto-recovery set up successfully');
      } catch (error) {
        this.error('Failed to set up settings auto-recovery:', error);
      }
    }

    /**
     * Get localized message from messages.json
     * @param {string} key - The message key
     * @param {string[]} [substitutions] - Optional substitutions
     * @returns {string} - Localized message or key if not found
     */
    i18n(key, substitutions = []) {
      try {
        // Check if chrome.i18n is available
        if (chrome && chrome.i18n && chrome.i18n.getMessage) {
          return chrome.i18n.getMessage(key, substitutions);
        }
        
        // Fallback for development environment
        this.log(`i18n fallback for key: ${key}`);
        const messages = {
          appName: 'Life Countdown Timer',
          appDescription: 'A countdown timer to visualize the passage of time in different ways',
          dailyTimer: 'Daily Timer',
          birthdayTimer: 'Birthday Timer',
          lifeTimer: 'Life Timer',
          settings: 'Settings',
          resetSettings: 'Reset Settings',
          saveSettings: 'Save Settings',
          cancelSettings: 'Cancel',
          birthDate: 'Birth Date',
          lifeExpectancy: 'Life Expectancy (years)',
          errorMessage: 'Something went wrong',
          retryButton: 'Retry',
          timeRemaining: 'Time Remaining',
          dailyDescription: 'Time remaining until midnight',
          birthdayDescription: 'Time since your birth',
          lifeDescription: 'Estimated time remaining in your life'
        };
        
        return messages[key] || key;
      } catch (error) {
        this.error('Error getting i18n message', error);
        return key; // Return the key as fallback
      }
    }
  }

  // Register the TimerApp class with the ModuleRegistry
  if (window.ModuleRegistry) {
    window.ModuleRegistry.register('TimerApp', TimerApp);
    console.log('TimerApp registered with ModuleRegistry');
  } else {
    console.warn('ModuleRegistry not available, TimerApp will be directly accessible');
    // Make TimerApp available globally
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