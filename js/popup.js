/**
 * Popup Script for Countdown Timer Extension
 * Handles the UI and logic for the extension popup
 */

document.addEventListener('DOMContentLoaded', function() {
  // Debug mode for logging
  const DEBUG = true;
  
  // Elements
  const timerTypeForm = document.getElementById('timer-type-form');
  const saveButton = document.getElementById('save-settings');
  const statusMessage = document.getElementById('status-message');
  const popupLifeTimer = document.getElementById('life-timer');
  const popupBirthdayTimer = document.getElementById('birthday-timer');
  const popupDailyTimer = document.getElementById('daily-timer');
  const birthDateInput = document.getElementById('birthdate');
  const lifeExpectancyInput = document.getElementById('life-expectancy');
  const birthDateContainer = document.getElementById('birthdate-container');
  const lifeExpectancyContainer = document.getElementById('life-expectancy-container');
  
  // Track current settings for comparison
  let currentSettings = {
    timerType: 'daily',
    birthDate: '',
    lifeExpectancy: 80,
    setupCompleted: true
  };
  
  /**
   * Show status message
   * @param {string} message - The message to display
   * @param {string} type - Message type ('success', 'error', 'info')
   * @param {number} duration - How long to show the message in ms
   */
  function showStatus(message, type = 'info', duration = 3000) {
    if (!statusMessage) return;
    
    // Clear any existing timers
    if (statusMessage.timer) {
      clearTimeout(statusMessage.timer);
    }
    
    // Set message and type
    statusMessage.textContent = message;
    statusMessage.className = 'status-message'; // Reset classes
    statusMessage.classList.add(`status-${type}`);
    statusMessage.classList.add('visible');
    
    // Auto-hide after duration
    statusMessage.timer = setTimeout(() => {
      statusMessage.classList.remove('visible');
    }, duration);
  }
  
  /**
   * Load saved settings from storage and update UI
   */
  function loadSettings() {
    if (DEBUG) console.log('Loading settings...');
    
    chrome.storage.sync.get([
      'timerType',
      'birthDate',
      'lifeExpectancy',
      'setupCompleted'
    ], function(items) {
      if (chrome.runtime.lastError) {
        console.error('Error loading settings:', chrome.runtime.lastError);
        showStatus('Failed to load settings: ' + chrome.runtime.lastError.message, 'error');
        return;
      }
      
      if (DEBUG) console.log('Loaded settings:', items);
      
      // Store current settings for comparison later
      currentSettings = {
        timerType: items.timerType || 'daily',
        birthDate: items.birthDate || '',
        lifeExpectancy: items.lifeExpectancy || 80,
        setupCompleted: items.setupCompleted !== false // Default to true
      };
      
      // Update UI with loaded settings
      updateUIFromSettings(currentSettings);
    });
  }
  
  /**
   * Update UI elements based on settings
   * @param {Object} settings - User settings
   */
  function updateUIFromSettings(settings) {
    if (DEBUG) console.log('Updating UI from settings:', settings);
    
    // Set timer type radio button
    switch (settings.timerType) {
      case 'life':
        popupLifeTimer.checked = true;
        break;
      case 'birthday':
        popupBirthdayTimer.checked = true;
        break;
      case 'daily':
      default:
        popupDailyTimer.checked = true;
        break;
    }
    
    // Set other form values
    if (birthDateInput && settings.birthDate) {
      birthDateInput.value = settings.birthDate;
    }
    
    if (lifeExpectancyInput && settings.lifeExpectancy) {
      lifeExpectancyInput.value = settings.lifeExpectancy;
    }
    
    // Toggle visibility of input fields
    toggleInputVisibility();
  }
  
  /**
   * Save settings to Chrome storage
   * @param {Object} settings - Settings to save
   * @returns {Promise} - Resolves when settings are saved
   */
  function saveSettings(settings) {
    return new Promise((resolve, reject) => {
      if (DEBUG) console.log('Saving settings:', settings);
      
      chrome.storage.sync.set(settings, function() {
        if (chrome.runtime.lastError) {
          console.error('Error saving settings:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          if (DEBUG) console.log('Settings saved successfully');
          resolve();
        }
      });
    });
  }
  
  /**
   * Notify active new tab pages about settings change
   * @param {Object} settings - The updated settings
   * @param {boolean} shouldReload - Whether the new tab should reload
   * @returns {Promise} - Resolves when notification is sent
   */
  function notifyNewTabPages(settings, shouldReload) {
    return new Promise((resolve) => {
      if (DEBUG) console.log('Notifying new tab pages of settings change, should reload:', shouldReload);
      
      // Find all new tab pages to notify
      chrome.tabs.query({ url: "chrome://newtab/*" }, function(tabs) {
        if (DEBUG) console.log(`Found ${tabs.length} new tab pages to notify`);
        
        // If no tabs found, resolve immediately
        if (!tabs || tabs.length === 0) {
          resolve();
          return;
        }
        
        // Send message to all new tab pages
        let completedMessages = 0;
        const totalMessages = tabs.length;
        
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, {
            action: 'settingsUpdated',
            settings,
            reload: shouldReload
          }, function(response) {
            if (chrome.runtime.lastError) {
              if (DEBUG) console.warn('Error sending message to tab:', tab.id, chrome.runtime.lastError);
            } else {
              if (DEBUG) console.log('Message sent to tab:', tab.id, 'Response:', response);
            }
            
            completedMessages++;
            
            // If shouldReload is true, reload the tab regardless of response
            if (shouldReload) {
              try {
                chrome.tabs.reload(tab.id);
                if (DEBUG) console.log('Reloading tab:', tab.id);
              } catch (error) {
                console.error('Failed to reload tab:', tab.id, error);
              }
            }
            
            // All messages sent
            if (completedMessages >= totalMessages) {
              resolve();
            }
          });
        });
        
        // Safety timeout in case some messages don't complete
        setTimeout(resolve, 1000);
      });
    });
  }
  
  /**
   * Toggle visibility of birthdate and life expectancy inputs
   * based on selected timer type
   */
  function toggleInputVisibility() {
    // Get the selected timer type
    const selectedTimer = document.querySelector('input[name="timer-type"]:checked');
    if (!selectedTimer) return;
    
    const timerType = selectedTimer.value;
    
    // Toggle birthdate visibility (need for both life and birthday timers)
    if (birthDateContainer) {
      birthDateContainer.style.display = (timerType === 'daily') ? 'none' : 'block';
    }
    
    // Toggle life expectancy visibility (only needed for life timer)
    if (lifeExpectancyContainer) {
      lifeExpectancyContainer.style.display = (timerType === 'life') ? 'block' : 'none';
    }
  }
  
  /**
   * Handle form submission
   * @param {Event} event - The submit event
   */
  async function handleSubmit(event) {
    event.preventDefault();
    
    if (DEBUG) console.log('Form submitted');
    
    // Disable save button and show loading state
    if (saveButton) {
      saveButton.disabled = true;
      saveButton.textContent = 'Saving...';
    }
    
    try {
      // Get form values
      const formData = new FormData(timerTypeForm);
      const timerType = formData.get('timer-type') || 'daily';
      let birthDate = formData.get('birthdate') || '';
      let lifeExpectancy = parseInt(formData.get('life-expectancy'), 10) || 80;
      
      if (DEBUG) console.log('Form values:', { timerType, birthDate, lifeExpectancy });
      
      // Validate data
      if ((timerType === 'life' || timerType === 'birthday') && !birthDate) {
        showStatus('Please enter your birth date', 'error');
        throw new Error('Birth date required');
      }
      
      if (timerType === 'life' && (isNaN(lifeExpectancy) || lifeExpectancy < 1)) {
        showStatus('Please enter a valid life expectancy', 'error');
        throw new Error('Invalid life expectancy');
      }
      
      // Prepare settings object
      const newSettings = {
        timerType,
        setupCompleted: true
      };
      
      // Only include relevant data based on timer type
      if (timerType === 'life' || timerType === 'birthday') {
        newSettings.birthDate = birthDate;
      }
      
      if (timerType === 'life') {
        newSettings.lifeExpectancy = lifeExpectancy;
      }
      
      // Check if timer type has changed - this determines if we need to reload the tab
      const timerTypeChanged = currentSettings.timerType !== timerType;
      if (DEBUG) console.log('Timer type changed:', timerTypeChanged);
      
      // Save settings
      await saveSettings(newSettings);
      
      // Update current settings
      currentSettings = { ...currentSettings, ...newSettings };
      
      // Notify new tab pages and reload if timer type changed
      await notifyNewTabPages(newSettings, timerTypeChanged);
      
      // Show success message
      showStatus('Settings saved successfully', 'success');
      
      // If timer type changed, we suggested a reload so inform user
      if (timerTypeChanged) {
        showStatus('Timer updated to ' + timerType + ' type', 'success', 5000);
      }
    } catch (error) {
      if (DEBUG) console.error('Error saving settings:', error);
      
      // Only show generic error if not already showing a specific one
      if (!statusMessage || !statusMessage.classList.contains('visible')) {
        showStatus('Error saving settings: ' + error.message, 'error');
      }
    } finally {
      // Re-enable save button
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = 'Save Changes';
      }
    }
  }
  
  /**
   * Initialize the popup
   */
  function init() {
    if (DEBUG) console.log('Initializing popup');
    
    // Load saved settings
    loadSettings();
    
    // Set up event listeners
    if (timerTypeForm) {
      timerTypeForm.addEventListener('submit', handleSubmit);
    }
    
    // Timer type change event
    const timerTypeRadios = document.querySelectorAll('input[name="timer-type"]');
    timerTypeRadios.forEach(radio => {
      radio.addEventListener('change', toggleInputVisibility);
    });
    
    // Set current date as max value for birthdate
    if (birthDateInput) {
      const today = new Date().toISOString().split('T')[0];
      birthDateInput.setAttribute('max', today);
    }
  }
  
  // Start initialization
  init();
}); 