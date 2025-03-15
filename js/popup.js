/**
 * Popup Script for Countdown Timer Extension
 * Handles the UI and logic for the extension popup
 */

document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const timerTypeForm = document.getElementById('timer-type-form');
  const popupLifeTimer = document.getElementById('popup-life-timer');
  const popupBirthdayTimer = document.getElementById('popup-birthday-timer');
  const popupDailyTimer = document.getElementById('popup-daily-timer');
  const popupBirthdate = document.getElementById('popup-birthdate');
  const popupLifeExpectancy = document.getElementById('popup-life-expectancy');
  const popupBirthdateContainer = document.getElementById('popup-birthdate-container');
  const popupLifeExpectancyContainer = document.getElementById('popup-life-expectancy-container');
  const popupSaveSettings = document.getElementById('popup-save-settings');
  const popupResetSettings = document.getElementById('popup-reset-settings');
  
  // Set current date as max date for birthdate input
  const today = new Date().toISOString().split('T')[0];
  popupBirthdate.setAttribute('max', today);
  
  /**
   * Initialize the popup
   */
  async function init() {
    try {
      // Load saved settings
      const settings = await storageManager.getSettings();
      
      // Pre-fill form with saved settings
      prePopulateForm(settings);
      
      // Add event listeners
      setupEventListeners();
      
    } catch (error) {
      console.error('Error initializing popup:', error);
      showError('Failed to load settings. Please try again.');
    }
  }
  
  /**
   * Pre-populate form with saved settings
   * @param {Object} settings - User settings
   */
  function prePopulateForm(settings) {
    // Set timer type
    const timerType = settings[StorageKeys.TIMER_TYPE];
    if (timerType) {
      switch (timerType) {
        case TimerTypes.LIFE:
          popupLifeTimer.checked = true;
          break;
        case TimerTypes.BIRTHDAY:
          popupBirthdayTimer.checked = true;
          break;
        case TimerTypes.DAILY:
          popupDailyTimer.checked = true;
          break;
      }
    }
    
    // Set birthdate
    if (settings[StorageKeys.BIRTH_DATE]) {
      popupBirthdate.value = settings[StorageKeys.BIRTH_DATE];
    }
    
    // Set life expectancy
    if (settings[StorageKeys.LIFE_EXPECTANCY]) {
      popupLifeExpectancy.value = settings[StorageKeys.LIFE_EXPECTANCY];
    }
    
    // Toggle inputs visibility
    toggleInputsVisibility();
  }
  
  /**
   * Set up all event listeners
   */
  function setupEventListeners() {
    // Form submission
    timerTypeForm.addEventListener('submit', handleFormSubmit);
    
    // Reset button click
    popupResetSettings.addEventListener('click', handleResetClick);
    
    // Timer type radio buttons change
    document.querySelectorAll('input[name="timer-type"]').forEach(radio => {
      radio.addEventListener('change', toggleInputsVisibility);
    });
  }
  
  /**
   * Toggle visibility of inputs based on selected timer type
   */
  function toggleInputsVisibility() {
    const selectedTimerType = document.querySelector('input[name="timer-type"]:checked').value;
    
    // Always show birthdate for Life and Birthday timers
    popupBirthdateContainer.classList.toggle('hidden', selectedTimerType === TimerTypes.DAILY);
    popupBirthdate.required = selectedTimerType !== TimerTypes.DAILY;
    
    // Only show life expectancy for Life timer
    popupLifeExpectancyContainer.classList.toggle('hidden', selectedTimerType !== TimerTypes.LIFE);
  }
  
  /**
   * Handle form submission
   * @param {Event} event - Form submit event
   */
  async function handleFormSubmit(event) {
    event.preventDefault();
    
    try {
      // Get form data
      const formData = new FormData(timerTypeForm);
      const timerType = formData.get('timer-type');
      const birthDate = formData.get('birthdate');
      const lifeExpectancy = parseInt(formData.get('life-expectancy'), 10);
      
      // Validate inputs
      if ((timerType === TimerTypes.LIFE || timerType === TimerTypes.BIRTHDAY) && !birthDate) {
        showError('Please enter your birth date');
        return;
      }
      
      if (timerType === TimerTypes.LIFE && (!lifeExpectancy || lifeExpectancy < 1)) {
        showError('Please enter a valid life expectancy');
        return;
      }
      
      // Save to storage
      await storageManager.saveTimerType(timerType);
      
      if (birthDate) {
        await storageManager.saveBirthDate(birthDate);
      }
      
      if (lifeExpectancy) {
        await storageManager.saveLifeExpectancy(lifeExpectancy);
      }
      
      // Ensure setup is marked as completed
      await storageManager.completeSetup();
      
      // Show success message
      showSuccess('Settings saved successfully!');
      
    } catch (error) {
      console.error('Error saving settings:', error);
      showError('Failed to save settings. Please try again.');
    }
  }
  
  /**
   * Handle reset button click
   */
  async function handleResetClick() {
    try {
      // Confirm reset
      if (confirm('Are you sure you want to reset all settings? This will clear all your preferences.')) {
        // Reset settings
        await storageManager.resetSettings();
        
        // Load default settings
        const settings = await storageManager.getSettings();
        
        // Pre-fill form with default settings
        prePopulateForm(settings);
        
        // Show success message
        showSuccess('Settings reset successfully!');
      }
    } catch (error) {
      console.error('Error resetting settings:', error);
      showError('Failed to reset settings. Please try again.');
    }
  }
  
  /**
   * Show error message
   * @param {string} message - Error message
   */
  function showError(message) {
    alert(message);
  }
  
  /**
   * Show success message
   * @param {string} message - Success message
   */
  function showSuccess(message) {
    alert(message);
  }
  
  // Initialize the popup
  init();
}); 