/**
 * TabManager.js
 * 
 * Manages browser tabs and windows, tracking the number of new tabs
 * and determining when to show a custom new tab page.
 */

const TabManager = (() => {
  // Private properties
  const _windowTabsMap = {};
  const _eventHandlers = {
    onTabOverride: []
  };
  
  // Track whether module is initialized
  let _isInitialized = false;
  let _initializationPromise = null;
  
  // Last error
  let _lastError = null;
  
  // Protected tab IDs (to prevent double redirects)
  const _protectedTabs = new Set();
  
  // Active listeners (for cleanup)
  const _activeListeners = {
    windowCreated: _handleWindowCreated,
    windowRemoved: _handleWindowRemoved,
    tabCreated: _handleNewTab
  };

  /**
   * Initialize the TabManager by scanning existing windows and tabs
   * @returns {Promise} Resolves when initialization is complete
   */
  const initialize = async () => {
    // If already initialized, return early
    if (_isInitialized) {
      console.log('[TabManager] Already initialized');
      return true;
    }
    
    // If initialization is in progress, return that promise
    if (_initializationPromise) {
      return _initializationPromise;
    }
    
    console.log('[TabManager] Initializing');
    
    // Create a new initialization promise
    _initializationPromise = (async () => {
      try {
        // Reset state in case of reinitialization
        Object.keys(_windowTabsMap).forEach(key => delete _windowTabsMap[key]);
        _protectedTabs.clear();
        
        // Remove any existing listeners to prevent duplicates
        _removeEventListeners();
        
        // Get all windows with their tabs
        const windows = await chrome.windows.getAll({ populate: true });
        
        // Initialize the window map
        windows.forEach(win => {
          _windowTabsMap[win.id] = {
            newTabCount: 0,
            firstTabSkipped: false
          };
          
          // Count existing new tabs in this window
          const newTabs = win.tabs.filter(tab => 
            tab.url === 'chrome://newtab/' || 
            tab.pendingUrl === 'chrome://newtab/' ||
            tab.url === 'about:blank'
          );
          
          if (newTabs.length > 0) {
            _windowTabsMap[win.id].newTabCount = newTabs.length;
            _windowTabsMap[win.id].firstTabSkipped = true;
          }
        });
        
        console.log('[TabManager] Initialized window map:', _windowTabsMap);
        
        // Set up event listeners
        _setupEventListeners();
        
        // Start cleanup timer
        _startCleanupTimer();
        
        _isInitialized = true;
        _lastError = null;
        return true;
      } catch (error) {
        _lastError = error;
        console.error('[TabManager] Error during initialization:', error);
        throw error;
      } finally {
        // Clear the promise regardless of success or failure
        _initializationPromise = null;
      }
    })();
    
    return _initializationPromise;
  };

  /**
   * Remove any existing event listeners
   * @private
   */
  const _removeEventListeners = () => {
    try {
      chrome.windows.onCreated.removeListener(_activeListeners.windowCreated);
      chrome.windows.onRemoved.removeListener(_activeListeners.windowRemoved);
      chrome.tabs.onCreated.removeListener(_activeListeners.tabCreated);
      console.log('[TabManager] Removed existing event listeners');
    } catch (error) {
      console.warn('[TabManager] Error removing listeners:', error);
    }
  };

  /**
   * Set up Chrome event listeners for window and tab events
   * @private
   */
  const _setupEventListeners = () => {
    // Window creation listener
    chrome.windows.onCreated.addListener(_activeListeners.windowCreated);
    
    // Window removal listener
    chrome.windows.onRemoved.addListener(_activeListeners.windowRemoved);
    
    // Tab creation listener
    chrome.tabs.onCreated.addListener(_activeListeners.tabCreated);
    
    console.log('[TabManager] Event listeners set up');
  };

  /**
   * Start a timer to clean up orphaned window data
   * @private
   */
  const _startCleanupTimer = () => {
    // Run cleanup every 5 minutes
    setInterval(_cleanupOrphanedData, 5 * 60 * 1000);
    console.log('[TabManager] Cleanup timer started');
  };

  /**
   * Clean up orphaned window and tab data
   * @private
   */
  const _cleanupOrphanedData = async () => {
    try {
      console.log('[TabManager] Running cleanup...');
      
      // Get current windows
      const windows = await chrome.windows.getAll();
      const currentWindowIds = new Set(windows.map(win => win.id));
      
      // Remove any windows from our map that no longer exist
      const windowIdsInMap = Object.keys(_windowTabsMap).map(Number);
      const orphanedWindows = windowIdsInMap.filter(id => !currentWindowIds.has(id));
      
      orphanedWindows.forEach(windowId => {
        delete _windowTabsMap[windowId];
        console.log(`[TabManager] Cleaned up orphaned window: ${windowId}`);
      });
      
      // Also clean up protected tab set
      // (can't easily check if tabs still exist, so we'll just clear those older than 30 seconds)
      // This isn't critical as the Set will be garbage collected if it gets too large
      console.log(`[TabManager] Cleanup complete. Removed ${orphanedWindows.length} orphaned windows.`);
    } catch (error) {
      console.error('[TabManager] Error during cleanup:', error);
    }
  };

  /**
   * Handle window creation
   * @param {Window} window - The created window
   * @private
   */
  function _handleWindowCreated(window) {
    try {
      _windowTabsMap[window.id] = {
        newTabCount: 0,
        firstTabSkipped: false
      };
      
      console.log(`[TabManager] New window created: ${window.id}`);
    } catch (error) {
      console.error('[TabManager] Error handling window creation:', error);
    }
  }

  /**
   * Handle window removal
   * @param {number} windowId - ID of the removed window
   * @private
   */
  function _handleWindowRemoved(windowId) {
    try {
      delete _windowTabsMap[windowId];
      console.log(`[TabManager] Window removed: ${windowId}`);
    } catch (error) {
      console.error('[TabManager] Error handling window removal:', error);
    }
  }

  /**
   * Handle new tab creation
   * @param {Tab} tab - The created tab
   * @private
   */
  function _handleNewTab(tab) {
    try {
      // Check if this is a new tab page using both url and pendingUrl
      // Chrome sometimes sets pendingUrl first, then url later
      const isNewTabPage = 
        tab.url === 'chrome://newtab/' || 
        tab.pendingUrl === 'chrome://newtab/' ||
        tab.url === 'about:blank';
      
      // If it's not a new tab, we don't need to do anything
      if (!isNewTabPage) {
        return;
      }
      
      // If we've already processed this tab, skip it
      if (_protectedTabs.has(tab.id)) {
        console.log(`[TabManager] Tab ${tab.id} is protected, skipping`);
        return;
      }
      
      const windowId = tab.windowId;
      
      // Create entry for this window if it doesn't exist
      if (!_windowTabsMap[windowId]) {
        _windowTabsMap[windowId] = {
          newTabCount: 0,
          firstTabSkipped: false
        };
      }
      
      // Increment the new tab count for this window
      _windowTabsMap[windowId].newTabCount++;
      
      console.log(`[TabManager] New tab ${tab.id} in window ${windowId}, count: ${_windowTabsMap[windowId].newTabCount}, firstSkipped: ${_windowTabsMap[windowId].firstTabSkipped}`);
      
      // If this is the first new tab in this window, skip overriding
      if (_windowTabsMap[windowId].newTabCount === 1 && !_windowTabsMap[windowId].firstTabSkipped) {
        _windowTabsMap[windowId].firstTabSkipped = true;
        console.log(`[TabManager] First new tab in window ${windowId}, skipping override`);
        
        // Add to protected tabs set briefly to prevent double-handling
        _protectedTabs.add(tab.id);
        setTimeout(() => _protectedTabs.delete(tab.id), 5000);
        
        return;
      }
      
      // For subsequent tabs, trigger the override event
      console.log(`[TabManager] Triggering override for tab ${tab.id} in window ${windowId}`);
      
      // Add to protected tabs set briefly to prevent double-handling
      _protectedTabs.add(tab.id);
      setTimeout(() => _protectedTabs.delete(tab.id), 5000);
      
      _triggerEvent('onTabOverride', tab);
    } catch (error) {
      console.error('[TabManager] Error handling new tab:', error, tab);
    }
  }

  /**
   * Register an event handler
   * @param {string} eventName - Name of the event
   * @param {Function} handler - Event handler function
   * @returns {boolean} Whether the handler was registered
   */
  const on = (eventName, handler) => {
    if (!handler || typeof handler !== 'function') {
      console.error('[TabManager] Invalid handler provided for event:', eventName);
      return false;
    }
    
    if (_eventHandlers[eventName]) {
      // Check if handler already exists to prevent duplicates
      if (_eventHandlers[eventName].some(h => h === handler)) {
        console.warn('[TabManager] Handler already registered for event:', eventName);
        return true;
      }
      
      _eventHandlers[eventName].push(handler);
      return true;
    }
    return false;
  };

  /**
   * Remove an event handler
   * @param {string} eventName - Name of the event
   * @param {Function} handler - Event handler function to remove
   * @returns {boolean} Whether the handler was removed
   */
  const off = (eventName, handler) => {
    if (_eventHandlers[eventName]) {
      const index = _eventHandlers[eventName].indexOf(handler);
      if (index !== -1) {
        _eventHandlers[eventName].splice(index, 1);
        return true;
      }
    }
    return false;
  };

  /**
   * Trigger an event
   * @param {string} eventName - Name of the event
   * @param {*} data - Event data
   * @private
   */
  const _triggerEvent = (eventName, data) => {
    if (_eventHandlers[eventName] && _eventHandlers[eventName].length > 0) {
      _eventHandlers[eventName].forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`[TabManager] Error in ${eventName} handler:`, error);
        }
      });
    }
  };

  /**
   * Get a copy of the current window map
   * @returns {Object} Window map
   */
  const getWindowMap = () => {
    return JSON.parse(JSON.stringify(_windowTabsMap));
  };

  /**
   * Check if a tab should use the custom new tab page
   * @param {number} windowId - Window ID
   * @param {number} tabId - Tab ID
   * @returns {boolean} True if tab should use custom page
   */
  const shouldOverrideTab = (windowId, tabId) => {
    try {
      // If the tab is protected (already being handled), don't override again
      if (_protectedTabs.has(tabId)) {
        console.log(`[TabManager] Tab ${tabId} is protected, not overriding`);
        return false;
      }
      
      // If we don't have this window in our map, it's a new window - don't override first tab
      if (!_windowTabsMap[windowId]) {
        console.log(`[TabManager] Window ${windowId} not in map, initializing and not overriding first tab`);
        _windowTabsMap[windowId] = {
          newTabCount: 1,
          firstTabSkipped: false
        };
        return false;
      }
      
      // If this is the first tab and we haven't skipped one yet, don't override
      if (_windowTabsMap[windowId].newTabCount <= 1 && !_windowTabsMap[windowId].firstTabSkipped) {
        _windowTabsMap[windowId].firstTabSkipped = true;
        console.log(`[TabManager] First tab in window ${windowId}, not overriding`);
        return false;
      }
      
      // Otherwise, override the tab
      console.log(`[TabManager] Tab ${tabId} in window ${windowId} should be overridden`);
      
      // Add to protected tabs set briefly to prevent double-handling
      _protectedTabs.add(tabId);
      setTimeout(() => _protectedTabs.delete(tabId), 5000);
      
      return true;
    } catch (error) {
      console.error('[TabManager] Error in shouldOverrideTab:', error);
      return false; // Default to not overriding on error
    }
  };

  /**
   * Reset tab counts for all windows
   */
  const resetTabCounts = () => {
    try {
      Object.keys(_windowTabsMap).forEach(windowId => {
        _windowTabsMap[windowId] = {
          newTabCount: 0,
          firstTabSkipped: false
        };
      });
      
      console.log('[TabManager] Tab counts reset');
      return true;
    } catch (error) {
      console.error('[TabManager] Error resetting tab counts:', error);
      return false;
    }
  };

  /**
   * Reset a specific window's tab count
   * @param {number} windowId - Window ID to reset
   * @returns {boolean} Whether the window was reset
   */
  const resetWindow = (windowId) => {
    try {
      if (_windowTabsMap[windowId]) {
        _windowTabsMap[windowId] = {
          newTabCount: 0,
          firstTabSkipped: false
        };
        console.log(`[TabManager] Reset window ${windowId}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[TabManager] Error resetting window:', error);
      return false;
    }
  };

  /**
   * Get the module's initialization status
   * @returns {boolean} Whether the module is initialized
   */
  const isInitialized = () => {
    return _isInitialized;
  };

  /**
   * Get the last error that occurred
   * @returns {Error|null} The last error or null
   */
  const getLastError = () => {
    return _lastError;
  };

  /**
   * Shutdown the module, removing all event listeners
   * @returns {boolean} Whether shutdown was successful
   */
  const shutdown = () => {
    try {
      _removeEventListeners();
      Object.keys(_windowTabsMap).forEach(key => delete _windowTabsMap[key]);
      _protectedTabs.clear();
      
      // Clear all event handlers
      Object.keys(_eventHandlers).forEach(key => {
        _eventHandlers[key] = [];
      });
      
      _isInitialized = false;
      console.log('[TabManager] Shutdown complete');
      return true;
    } catch (error) {
      console.error('[TabManager] Error during shutdown:', error);
      return false;
    }
  };

  // Public API
  return {
    initialize,
    on,
    off,
    getWindowMap,
    resetTabCounts,
    resetWindow,
    shouldOverrideTab,
    isInitialized,
    getLastError,
    shutdown
  };
})();

// Export for ES modules
export { TabManager };
export default TabManager; 