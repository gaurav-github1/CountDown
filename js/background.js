/**
 * background.js - Service worker for the Chrome extension
 * 
 * Manages the tab override behavior and coordinates module initialization
 */

// Global module references
let TabManager = null;
let Diagnostic = null;
let isInitialized = false;
let initializationInProgress = false;
let initializationRetries = 0;
const MAX_RETRIES = 3;

/**
 * Initialize the background service worker
 * @returns {Promise<boolean>} Whether initialization was successful
 */
async function initializeBackgroundWorker() {
  // Prevent concurrent initialization
  if (initializationInProgress) {
    console.log('[Background] Initialization already in progress, skipping');
    return false;
  }
  
  // Check if already initialized successfully
  if (isInitialized && TabManager) {
    console.log('[Background] Already initialized, skipping');
    return true;
  }
  
  initializationInProgress = true;
  console.log('[Background] Initializing service worker');
  
  try {
    // Load modules
    await loadModules();
    
    // Configure tab manager
    if (TabManager) {
      // Initialize tab manager
      await TabManager.initialize();
      
      // Set up event handlers
      TabManager.on('onTabOverride', (tab) => {
        redirectToCustomNewTab(tab.id);
      });
      
      console.log('[Background] Tab manager configured successfully');
      isInitialized = true;
    } else {
      console.error('[Background] TabManager module could not be loaded');
      
      // Set up direct event listener as fallback
      setupFallbackTabListener();
    }
    
    // Run diagnostic check if available
    if (Diagnostic) {
      await Diagnostic.logCurrentState();
    }
    
    console.log('[Background] Service worker initialized');
    initializationRetries = 0;
    return true;
  } catch (error) {
    console.error('[Background] Error initializing service worker:', error);
    setupFallbackTabListener();
    
    // Retry initialization if not too many attempts
    if (initializationRetries < MAX_RETRIES) {
      initializationRetries++;
      console.log(`[Background] Retrying initialization (${initializationRetries}/${MAX_RETRIES})...`);
      setTimeout(() => {
        initializationInProgress = false;
        initializeBackgroundWorker();
      }, 1000); // Wait 1s before retry
    }
    
    return false;
  } finally {
    initializationInProgress = false;
  }
}

/**
 * Set up a fallback tab listener if the module approach fails
 */
