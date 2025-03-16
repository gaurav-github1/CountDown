/**
 * options.js - Handles the settings UI and persistence
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('Options page loaded');
    
    // Initialize settings
    initializeSettings();
    
    // Set up event listeners
    setupEventListeners();
});

/**
 * Initialize settings page with stored values
 */
function initializeSettings() {
    // Load stored settings from Chrome storage
    chrome.storage.sync.get(['timerType', 'birthDate', 'lifeExpectancy', 'theme'], function(items) {
        if (chrome.runtime.lastError) {
            showStatusMessage('Error loading settings: ' + chrome.runtime.lastError.message, 'error');
            return;
        }
        
        console.log('Loaded settings:', items);
        
        // Timer type
        const timerType = items.timerType || 'daily';
        const timerRadio = document.querySelector(`input[name="timerType"][value="${timerType}"]`);
        if (timerRadio) {
            timerRadio.checked = true;
        }
        
        // Birth date
        const birthDateInput = document.getElementById('birthDate');
        if (birthDateInput && items.birthDate) {
            // Format date as YYYY-MM-DD for input
            const birthDate = new Date(items.birthDate);
            const year = birthDate.getFullYear();
            const month = String(birthDate.getMonth() + 1).padStart(2, '0');
            const day = String(birthDate.getDate()).padStart(2, '0');
            
            birthDateInput.value = `${year}-${month}-${day}`;
        }
        
        // Life expectancy
        const lifeExpectancyInput = document.getElementById('lifeExpectancy');
        if (lifeExpectancyInput && items.lifeExpectancy) {
            lifeExpectancyInput.value = items.lifeExpectancy;
        } else if (lifeExpectancyInput) {
            // Default life expectancy
            lifeExpectancyInput.value = '80.0';
        }
        
        // Theme
        const theme = items.theme || 'auto';
        setActiveTheme(theme);
    });
}

/**
 * Set up event listeners for the settings page
 */
function setupEventListeners() {
    // Form submission
    const settingsForm = document.getElementById('settings-form');
    if (settingsForm) {
        settingsForm.addEventListener('submit', saveSettings);
    }
    
    // Reset button
    const resetButton = document.getElementById('reset-button');
    if (resetButton) {
        resetButton.addEventListener('click', resetSettings);
    }
    
    // Theme buttons
    const themeButtons = document.querySelectorAll('.theme-button');
    themeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const theme = this.getAttribute('data-theme');
            setActiveTheme(theme);
        });
    });
    
    // Timer type radio buttons (to conditionally show/hide fields)
    const timerTypeRadios = document.querySelectorAll('input[name="timerType"]');
    timerTypeRadios.forEach(radio => {
        radio.addEventListener('change', updateFormVisibility);
    });
    
    // Privacy link
    const privacyLink = document.getElementById('privacy-link');
    if (privacyLink) {
        privacyLink.addEventListener('click', function(e) {
            e.preventDefault();
            // Show privacy information or open a privacy policy page
            alert('Life Timer respects your privacy. All your data is stored locally on your device and is never sent to any server.');
        });
    }
    
    // Initial form visibility update
    updateFormVisibility();
}

/**
 * Save settings to Chrome storage
 * @param {Event} e - Form submit event
 */
