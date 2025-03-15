/**
 * New Tab Page Script for Countdown Timer Extension
 * Handles the UI and logic for the new tab page
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Add this function to safely initialize DOM references
  function initializeDomReferences() {
    try {
      // Safely get references to DOM elements
      const elements = {
        setupScreen: document.getElementById('setup-screen'),
        timerScreen: document.getElementById('timer-screen'),
        setupForm: document.getElementById('setup-form'),
        birthDateInput: document.getElementById('birthdate'),
        lifeExpectancyInput: document.getElementById('life-expectancy'),
        birthDateContainer: document.getElementById('birthdate-container'),
        lifeExpectancyContainer: document.getElementById('life-expectancy-container'),
        settingsButton: document.getElementById('settings-button'),
        timerTitle: document.getElementById('timer-title'),
        timerDescription: document.getElementById('timer-description'),
        motivationQuote: document.getElementById('motivation-quote'),
        progressBar: document.getElementById('progress-bar'),
        progressBackground: document.getElementById('progress-background'),
        countdownMessage: document.getElementById('countdown-message'),
        messageText: document.getElementById('message-text'),
        loadingOverlay: document.getElementById('loading-overlay'),
        // Seek bar elements
        seekBarFill: document.getElementById('seek-bar-fill'),
        seekBarHandle: document.getElementById('seek-bar-handle'),
        // Time units
        yearsContainer: document.getElementById('years-container'),
        monthsContainer: document.getElementById('months-container'),
        daysContainer: document.getElementById('days-container'),
        hoursContainer: document.getElementById('hours-container'),
        minutesContainer: document.getElementById('minutes-container'),
        secondsContainer: document.getElementById('seconds-container'),
        // Values
        yearsValue: document.getElementById('years-value'),
        monthsValue: document.getElementById('months-value'),
        daysValue: document.getElementById('days-value'),
        hoursValue: document.getElementById('hours-value'),
        minutesValue: document.getElementById('minutes-value'),
        secondsValue: document.getElementById('seconds-value')
      };
      
      return elements;
    } catch (error) {
      console.error('Error initializing DOM references:', error);
      return {};
    }
  }

  // Initialize storage manager and timer calculator
  const storageManager = typeof StorageManager !== 'undefined' ? new StorageManager() : null;
  const timerCalculator = typeof TimerCalculator !== 'undefined' ? new TimerCalculator() : null;
  
  if (!storageManager) {
    console.error('StorageManager is not defined. Make sure storage.js is loaded correctly.');
  }
  
  if (!timerCalculator) {
    console.error('TimerCalculator is not defined. Make sure timerCalculations.js is loaded correctly.');
  }
  
  // Call this at the beginning of your DOMContentLoaded event
  const domElements = initializeDomReferences();
  
  // DOM Elements
  const setupScreen = domElements.setupScreen;
  const timerScreen = domElements.timerScreen;
  const setupForm = domElements.setupForm;
  const birthDateInput = domElements.birthDateInput;
  const lifeExpectancyInput = domElements.lifeExpectancyInput;
  const birthDateContainer = domElements.birthDateContainer;
  const lifeExpectancyContainer = domElements.lifeExpectancyContainer;
  const settingsButton = domElements.settingsButton;
  const timerTitle = domElements.timerTitle;
  const timerDescription = domElements.timerDescription;
  const motivationQuote = domElements.motivationQuote;
  const progressBar = domElements.progressBar;
  const progressBackground = domElements.progressBackground;
  const countdownMessage = domElements.countdownMessage;
  const messageText = domElements.messageText;
  const loadingOverlay = domElements.loadingOverlay;
  
  // Seek bar elements
  const seekBarFill = domElements.seekBarFill;
  const seekBarHandle = domElements.seekBarHandle;
  
  // Time display elements
  const yearsContainer = domElements.yearsContainer;
  const monthsContainer = domElements.monthsContainer;
  const daysContainer = domElements.daysContainer;
  const hoursContainer = domElements.hoursContainer;
  const minutesContainer = domElements.minutesContainer;
  const secondsContainer = domElements.secondsContainer;
  
  const yearsValue = domElements.yearsValue;
  const monthsValue = domElements.monthsValue;
  const daysValue = domElements.daysValue;
  const hoursValue = domElements.hoursValue;
  const minutesValue = domElements.minutesValue;
  const secondsValue = domElements.secondsValue;
  
  // Set current date as max date for birthdate input
  const today = new Date().toISOString().split('T')[0];
  birthDateInput.setAttribute('max', today);
  
  // Timer update interval ID
  let timerInterval = null;
  
  // To track previous values for digit animation
  let previousValues = {
    years: 0,
    months: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  };
  
  // Track if settings are currently loading
  let isSettingsLoading = false;
  
  // Anime.js animations references
  let countdownAnimation = null;
  let seekBarAnimation = null;
  
  // Motivational quotes by timer type
  const QUOTES = {
    'life': [
      "Life is not a matter of holding good cards, but of playing a poor hand well.",
      "The purpose of life is not to be happy. It is to be useful, to be honorable, to be compassionate.",
      "Time is the coin of your life. It is the only coin you have, and only you can determine how it will be spent.",
      "In the end, it's not the years in your life that count. It's the life in your years.",
      "Life is short, and it is up to you to make it sweet."
    ],
    'birthday': [
      "Birthdays are nature's way of telling us to eat more cake.",
      "Age is merely the number of years the world has been enjoying you.",
      "Today you are you, that is truer than true. There is no one alive who is youer than you.",
      "The more you praise and celebrate your life, the more there is in life to celebrate.",
      "Life is a journey that must be traveled no matter how bad the roads and accommodations."
    ],
    'daily': [
      "Today is the first day of the rest of your life.",
      "Make each day your masterpiece.",
      "The way to get started is to quit talking and begin doing.",
      "Don't count the days, make the days count.",
      "You don't have to be great to start, but you have to start to be great."
    ]
  };
  
  /**
   * Shows the loading overlay
   * @param {string} message - Optional message to display
   */
  function showLoading(message = 'Loading...') {
    if (loadingOverlay) {
      const messageElem = loadingOverlay.querySelector('p');
      if (messageElem) {
        messageElem.textContent = message;
      }
      
      loadingOverlay.classList.remove('hidden');
      document.body.classList.add('loading');
      
      // Apply slight blur to the background
      if (setupScreen) setupScreen.style.filter = 'blur(3px)';
      if (timerScreen) timerScreen.style.filter = 'blur(3px)';
    }
  }
  
  /**
   * Hides the loading overlay
   */
  function hideLoading() {
    if (loadingOverlay) {
      loadingOverlay.classList.add('hidden');
      document.body.classList.remove('loading');
      
      // Remove blur
      if (setupScreen) setupScreen.style.filter = '';
      if (timerScreen) timerScreen.style.filter = '';
    }
  }
  
  /**
   * Initialize the app
   */
  async function init() {
    try {
      console.log('Initializing app...');
      
      // First check if DOM elements exist
      if (!setupScreen || !timerScreen) {
        console.error('Critical DOM elements missing:', {
          setupScreen: !!setupScreen,
          timerScreen: !!timerScreen
        });
        throw new Error('DOM elements not found');
      }
      
      showLoading('Initializing timer...');
      
      // Check if anime.js is available and provide fallback
      const animeAvailable = typeof anime !== 'undefined';
      if (!animeAvailable) {
        console.warn('Anime.js not loaded, using fallback animations');
      }
      
      // Safe animation initialization
      if (animeAvailable) {
        try {
          anime({
            targets: '.countdown-container',
            opacity: [0, 1],
            translateY: [30, 0],
            easing: 'easeOutExpo',
            duration: 1200,
            autoplay: false
          });
        } catch (animError) {
          console.warn('Animation initialization failed:', animError);
          // Continue without animations
        }
      }
      
      // Add event listeners - do this early to ensure UI is responsive
      console.log('Setting up event listeners');
      setupEventListeners();
      
      // Check storage API availability
      const storageAvailable = typeof chrome !== 'undefined' && 
                               chrome.storage && 
                               chrome.storage.sync;
      
      if (!storageAvailable) {
        console.error('Chrome storage API unavailable');
        // Show setup screen as fallback
        handleStartupWithoutStorage();
        return;
      }
      
      let isSetupCompleted = false;
      try {
        isSetupCompleted = await storageManager.isSetupCompleted();
        console.log('Setup completed status:', isSetupCompleted);
      } catch (storageError) {
        console.error('Storage error:', storageError);
        // Continue with setup screen as fallback
      }
      
      if (isSetupCompleted) {
        try {
          console.log('Setup is completed, loading timer screen');
          await loadTimerScreen();
        } catch (timerError) {
          console.error('Error loading timer:', timerError);
          // Fall back to setup screen
          showSetupScreen();
        }
      } else {
        console.log('Setup not completed, showing setup screen');
        await showSetupScreen();
        
        // Ensure fields are properly shown/hidden based on selected timer type
        console.log('Toggling input fields visibility after showing setup screen');
        toggleInputsVisibility();
      }
      
      hideLoading();
    } catch (error) {
      console.error('Critical error initializing app:', error);
      // Fallback: Direct DOM manipulation to show setup form
      hideLoading();
      if (setupScreen && timerScreen) {
        setupScreen.classList.remove('hidden');
        timerScreen.classList.add('hidden');
        
        // Ensure input fields visibility
        console.log('Using safeToggleInputVisibility as fallback');
        safeToggleInputVisibility();
      }
    }
  }
  
  /**
   * Set up all event listeners
   */
  function setupEventListeners() {
    // Setup form submission
    if (setupForm) {
      setupForm.addEventListener('submit', handleSetupFormSubmit);
      console.log('Added submit event listener to setup form');
    } else {
      console.error('Setup form element not found');
    }
    
    // Timer type radio buttons change
    const timerTypeRadios = document.querySelectorAll('input[name="timer-type"]');
    if (timerTypeRadios.length > 0) {
      console.log('Found timer type radio buttons:', timerTypeRadios.length);
      timerTypeRadios.forEach(radio => {
        radio.addEventListener('change', () => {
          console.log('Timer type changed to:', radio.value);
          toggleInputsVisibility();
        });
      });
      
      // Force toggle on page load to ensure fields are correctly shown/hidden
      toggleInputsVisibility();
    } else {
      console.error('Timer type radio buttons not found');
    }
    
    // Settings button click
    if (settingsButton) {
      settingsButton.addEventListener('click', handleSettingsButtonClick);
    } else {
      console.error('Settings button not found');
    }
    
    // Listen for storage changes
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener(handleStorageChanges);
    } else {
      console.warn('Chrome storage API not available - storage change events will not work');
    }
  }
  
  /**
   * Handle settings button click with safeguards
   */
  function handleSettingsButtonClick() {
    if (isSettingsLoading) {
      console.log('Settings already loading, ignoring click');
      return;
    }
    
    isSettingsLoading = true;
    showLoading('Loading settings...');
    
    // Animate settings button
    anime({
      targets: settingsButton,
      rotate: 180,
      duration: 400,
      easing: 'easeInOutQuad'
    });
    
    // Add a small delay to ensure UI state is consistent
    setTimeout(() => {
      showSetupScreen()
        .then(() => {
          isSettingsLoading = false;
          hideLoading();
        })
        .catch(error => {
          console.error('Error showing setup screen:', error);
          isSettingsLoading = false;
          hideLoading();
          alert('Error loading settings. Please try again.');
        });
    }, 400);
  }
  
  /**
   * Handle changes to chrome storage
   * @param {Object} changes - The changes object
   * @param {string} areaName - The area in storage that changed
   */
  function handleStorageChanges(changes, areaName) {
    if (areaName === 'sync') {
      // If settings changed while timer is showing, update the timer
      if (!setupScreen.classList.contains('hidden') && timerScreen.classList.contains('hidden')) {
        return; // Don't update if on setup screen
      }
      
      // Check if relevant settings changed
      const relevantKeys = [
        StorageKeys.TIMER_TYPE,
        StorageKeys.BIRTH_DATE,
        StorageKeys.LIFE_EXPECTANCY,
        StorageKeys.SETUP_COMPLETED
      ];
      
      const hasRelevantChanges = relevantKeys.some(key => changes[key]);
      
      if (hasRelevantChanges) {
        // Reload timer with new settings
        storageManager.getSettings()
          .then(settings => {
            if (timerInterval) {
              clearInterval(timerInterval);
              timerInterval = null;
            }
            
            const timerType = settings[StorageKeys.TIMER_TYPE] || 'daily';
            updateTimerTitle(timerType);
            updateTimerDescription(timerType);
            displayRandomQuote(timerType);
            startTimerUpdates(timerType, settings);
          })
          .catch(error => {
            console.error('Error updating timer after storage change:', error);
          });
      }
    }
  }
  
  /**
   * Handle setup form submission
   * @param {Event} event - Form submit event
   */
  async function handleSetupFormSubmit(event) {
    event.preventDefault();
    
    try {
      console.log('Form submission started');
      
      // Validate that form element exists
      if (!setupForm) {
        console.error('Setup form element not found');
        alert('Form not found. Please reload the page.');
        return;
      }
      
      // Safely create FormData and get values with fallbacks
      const formData = new FormData(setupForm);
      
      // Get values directly from form elements as a backup method in case FormData fails
      let timerType = formData.get('timer-type');
      if (!timerType) {
        const checkedRadio = document.querySelector('input[name="timer-type"]:checked');
        timerType = checkedRadio ? checkedRadio.value : 'daily';
      }
      
      let birthDate = formData.get('birthdate');
      if (!birthDate && birthDateInput && birthDateInput.value) {
        birthDate = birthDateInput.value;
      }
      
      let lifeExpectancyStr = formData.get('life-expectancy');
      if (!lifeExpectancyStr && lifeExpectancyInput && lifeExpectancyInput.value) {
        lifeExpectancyStr = lifeExpectancyInput.value;
      }
      
      const lifeExpectancy = parseInt(lifeExpectancyStr, 10) || 80; // Default to 80 if parsing fails
      
      console.log('Form submitted with values:', {
        timerType,
        birthDate,
        lifeExpectancy
      });
      
      // Validate inputs with detailed error messages
      if ((timerType === 'life' || timerType === 'birthday') && !birthDate) {
        alert('Please enter your birth date');
        return;
      }
      
      if (timerType === 'life' && (isNaN(lifeExpectancy) || lifeExpectancy < 1)) {
        alert('Please enter a valid life expectancy (a positive number)');
        return;
      }
      
      // Show loading overlay immediately
      showLoading('Saving settings...');
      
      // Check if chrome.storage is available
      if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.sync) {
        console.warn('Chrome storage API not available, checking for storageManager fallback');
        if (!storageManager) {
          console.error('Storage manager not defined');
          alert('Failed to access storage. Please reload the page.');
          hideLoading();
          return;
        }
      }
      
      // Instead of animating, just hide the setup screen immediately
      console.log('Hiding setup screen');
      if (setupScreen) {
        setupScreen.classList.add('hidden');
        setupScreen.style.display = 'none';
        setupScreen.style.visibility = 'hidden';
      }
      
      // Save settings and load timer with minimal animation/delay
      try {
        console.log('Starting save settings and load timer');
        await saveSettingsAndLoadTimerDirect(timerType, birthDate, lifeExpectancy);
        console.log('Successfully switched to timer screen');
      } catch (error) {
        console.error('Error in saveSettingsAndLoadTimer:', error);
        
        // Show setup screen again
        if (setupScreen) {
          setupScreen.classList.remove('hidden');
          setupScreen.style.display = 'block';
          setupScreen.style.visibility = 'visible';
        }
        
        hideLoading();
        alert(error.message || 'Failed to save settings. Please try again.');
      }
    } catch (error) {
      console.error('Error processing form data:', error);
      hideLoading();
      
      // More specific error message
      if (error.name === 'InvalidStateError') {
        alert('Browser state error. Please reload the page and try again.');
      } else if (error.name === 'QuotaExceededError') {
        alert('Storage quota exceeded. Please clear some browser data and try again.');
      } else {
        alert('Failed to process form data. Please try again.');
      }
    }
  }
  
  /**
   * Direct variant of saveSettingsAndLoadTimer with minimal animations
   * Reduces chances of timing/animation issues
   */
  async function saveSettingsAndLoadTimerDirect(timerType, birthDate, lifeExpectancy) {
    try {
      console.log('Directly saving settings:', { timerType, birthDate, lifeExpectancy });
      
      // First save all settings in one batch if possible
      const settings = {
        [StorageKeys.TIMER_TYPE]: timerType
      };
      
      if (birthDate) {
        settings[StorageKeys.BIRTH_DATE] = birthDate;
      }
      
      if (lifeExpectancy) {
        settings[StorageKeys.LIFE_EXPECTANCY] = lifeExpectancy;
      }
      
      settings[StorageKeys.SETUP_COMPLETED] = true;
      
      try {
        // Try to save all at once
        await storageManager.saveSettings(settings);
        console.log('All settings saved in one batch');
      } catch (batchError) {
        console.warn('Batch save failed, falling back to individual saves', batchError);
        
        // Fall back to individual saves
        await storageManager.saveTimerType(timerType);
        console.log('Timer type saved successfully');
        
        if (birthDate) {
          await storageManager.saveBirthDate(birthDate);
          console.log('Birth date saved successfully');
        }
        
        if (lifeExpectancy) {
          await storageManager.saveLifeExpectancy(lifeExpectancy);
          console.log('Life expectancy saved successfully');
        }
        
        await storageManager.completeSetup();
        console.log('Setup completed successfully');
      }
      
      // Load timer screen with minimal delay
      console.log('Loading timer screen directly');
      await loadTimerScreen();
      console.log('Timer screen loaded successfully');
      
      // Show timer content with a slight delay to ensure DOM is ready
      setTimeout(() => {
        if (timerScreen) {
          // Double check that timer screen is visible
          timerScreen.classList.remove('hidden');
          timerScreen.style.display = 'block';
          timerScreen.style.visibility = 'visible';
          timerScreen.style.opacity = '1';
          
          const timerContainer = timerScreen.querySelector('.timer-container');
          if (timerContainer) {
            timerContainer.style.display = 'block';
            timerContainer.style.visibility = 'visible';
            timerContainer.style.opacity = '1';
          }
          
          console.log('Timer visibility ensured via timeout callback');
        }
        
        hideLoading();
      }, 300);
      
    } catch (error) {
      console.error('Error in saveSettingsAndLoadTimerDirect:', error);
      throw error;
    }
  }
  
  /**
   * Toggle visibility of inputs based on selected timer type
   */
  function toggleInputsVisibility() {
    try {
      const radioButton = document.querySelector('input[name="timer-type"]:checked');
      if (!radioButton) {
        console.error('No timer type radio button selected');
        return;
      }
      
      const selectedTimerType = radioButton.value;
      console.log('Toggling inputs visibility for timer type:', selectedTimerType);
      
      // Always show birthdate for Life and Birthday timers, hide for Daily
      if (birthDateContainer) {
        // For Daily timer, hide birthdate input
        const shouldShowBirthdate = selectedTimerType === 'life' || selectedTimerType === 'birthday';
        console.log('Birth date container should be shown:', shouldShowBirthdate);
        
        // Use multiple approaches to ensure proper visibility change
        birthDateContainer.classList.toggle('hidden', !shouldShowBirthdate);
        birthDateContainer.style.display = shouldShowBirthdate ? 'block' : 'none';
        
        if (birthDateInput) {
          birthDateInput.required = shouldShowBirthdate;
        } else {
          console.error('Birth date input element not found');
        }
      } else {
        console.error('Birth date container element not found');
      }
      
      // Only show life expectancy for Life timer
      if (lifeExpectancyContainer) {
        // Only Life timer needs life expectancy
        const shouldShowLifeExpectancy = selectedTimerType === 'life';
        console.log('Life expectancy container should be shown:', shouldShowLifeExpectancy);
        
        // Use multiple approaches to ensure proper visibility change
        lifeExpectancyContainer.classList.toggle('hidden', !shouldShowLifeExpectancy);
        lifeExpectancyContainer.style.display = shouldShowLifeExpectancy ? 'block' : 'none';
        
        if (lifeExpectancyInput) {
          lifeExpectancyInput.required = shouldShowLifeExpectancy;
        } else {
          console.error('Life expectancy input element not found');
        }
      } else {
        console.error('Life expectancy container element not found');
      }
      
      // Only animate if anime.js is available
      if (typeof anime !== 'undefined') {
        // Only animate if container is visible
        if ((selectedTimerType === 'life' || selectedTimerType === 'birthday') && 
            birthDateContainer && 
            !birthDateContainer.classList.contains('hidden')) {
          anime({
            targets: birthDateContainer,
            opacity: [0, 1],
            translateY: [10, 0],
            easing: 'easeOutQuad',
            duration: 300
          });
        }
        
        if (selectedTimerType === 'life' && 
            lifeExpectancyContainer && 
            !lifeExpectancyContainer.classList.contains('hidden')) {
          anime({
            targets: lifeExpectancyContainer,
            opacity: [0, 1],
            translateY: [10, 0],
            easing: 'easeOutQuad',
            duration: 300,
            delay: 100
          });
        }
      }
    } catch (error) {
      console.error('Error toggling inputs visibility:', error);
      // Direct fallback without animations
      safeFallbackToggle();
    }
  }
  
  function safeFallbackToggle() {
    try {
      const checkedRadio = document.querySelector('input[name="timer-type"]:checked');
      if (!checkedRadio) return;
      
      const timerType = checkedRadio.value;
      console.log('Fallback toggle for timer type:', timerType);
      
      if (birthDateContainer) {
        const shouldShow = timerType === 'life' || timerType === 'birthday';
        birthDateContainer.style.display = shouldShow ? 'block' : 'none';
        birthDateContainer.classList.toggle('hidden', !shouldShow);
        
        if (birthDateInput) {
          birthDateInput.required = shouldShow;
        }
      }
      
      if (lifeExpectancyContainer) {
        const shouldShow = timerType === 'life';
        lifeExpectancyContainer.style.display = shouldShow ? 'block' : 'none';
        lifeExpectancyContainer.classList.toggle('hidden', !shouldShow);
        
        if (lifeExpectancyInput) {
          lifeExpectancyInput.required = shouldShow;
        }
      }
    } catch (e) {
      console.error('Fallback toggle failed:', e);
    }
  }
  
  /**
   * Show the setup screen
   * @returns {Promise} - Resolves when setup screen is shown
   */
  async function showSetupScreen() {
    return new Promise((resolve, reject) => {
      try {
        console.log('Showing setup screen');
        
        // Clear any existing timer interval
        if (timerInterval) {
          clearInterval(timerInterval);
          timerInterval = null;
        }
        
        // If timer screen is visible, hide it directly
        if (!timerScreen.classList.contains('hidden')) {
          // Use direct style manipulation
          timerScreen.style.opacity = '0';
          timerScreen.style.transform = 'translateY(-20px)';
          
          // Wait a moment before switching screens
          setTimeout(async () => {
            try {
              timerScreen.classList.add('hidden');
              timerScreen.style.display = 'none';
              
              await loadSetupScreenContent();
              
              // Ensure proper input visibility based on selected timer type
              console.log('Toggling input fields visibility after loading setup screen content');
              toggleInputsVisibility();
              
              resolve();
            } catch (error) {
              console.error('Error loading setup screen content:', error);
              reject(error);
            }
          }, 300);
        } else {
          loadSetupScreenContent()
            .then(() => {
              // Ensure proper input visibility based on selected timer type
              console.log('Toggling input fields visibility after loading setup screen content');
              toggleInputsVisibility();
              
              resolve();
            })
            .catch(reject);
        }
      } catch (error) {
        console.error('Error in showSetupScreen:', error);
        reject(error);
      }
    });
  }
  
  /**
   * Load setup screen content
   * @returns {Promise} - Resolves when content is loaded
   */
  async function loadSetupScreenContent() {
    return new Promise(async (resolve, reject) => {
      try {
        console.log('Loading setup screen content');
        
        // Try to load saved settings
        const settings = await storageManager.getSettings();
        console.log('Retrieved settings for setup screen:', settings);
        
        // Pre-fill form with saved settings
        if (settings[StorageKeys.TIMER_TYPE]) {
          const timerTypeRadio = document.querySelector(`input[name="timer-type"][value="${settings[StorageKeys.TIMER_TYPE]}"]`);
          if (timerTypeRadio) {
            timerTypeRadio.checked = true;
            console.log('Selected timer type:', settings[StorageKeys.TIMER_TYPE]);
          }
        }
        
        if (settings[StorageKeys.BIRTH_DATE]) {
          birthDateInput.value = settings[StorageKeys.BIRTH_DATE];
          console.log('Prefilled birth date:', settings[StorageKeys.BIRTH_DATE]);
        }
        
        if (settings[StorageKeys.LIFE_EXPECTANCY]) {
          lifeExpectancyInput.value = settings[StorageKeys.LIFE_EXPECTANCY];
          console.log('Prefilled life expectancy:', settings[StorageKeys.LIFE_EXPECTANCY]);
        }
        
        // Toggle inputs visibility based on selected timer type
        toggleInputsVisibility();
        
        // Hide timer screen and show setup screen
        timerScreen.classList.add('hidden');
        timerScreen.style.display = 'none';
        
        setupScreen.classList.remove('hidden');
        setupScreen.style.display = 'block';
        
        // Use direct style manipulation instead of anime.js
        setupScreen.style.opacity = '0';
        setupScreen.style.transform = 'translateY(20px)';
        
        // Animate with setTimeout
        setTimeout(() => {
          setupScreen.style.opacity = '1';
          setupScreen.style.transform = 'translateY(0)';
          
          // Give time for transition to complete
          setTimeout(() => {
            resolve();
          }, 300);
        }, 10);
        
      } catch (error) {
        console.error('Error loading setup screen content:', error);
        reject(error);
      }
    });
  }
  
  /**
   * Load the timer screen with the saved timer type
   */
  async function loadTimerScreen() {
    try {
      console.log('Starting to load timer screen');
      
      // Check for required DOM elements
      if (!timerScreen || !setupScreen) {
        console.error('Timer or setup screen elements not found:', {
          timerScreen: !!timerScreen,
          setupScreen: !!setupScreen
        });
        throw new Error('Timer screen elements not found');
      }
      
      // Check for storageManager
      if (!storageManager) {
        console.error('Storage manager not defined');
        throw new Error('Storage manager not available');
      }
      
      // Get settings with fallbacks
      let settings;
      try {
        settings = await storageManager.getSettings();
        console.log('Retrieved settings:', settings);
      } catch (storageError) {
        console.error('Error reading settings:', storageError);
        // Create default settings
        settings = {
          [StorageKeys.TIMER_TYPE]: 'daily',
          [StorageKeys.SETUP_COMPLETED]: true
        };
        console.log('Using default settings:', settings);
      }
      
      // Validate settings
      if (!settings) {
        settings = {};
        console.warn('Settings object was null, using empty object');
      }
      
      const timerType = settings[StorageKeys.TIMER_TYPE] || 'daily';
      console.log('Using timer type:', timerType);
      
      // Check for timerCalculator
      if (!timerCalculator) {
        console.error('Timer calculator not defined');
        throw new Error('Timer calculator not available');
      }
      
      // Update UI elements (with null checks)
      if (timerTitle) {
        updateTimerTitle(timerType);
      } else {
        console.error('Timer title element not found');
      }
      
      if (timerDescription) {
        updateTimerDescription(timerType);
      } else {
        console.error('Timer description element not found');
      }
      
      if (motivationQuote) {
        displayRandomQuote(timerType);
      } else {
        console.error('Motivation quote element not found');
      }
      
      // Reset previous values
      previousValues = {
        years: 0,
        months: 0,
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0
      };
      
      // CRITICAL FIX: First make sure the timer screen and all its children are properly initialized
      console.log('Checking timer screen element structure before showing');
      const criticalElements = [
        { name: 'Timer Container', element: timerScreen.querySelector('.timer-container') },
        { name: 'Years Container', element: document.getElementById('years-container') },
        { name: 'Countdown Value', element: document.getElementById('countdown-value') }
      ];
      
      criticalElements.forEach(item => {
        if (!item.element) {
          console.error(`Critical element missing: ${item.name}`);
        } else {
          console.log(`Critical element found: ${item.name}`);
        }
      });
      
      // Get timer container for later reference
      const timerContainer = timerScreen.querySelector('.timer-container');
      if (!timerContainer) {
        console.error('Timer container not found in timer screen. This is critical!');
      }
      
      // Force display using multiple approaches to ensure visibility
      setupScreen.classList.add('hidden');
      setupScreen.style.display = 'none';
      setupScreen.style.visibility = 'hidden';
      
      timerScreen.classList.remove('hidden');
      timerScreen.style.display = 'block';
      timerScreen.style.visibility = 'visible';
      timerScreen.style.opacity = '1';
      
      // Ensure the timer container is also visible
      if (timerContainer) {
        timerContainer.style.display = 'block';
        timerContainer.style.visibility = 'visible';
        timerContainer.style.opacity = '1';
        timerContainer.style.transform = 'translateY(0)';
      }
      
      console.log('Timer screen visibility state:', {
        hidden: timerScreen.classList.contains('hidden'),
        display: timerScreen.style.display,
        opacity: timerScreen.style.opacity
      });
      
      // Force an initial update before starting interval
      try {
        console.log('Performing initial timer update');
        updateTimer(timerType, settings);
      } catch (updateError) {
        console.error('Error in initial timer update:', updateError);
        // Continue anyway - the interval might work
      }
      
      // Start timer updates
      console.log('Starting timer updates');
      startTimerUpdates(timerType, settings);
      
      // Make visible all time units
      document.querySelectorAll('.time-unit').forEach(unit => {
        unit.style.display = 'flex';
        unit.style.visibility = 'visible';
        unit.style.opacity = '1';
        unit.style.transform = 'translateY(0)';
        unit.classList.remove('hidden');
      });
      
      // Make visible countdown digits
      const countdownValue = document.getElementById('countdown-value');
      if (countdownValue) {
        countdownValue.style.display = 'flex';
        countdownValue.style.visibility = 'visible';
        countdownValue.style.opacity = '1';
        countdownValue.classList.remove('hidden');
      } else {
        console.error('Countdown value container not found');
      }
      
      // Final verification that timer is displayed
      setTimeout(() => {
        console.log('Timer screen verification check:', {
          timerScreen: {
            hidden: timerScreen.classList.contains('hidden'),
            display: timerScreen.style.display,
            opacity: timerScreen.style.opacity
          },
          timerContainer: timerContainer ? {
            display: timerContainer.style.display,
            opacity: timerContainer.style.opacity
          } : 'Not found'
        });
      }, 500);
      
    } catch (error) {
      console.error('Error loading timer screen:', error);
      hideLoading();
      
      // Show a specific error depending on the situation
      if (error.message.includes('Storage')) {
        alert('Storage access issue. Please check browser permissions and try again.');
      } else if (error.message.includes('Timer calculator')) {
        alert('Timer calculation error. Please reload the extension.');
      } else {
        alert('Failed to load timer. Please try resetting the extension.');
      }
      
      // Try to show setup screen as fallback
      try {
        if (setupScreen && timerScreen) {
          setupScreen.classList.remove('hidden');
          setupScreen.style.display = 'block';
          setupScreen.style.visibility = 'visible';
          timerScreen.classList.add('hidden');
          timerScreen.style.display = 'none';
          timerScreen.style.visibility = 'hidden';
        }
      } catch (e) {
        console.error('Critical error showing fallback screen:', e);
      }
    }
  }
  
  /**
   * Start timer updates at regular intervals
   * @param {string} timerType - Type of timer
   * @param {Object} settings - User settings
   */
  function startTimerUpdates(timerType, settings) {
    // Validate parameters
    if (!timerType) {
      timerType = 'daily';
    }
    
    if (!settings) {
      settings = {};
    }
    
    // Clear any existing interval
    if (timerInterval) {
      clearInterval(timerInterval);
    }
    
    // Initial update with error handling
    try {
      updateTimer(timerType, settings);
    } catch (error) {
      console.error('Error in initial timer update:', error);
    }
    
    // Set interval for future updates (every second)
    timerInterval = setInterval(() => {
      try {
        updateTimer(timerType, settings);
      } catch (error) {
        console.error('Error updating timer:', error);
        // Don't clear interval, try again next time
      }
    }, 1000);
  }
  
  /**
   * Update the timer display
   * @param {string} timerType - Type of timer
   * @param {Object} settings - User settings
   */
  function updateTimer(timerType, settings) {
    let timerData = null;
    
    // Validate parameters
    if (!timerType) {
      timerType = 'daily';
      console.warn('No timer type provided, defaulting to daily');
    }
    
    if (!settings) {
      settings = {};
      console.warn('No settings provided, using empty object');
    }
    
    try {
      // Check if timerCalculator is defined
      if (!timerCalculator) {
        console.error('Timer calculator not defined');
        return;
      }
      
      console.log('Updating timer for type:', timerType);
      
      switch (timerType) {
        case 'life':
          if (settings[StorageKeys.BIRTH_DATE] && settings[StorageKeys.LIFE_EXPECTANCY]) {
            timerData = timerCalculator.calculateLifeTimer(
              settings[StorageKeys.BIRTH_DATE],
              settings[StorageKeys.LIFE_EXPECTANCY]
            );
          } else {
            // Fallback to daily timer if missing data
            console.warn('Missing birth date or life expectancy, falling back to daily timer');
            timerData = timerCalculator.calculateDailyTimer();
          }
          break;
          
        case 'birthday':
          if (settings[StorageKeys.BIRTH_DATE]) {
            timerData = timerCalculator.calculateBirthdayTimer(
              settings[StorageKeys.BIRTH_DATE]
            );
          } else {
            // Fallback to daily timer if missing data
            console.warn('Missing birth date, falling back to daily timer');
            timerData = timerCalculator.calculateDailyTimer();
          }
          break;
          
        case 'daily':
          timerData = timerCalculator.calculateDailyTimer();
          break;
          
        default:
          console.error('Unknown timer type:', timerType);
          timerData = timerCalculator.calculateDailyTimer();
      }
      
      if (!timerData) {
        console.error('Failed to calculate timer data');
        return;
      }
      
      // Update countdown display with animation
      if (yearsValue && monthsValue && daysValue && hoursValue && minutesValue && secondsValue) {
        updateCountdownDisplay(timerData);
      } else {
        console.error('Countdown display elements not found');
      }
      
      // Update progress visualization (both progress bar and seek bar)
      if (progressBar && seekBarFill && seekBarHandle) {
        updateProgressVisualization(timerData.progressPercentage, timerType);
      } else {
        console.error('Progress visualization elements not found');
      }
      
      // Show message if applicable
      if (timerData.isPassed && timerData.message) {
        showCountdownMessage(timerData.message, timerData.isPassed);
      } else if (timerData.message) {
        showCountdownMessage(timerData.message, false);
      } else {
        hideCountdownMessage();
      }
    } catch (error) {
      console.error('Error updating timer:', error);
    }
  }
  
  /**
   * Update the countdown display with time values and animations
   * @param {Object} timerData - Timer calculation results
   */
  function updateCountdownDisplay(timerData) {
    if (!timerData) {
      console.error('No timer data provided to updateCountdownDisplay');
      return;
    }
    
    console.log('Updating countdown display with data:', {
      years: timerData.years,
      months: timerData.months,
      days: timerData.days,
      hours: timerData.hours,
      minutes: timerData.minutes,
      seconds: timerData.seconds
    });
    
    // Check for required DOM elements
    const timeContainers = [
      { name: 'Years', element: yearsContainer, value: yearsValue, data: timerData.years },
      { name: 'Months', element: monthsContainer, value: monthsValue, data: timerData.months },
      { name: 'Days', element: daysContainer, value: daysValue, data: timerData.days },
      { name: 'Hours', element: hoursContainer, value: hoursValue, data: timerData.hours },
      { name: 'Minutes', element: minutesContainer, value: minutesValue, data: timerData.minutes },
      { name: 'Seconds', element: secondsContainer, value: secondsValue, data: timerData.seconds }
    ];
    
    // Check if we're missing any essential elements
    const missingElements = timeContainers.filter(item => !item.element || !item.value);
    if (missingElements.length > 0) {
      console.error('Missing timer elements:', missingElements.map(item => item.name).join(', '));
    }
    
    // First ensure all containers are properly visible
    timeContainers.forEach(item => {
      // Skip if element doesn't exist
      if (!item.element) return;
      
      // Make sure the container is displayed correctly
      item.element.style.display = 'flex';
      item.element.style.visibility = 'visible';
      
      // Fade in if not already visible
      if (item.element.style.opacity !== '1') {
        item.element.style.opacity = '1';
      }
    });
    
    // Now update each time value with animation
    timeContainers.forEach(item => {
      if (!item.element || !item.value) return;
      
      const previousValue = previousValues[item.name.toLowerCase()] || 0;
      const hasChanged = previousValue !== item.data;
      
      // Update the digit with animation if changed
      updateDigitWithAnimation(item.value, item.data, hasChanged);
    });
    
    // Format values for display (always show at least 2 digits)
    formatTimeDisplay(timerData);
    
    // Store current values for next comparison
    previousValues = {
      years: timerData.years || 0,
      months: timerData.months || 0,
      days: timerData.days || 0,
      hours: timerData.hours || 0,
      minutes: timerData.minutes || 0,
      seconds: timerData.seconds || 0
    };
    
    // Handle visibility of year/month containers based on timer type
    // Only show years and months for life timers, or if they have non-zero values
    const timerType = document.querySelector('input[name="timer-type"]:checked')?.value || 'daily';
    
    // If we have the year container, decide whether to show it
    if (yearsContainer) {
      const shouldShowYears = timerType === 'life' || timerData.years > 0;
      yearsContainer.classList.toggle('hidden', !shouldShowYears);
      yearsContainer.style.display = shouldShowYears ? 'flex' : 'none';
    }
    
    // If we have the month container, decide whether to show it
    if (monthsContainer) {
      const shouldShowMonths = timerType === 'life' || timerType === 'birthday' || 
                              timerData.months > 0 || timerData.years > 0;
      monthsContainer.classList.toggle('hidden', !shouldShowMonths);
      monthsContainer.style.display = shouldShowMonths ? 'flex' : 'none';
    }
    
    // Make sure countdown digits wrapper is visible
    const countdownValue = document.getElementById('countdown-value');
    if (countdownValue) {
      countdownValue.style.display = 'flex';
      countdownValue.style.visibility = 'visible';
      countdownValue.style.opacity = '1';
    }
  }
  
  /**
   * Format time display values to always have at least 2 digits
   * @param {Object} timerData - Timer calculation results
   */
  function formatTimeDisplay(timerData) {
    // Make sure we have leading zeros for display values
    const formatItems = [
      { element: yearsValue, value: timerData.years },
      { element: monthsValue, value: timerData.months },
      { element: daysValue, value: timerData.days },
      { element: hoursValue, value: timerData.hours },
      { element: minutesValue, value: timerData.minutes },
      { element: secondsValue, value: timerData.seconds }
    ];
    
    formatItems.forEach(item => {
      if (!item.element) return;
      
      // Format as 2-digit number
      let displayValue = String(item.value || 0).padStart(2, '0');
      
      // If over 99, just show the actual number
      if (item.value > 99) {
        displayValue = String(item.value);
      }
      
      item.element.textContent = displayValue;
    });
  }
  
  /**
   * Update a single digit with smooth animation
   * @param {HTMLElement} element - The element to update
   * @param {number} newValue - The new value to display
   * @param {boolean} animate - Whether to animate the transition
   */
  function updateDigitWithAnimation(element, newValue, animate = true) {
    if (!element) {
      console.error('Digit element not found for animation');
      return;
    }
    
    // Format the value with proper leading zeros
    let displayValue = String(newValue || 0).padStart(2, '0');
    
    // If the value is over 99, just display the actual number
    if (newValue > 99) {
      displayValue = String(newValue);
    }
    
    // Set the value directly if not animating
    if (!animate) {
      element.textContent = displayValue;
      return;
    }
    
    try {
      // Try to use anime.js if available
      if (typeof anime !== 'undefined') {
        // Add class for animation
        element.classList.add('updating');
        
        // Fade out
        anime({
          targets: element,
          opacity: [1, 0],
          translateY: [0, -10],
          easing: 'easeInQuad',
          duration: 150,
          complete: () => {
            // Update digit
            element.textContent = displayValue;
            
            // Fade in
            anime({
              targets: element,
              opacity: [0, 1],
              translateY: [10, 0],
              easing: 'easeOutQuad',
              duration: 150,
              complete: () => {
                element.classList.remove('updating');
              }
            });
          }
        });
      } else {
        // Fallback animation using CSS transitions
        element.style.transition = 'opacity 0.15s, transform 0.15s';
        element.style.opacity = '0';
        element.style.transform = 'translateY(-10px)';
        
        setTimeout(() => {
          element.textContent = displayValue;
          element.style.transform = 'translateY(10px)';
          
          // Small delay before showing to ensure value is updated
          setTimeout(() => {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
          }, 50);
        }, 150);
      }
    } catch (error) {
      // If animation fails, just update directly
      console.error('Animation failed, updating directly:', error);
      element.textContent = displayValue;
    }
  }
  
  /**
   * Update progress visualizations (bar, seek bar and background)
   * @param {number} percentage - Progress percentage (0-100)
   * @param {string} timerType - Type of timer
   */
  function updateProgressVisualization(percentage, timerType) {
    // Ensure percentage is valid
    const validPercentage = Math.max(0, Math.min(100, percentage));
    
    // Update progress bar width with smooth animation
    progressBar.style.width = `${validPercentage}%`;
    
    // Update seek bar
    updateSeekBar(validPercentage);
    
    // Update background gradient based on timer type
    updateBackgroundGradient(validPercentage, timerType);
  }
  
  /**
   * Update the seek bar to reflect elapsed time
   * @param {number} percentage - Progress percentage (0-100)
   */
  function updateSeekBar(percentage) {
    // Validate percentage
    const validPercent = Math.max(0, Math.min(100, percentage));
    
    if (!seekBarFill || !seekBarHandle) return;
    
    // Use anime.js if available
    if (typeof anime !== 'undefined') {
      try {
        // Cancel any ongoing animation
        if (seekBarAnimation) {
          seekBarAnimation.pause();
        }
        
        // Create new animation
        seekBarAnimation = anime({
          targets: [seekBarFill],
          width: validPercent + '%',
          easing: 'easeOutExpo',
          duration: 800
        });
        
        // Separate animation for handle (smoother)
        anime({
          targets: seekBarHandle,
          left: validPercent + '%',
          easing: 'easeOutExpo',
          duration: 800
        });
      } catch (e) {
        // Direct fallback
        seekBarFill.style.width = validPercent + '%';
        seekBarHandle.style.left = validPercent + '%';
      }
    } else {
      // Direct style updates without animation
      seekBarFill.style.width = validPercent + '%';
      seekBarHandle.style.left = validPercent + '%';
    }
  }
  
  /**
   * Update the background gradient based on progress
   * @param {number} percentage - Progress percentage (0-100)
   * @param {string} timerType - Type of timer
   */
  function updateBackgroundGradient(percentage, timerType) {
    // Different color schemes for different timer types
    let startColor, endColor;
    
    switch (timerType) {
      case TimerTypes.LIFE:
        // Blue to purple gradient (Apple-inspired)
        startColor = `hsl(210, 100%, ${70 - percentage * 0.2}%)`;
        endColor = `hsl(280, 100%, ${60 - percentage * 0.2}%)`;
        break;
      
      case TimerTypes.BIRTHDAY:
        // Green to yellow gradient
        startColor = `hsl(120, 100%, ${65 - percentage * 0.2}%)`;
        endColor = `hsl(50, 100%, ${65 - percentage * 0.2}%)`;
        break;
      
      case TimerTypes.DAILY:
        // Blue to orange gradient
        startColor = `hsl(210, 100%, ${70 - percentage * 0.2}%)`;
        endColor = `hsl(20, 100%, ${65 - percentage * 0.2}%)`;
        break;
      
      default:
        startColor = 'var(--accent-color)';
        endColor = 'var(--accent-purple)';
    }
    
    // Update background gradient with a more prominent effect
    progressBackground.style.background = `radial-gradient(circle at center, ${startColor} 0%, transparent 70%)`;
    
    // Adjust opacity based on progress (more visible as time progresses)
    progressBackground.style.opacity = 0.07 + (percentage / 500);
  }
  
  /**
   * Show countdown message
   * @param {string} message - Message to display
   * @param {boolean} isSuccess - Whether to style as success
   */
  function showCountdownMessage(message, isSuccess = false) {
    messageText.textContent = message;
    
    // Only animate if the message was previously hidden
    const wasHidden = countdownMessage.classList.contains('hidden');
    
    countdownMessage.classList.remove('hidden');
    countdownMessage.classList.toggle('success', isSuccess);
    countdownMessage.classList.toggle('warning', !isSuccess);
    
    if (wasHidden) {
      anime({
        targets: countdownMessage,
        opacity: [0, 1],
        translateY: [10, 0],
        easing: 'easeOutQuad',
        duration: 500
      });
    }
  }
  
  /**
   * Hide countdown message
   */
  function hideCountdownMessage() {
    if (!countdownMessage.classList.contains('hidden')) {
      anime({
        targets: countdownMessage,
        opacity: [1, 0],
        translateY: [0, 10],
        easing: 'easeInQuad',
        duration: 500,
        complete: () => {
          countdownMessage.classList.add('hidden');
        }
      });
    }
  }
  
  /**
   * Update the timer title based on timer type
   * @param {string} timerType - Type of timer
   */
  function updateTimerTitle(timerType) {
    if (!timerTitle) {
      console.error('Timer title element not found');
      return;
    }
    
    switch (timerType) {
      case 'life':
        timerTitle.textContent = 'Life Timer';
        break;
      case 'birthday':
        timerTitle.textContent = 'Birthday Timer';
        break;
      case 'daily':
        timerTitle.textContent = 'Daily Timer';
        break;
      default:
        timerTitle.textContent = 'Timer';
    }
  }
  
  /**
   * Update the timer description based on timer type
   * @param {string} timerType - Type of timer
   */
  function updateTimerDescription(timerType) {
    if (!timerDescription) {
      console.error('Timer description element not found');
      return;
    }
    
    switch (timerType) {
      case 'life':
        timerDescription.textContent = 'Time remaining in your estimated life span';
        break;
      case 'birthday':
        timerDescription.textContent = 'Time until your next birthday';
        break;
      case 'daily':
        timerDescription.textContent = 'Time remaining in today';
        break;
      default:
        timerDescription.textContent = '';
    }
  }
  
  /**
   * Display a random motivational quote based on timer type
   * @param {string} timerType - Type of timer
   */
  function displayRandomQuote(timerType) {
    // Check if motivationQuote exists
    if (!motivationQuote) {
      console.error('Motivation quote element not found');
      return;
    }
    
    const quotes = QUOTES[timerType] || [];
    if (quotes.length > 0) {
      const randomIndex = Math.floor(Math.random() * quotes.length);
      const quoteText = `"${quotes[randomIndex]}"`;
      
      // Use direct DOM manipulation instead of anime.js
      try {
        motivationQuote.style.opacity = '0';
        
        // Set the text and fade it in
        setTimeout(() => {
          motivationQuote.textContent = quoteText;
          motivationQuote.style.opacity = '0.8';
          motivationQuote.style.transform = 'translateY(0)';
        }, 200);
      } catch (error) {
        console.error('Error displaying quote:', error);
        // Fallback - just set the text without animation
        motivationQuote.textContent = quoteText;
      }
    } else {
      motivationQuote.textContent = '';
    }
  }
  
  // Safe toggle for input visibility
  function safeToggleInputVisibility() {
    try {
      console.log('Using safe fallback for input visibility toggling');
      const radioButtons = document.querySelectorAll('input[name="timer-type"]');
      if (!radioButtons.length) {
        console.error('No timer type radio buttons found');
        return;
      }
      
      const checkedRadio = document.querySelector('input[name="timer-type"]:checked');
      if (!checkedRadio) {
        console.warn('No timer type selected, selecting the first option as fallback');
        // Default to first option if none selected
        if (radioButtons[0]) {
          radioButtons[0].checked = true;
        }
      }
      
      // Now try toggleInputsVisibility which has more robust handling
      toggleInputsVisibility();
    } catch (error) {
      console.error('Error handling input visibility:', error);
      
      // Last resort fallback using direct DOM manipulation
      try {
        const timerType = document.querySelector('input[name="timer-type"]:checked')?.value || 'daily';
        console.log('Ultimate fallback for timer type:', timerType);
        
        if (birthDateContainer) {
          birthDateContainer.style.display = (timerType === 'daily') ? 'none' : 'block';
        }
        
        if (lifeExpectancyContainer) {
          lifeExpectancyContainer.style.display = (timerType === 'life') ? 'block' : 'none';
        }
      } catch (e) {
        console.error('Critical error in input visibility fallback:', e);
      }
    }
  }
  
  // Fallback when storage is unavailable
  function handleStartupWithoutStorage() {
    if (setupScreen && timerScreen) {
      setupScreen.classList.remove('hidden');
      timerScreen.classList.add('hidden');
    }
    hideLoading();
  }
  
  // Initialize the app
  init();
}); 