function setupFallbackTabListener() {
  console.log('[Background] Setting up fallback tab listener');
  
  try {
    // Remove any existing listeners first to prevent duplicates
    removeFallbackListeners();
    
    // Track new tab pages per window
    const windowTabsMap = {};
    
    // Store the listeners so we can remove them later if needed
    const listeners = {
      windowCreated: handleWindowCreated,
      windowRemoved: handleWindowRemoved,
      tabCreated: handleTabCreated,
      tabUpdated: handleTabUpdated
    };
    
    // Attach to global scope for cleanup
    self.fallbackListeners = listeners;
    self.fallbackWindowMap = windowTabsMap;
    
    // Scan existing windows
    chrome.windows.getAll({ populate: true }, (windows) => {
      try {
        windows.forEach(win => {
          windowTabsMap[win.id] = {
            newTabCount: 0,
            firstTabSkipped: false
          };
          
          // Count existing new tabs in this window
          const newTabs = win.tabs.filter(tab => 
            tab.url === 'chrome://newtab/' || 
            tab.pendingUrl === 'chrome://newtab/' ||
            tab.url === 'about:blank'); // Some browsers initially set about:blank
            
          if (newTabs.length > 0) {
            windowTabsMap[win.id].newTabCount = newTabs.length;
            windowTabsMap[win.id].firstTabSkipped = true;
          }
        });
        
        console.log('[Background] Initialized fallback window map:', windowTabsMap);
      } catch (error) {
        console.error('[Background] Error scanning windows:', error);
      }
    });
    
    // Window creation listener
    function handleWindowCreated(window) {
      try {
        windowTabsMap[window.id] = {
          newTabCount: 0,
          firstTabSkipped: false
        };
        console.log(`[Background] New window created: ${window.id}`);
      } catch (error) {
        console.error('[Background] Error handling window creation:', error);
      }
    }
    
    // Window removal listener
    function handleWindowRemoved(windowId) {
      try {
        delete windowTabsMap[windowId];
        console.log(`[Background] Window removed: ${windowId}`);
      } catch (error) {
        console.error('[Background] Error handling window removal:', error);
      }
    }
    
    // Tab creation listener
    function handleTabCreated(tab) {
      try {
        // If it's not a new tab, we don't need to do anything
        if (tab.pendingUrl !== 'chrome://newtab/' && 
            tab.url !== 'chrome://newtab/' && 
            tab.url !== 'about:blank') {
          return;
        }
        
        const windowId = tab.windowId;
        
        // Create entry for this window if it doesn't exist
        if (!windowTabsMap[windowId]) {
          windowTabsMap[windowId] = {
            newTabCount: 0,
            firstTabSkipped: false
          };
        }
        
        // Increment the new tab count for this window
        windowTabsMap[windowId].newTabCount++;
        
        console.log(`[Background] New tab in window ${windowId}, count: ${windowTabsMap[windowId].newTabCount}, firstTabSkipped: ${windowTabsMap[windowId].firstTabSkipped}`);
        
        // If this is the first new tab in this window, skip overriding
        if (windowTabsMap[windowId].newTabCount === 1 && !windowTabsMap[windowId].firstTabSkipped) {
          windowTabsMap[windowId].firstTabSkipped = true;
          console.log(`[Background] First new tab in window ${windowId}, skipping override`);
          return;
        }
        
        // For subsequent tabs, redirect to our custom page
        console.log(`[Background] Redirecting tab ${tab.id} in window ${windowId} to custom new tab`);
        redirectToCustomNewTab(tab.id);
      } catch (error) {
        console.error('[Background] Error handling tab creation:', error, tab);
      }
    }
    
    // Tab update listener
    function handleTabUpdated(tabId, changeInfo, tab) {
      try {
        // Only handle tabs that are loading the new tab page
        if (changeInfo.status === 'loading' && 
           (tab.url === 'chrome://newtab/' || tab.url === 'about:blank')) {
          const windowId = tab.windowId;
          
          // Get the window map object
          if (!windowTabsMap[windowId]) {
            windowTabsMap[windowId] = {
              newTabCount: 1,
              firstTabSkipped: false
            };
            return;
          }
          
          // If this is the first tab and we haven't skipped one yet, don't override
          if (windowTabsMap[windowId].newTabCount <= 1 && !windowTabsMap[windowId].firstTabSkipped) {
            windowTabsMap[windowId].firstTabSkipped = true;
            console.log(`[Background] Allowing default new tab for first tab in window ${windowId}`);
            return;
          }
          
          // For subsequent tabs, redirect to our custom page
          console.log(`[Background] Handling URL update for tab ${tabId} in window ${windowId}`);
          redirectToCustomNewTab(tabId);
        }
      } catch (error) {
        console.error('[Background] Error handling tab update:', error, tab);
      }
    }
    
    // Add listeners
    chrome.windows.onCreated.addListener(handleWindowCreated);
    chrome.windows.onRemoved.addListener(handleWindowRemoved);
    chrome.tabs.onCreated.addListener(handleTabCreated);
    chrome.tabs.onUpdated.addListener(handleTabUpdated);
    
    console.log('[Background] Fallback listeners set up');
  } catch (error) {
    console.error('[Background] Critical error setting up fallback listeners:', error);
  }
}

/**
 * Remove fallback listeners to prevent duplicates
 */
function removeFallbackListeners() {
  if (self.fallbackListeners) {
    try {
      chrome.windows.onCreated.removeListener(self.fallbackListeners.windowCreated);
      chrome.windows.onRemoved.removeListener(self.fallbackListeners.windowRemoved);
      chrome.tabs.onCreated.removeListener(self.fallbackListeners.tabCreated);
      chrome.tabs.onUpdated.removeListener(self.fallbackListeners.tabUpdated);
      console.log('[Background] Removed previous fallback listeners');
    } catch (error) {
      console.error('[Background] Error removing listeners:', error);
    }
  }
}

/**
 * Load required modules
 */
async function loadModules() {
  try {
    console.log('[Background] Loading modules');
    
    // Load TabManager
    const tabModule = await Promise.race([
      import('./modules/tabManager.js'),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('TabManager import timeout')), 5000)
      )
    ]);
    
    TabManager = tabModule.default || tabModule.TabManager;
    
    if (!TabManager) {
      throw new Error('TabManager not found in imported module');
    }
    
    console.log('[Background] TabManager loaded successfully');
    
    // Load Diagnostic tools
    try {
      const diagModule = await Promise.race([
        import('./modules/diagnostic.js'),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Diagnostic import timeout')), 5000)
        )
      ]);
      
      Diagnostic = diagModule.default || diagModule.Diagnostic;
      console.log('[Background] Diagnostic module loaded');
    } catch (error) {
      console.warn('[Background] Diagnostic module not available:', error);
      // This is optional, so we continue without it
    }
    
  } catch (error) {
    console.error('[Background] Error loading modules:', error);
    throw error;
  }
}

/**
 * Redirect a tab to our custom new tab page
 * @param {number} tabId - Tab ID to redirect
 */