function saveSettings(e) {
    e.preventDefault();
    
    try {
        // Show loading indicator
        showStatusMessage('Saving settings...', 'info');
        
        // Get form values
        const timerType = document.querySelector('input[name="timerType"]:checked')?.value || 'daily';
        
        // Get birth date
        const birthDateInput = document.getElementById('birthDate');
        let birthDate = null;
        if (birthDateInput && birthDateInput.value) {
            birthDate = new Date(birthDateInput.value).toISOString();
        }
        
        // Get life expectancy
        const lifeExpectancyInput = document.getElementById('lifeExpectancy');
        let lifeExpectancy = 80;
        if (lifeExpectancyInput && lifeExpectancyInput.value) {
            lifeExpectancy = parseFloat(lifeExpectancyInput.value);
        }
        
        // Get theme
        const activeThemeButton = document.querySelector('.theme-button.active');
        const theme = activeThemeButton ? activeThemeButton.getAttribute('data-theme') : 'auto';
        
        // Save settings to Chrome storage
        const settings = {
            timerType: timerType,
            theme: theme
        };
        
        // Only save birth date and life expectancy if they're provided
        if (birthDate) {
            settings.birthDate = birthDate;
        }
        
        if (lifeExpectancy) {
            settings.lifeExpectancy = lifeExpectancy;
        }
        
        chrome.storage.sync.set(settings, function() {
            if (chrome.runtime.lastError) {
                showStatusMessage('Error saving settings: ' + chrome.runtime.lastError.message, 'error');
                return;
            }
            
            console.log('Settings saved:', settings);
            showStatusMessage('Settings saved successfully!', 'success');
            
            // Apply theme immediately
            applyTheme(theme);
            
            // Notify any open extension pages about the settings change
            chrome.runtime.sendMessage({ action: 'settingsUpdated', settings: settings });
        });
    } catch (error) {
        console.error('Error saving settings:', error);
        showStatusMessage('Error saving settings: ' + error.message, 'error');
    }
}

/**
 * Reset settings to defaults
 */
function resetSettings() {
    if (confirm('Are you sure you want to reset all settings to default values?')) {
        try {
            // Show loading indicator
            showStatusMessage('Resetting settings...', 'info');
            
            // Clear storage
            chrome.storage.sync.clear(function() {
                if (chrome.runtime.lastError) {
                    showStatusMessage('Error resetting settings: ' + chrome.runtime.lastError.message, 'error');
                    return;
                }
                
                console.log('Settings reset to defaults');
                showStatusMessage('Settings reset to defaults successfully!', 'success');
                
                // Reload the form with default values
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            });
        } catch (error) {
            console.error('Error resetting settings:', error);
            showStatusMessage('Error resetting settings: ' + error.message, 'error');
        }
    }
}

/**
 * Update which form fields are visible based on selected timer type
 */
function updateFormVisibility() {
    const timerType = document.querySelector('input[name="timerType"]:checked')?.value || 'daily';
    const birthDateGroup = document.querySelector('.form-group:has(#birthDate)');
    const lifeExpectancyGroup = document.querySelector('.form-group:has(#lifeExpectancy)');
    
    if (!birthDateGroup || !lifeExpectancyGroup) return;
    
    // Always show the birth date for birthday and life timers
    if (timerType === 'daily') {
        birthDateGroup.style.display = 'none';
        lifeExpectancyGroup.style.display = 'none';
    } else {
        birthDateGroup.style.display = 'block';
        
        // Only show life expectancy for life timer
        if (timerType === 'life') {
            lifeExpectancyGroup.style.display = 'block';
        } else {
            lifeExpectancyGroup.style.display = 'none';
        }
    }
}

/**
 * Set the active theme button and apply the theme
 * @param {string} theme - Theme name ('auto', 'dark', or 'light')
 */
function setActiveTheme(theme) {
    // Update button state
    const themeButtons = document.querySelectorAll('.theme-button');
    themeButtons.forEach(button => {
        if (button.getAttribute('data-theme') === theme) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
    
    // Apply theme to page
    applyTheme(theme);
}

/**
 * Apply the selected theme to the document
 * @param {string} theme - Theme name ('auto', 'dark', or 'light')
 */
function applyTheme(theme) {
    // Remove existing theme
    document.documentElement.removeAttribute('data-theme');
    
    // Set new theme if not auto
    if (theme === 'dark' || theme === 'light') {
        document.documentElement.setAttribute('data-theme', theme);
    }
}

/**
 * Show a status message to the user
 * @param {string} message - Message to display
 * @param {string} type - Message type ('success', 'error', 'warning', 'info')
 */
function showStatusMessage(message, type = 'info') {
    const statusMessage = document.getElementById('status-message');
    if (!statusMessage) return;
    
    // Remove existing classes
    statusMessage.className = 'status-message';
    
    // Add type class
    statusMessage.classList.add(type);
    
    // Set message text
    statusMessage.textContent = message;
    
    // Show message
    statusMessage.classList.remove('hidden');
    
    // Hide message after delay (except for errors)
    if (type !== 'error') {
        setTimeout(() => {
            statusMessage.classList.add('hidden');
        }, 3000);
    }
} 