function redirectToCustomNewTab(tabId) {
  if (!tabId) {
    console.error('[Background] Invalid tab ID for redirect');
    return;
  }
  
  console.log(`[Background] Redirecting tab ${tabId} to custom new tab`);
  
  // Check tab exists first
  chrome.tabs.get(tabId).then(tab => {
    // Only redirect if this is a new tab
    if (tab.url === 'chrome://newtab/' || tab.url === 'about:blank') {
      // Small delay to ensure the tab is fully created before redirecting
      setTimeout(() => {
        chrome.tabs.update(tabId, { url: chrome.runtime.getURL('newtab.html') })
          .then(() => console.log(`[Background] Successfully redirected tab ${tabId}`))
          .catch(error => {
            console.error(`[Background] Error redirecting tab ${tabId}:`, error);
            // Check if tab was closed
            chrome.tabs.get(tabId).catch(() => {
              console.log(`[Background] Tab ${tabId} was likely closed before redirect completed`);
            });
          });
      }, 50);
    } else {
      console.log(`[Background] Not redirecting tab ${tabId} because it's not a new tab: ${tab.url}`);
    }
  }).catch(error => {
    console.error(`[Background] Tab ${tabId} doesn't exist or can't be accessed:`, error);
  });
}

// Register newtab override directly via the onUpdated listener
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Use the TabManager if available, otherwise fallback to direct handling
  if (isInitialized && TabManager) {
    try {
      // Only handle tabs that are loading the new tab page
      if (changeInfo.status === 'loading' && 
         (tab.url === 'chrome://newtab/' || tab.url === 'about:blank')) {
        const windowId = tab.windowId;
        
        // Check if we should override this tab
        if (TabManager.shouldOverrideTab(windowId, tabId)) {
          console.log(`[Background] TabManager decided to override tab ${tabId} in window ${windowId}`);
          redirectToCustomNewTab(tabId);
        } else {
          console.log(`[Background] TabManager decided NOT to override tab ${tabId} in window ${windowId}`);
        }
      }
    } catch (error) {
      console.error('[Background] Error in tab update handler:', error);
    }
  }
  // Don't fallback here - the fallback listener handles this separately
});

/**
 * Handle extension installation and updates
 */
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[Background] Extension installed/updated:', details.reason);
  
  // Reset state on update or install
  isInitialized = false;
  initializationInProgress = false;
  
  // Initialize the service worker
  initializeBackgroundWorker();
});

// Handle incoming messages from other parts of the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    if (message.action === 'getStatus') {
      // Return the current status of the extension
      sendResponse({
        isInitialized,
        hasTabManager: !!TabManager,
        hasDiagnostic: !!Diagnostic
      });
      return true;
    } else if (message.action === 'resetTabCounts') {
      // Reset tab counts for debugging
      if (TabManager) {
        TabManager.resetTabCounts();
        sendResponse({ success: true });
      } else if (self.fallbackWindowMap) {
        Object.keys(self.fallbackWindowMap).forEach(windowId => {
          self.fallbackWindowMap[windowId] = {
            newTabCount: 0,
            firstTabSkipped: false
          };
        });
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: 'No tab tracking available' });
      }
      return true;
    } else if (message.action === 'runDiagnostic') {
      // Run diagnostic and return results
      if (Diagnostic) {
        Diagnostic.logCurrentState()
          .then(() => sendResponse({ success: true }))
          .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Keep channel open for async response
      } else {
        sendResponse({ success: false, error: 'Diagnostic module not available' });
      }
      return true;
    }
  } catch (error) {
    console.error('[Background] Error handling message:', error, message);
    sendResponse({ success: false, error: error.message });
    return true;
  }
});

// Initialize on service worker startup
initializeBackgroundWorker();

// Force initialization on service worker wake-up
chrome.runtime.onStartup.addListener(() => {
  console.log('[Background] Browser startup detected, initializing extension');
  // Reset state on browser startup
  isInitialized = false;
  initializationInProgress = false;
  initializeBackgroundWorker();
});

// Handle unexpected errors
self.addEventListener('error', (event) => {
  console.error('[Background] Unhandled error:', event.message, event.error);
  
  // If not initialized, try to init again
  if (!isInitialized && !initializationInProgress) {
    console.log('[Background] Attempting recovery after error');
    setTimeout(() => {
      initializeBackgroundWorker();
    }, 2000);
  }
});

// Handle unhandled promise rejections
self.addEventListener('unhandledrejection', (event) => {
  console.error('[Background] Unhandled promise rejection:', event.reason);
  
  // If not initialized, try to init again
  if (!isInitialized && !initializationInProgress) {
    console.log('[Background] Attempting recovery after promise rejection');
    setTimeout(() => {
      initializeBackgroundWorker();
    }, 2000);
  }
}); 