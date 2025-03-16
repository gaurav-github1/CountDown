/**
 * diagnostic.js
 * 
 * Provides diagnostic utilities for debugging tab management issues
 */

const Diagnostic = (() => {
  // Log history (most recent at the end)
  const _logHistory = [];
  const MAX_LOG_HISTORY = 100;
  
  // Wrap console methods to capture logs
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info
  };
  
  /**
   * Initialize the diagnostic tools
   */
  const initialize = () => {
    try {
      // Override console methods to capture logs
      if (typeof console !== 'undefined') {
        console.log = (...args) => {
          _captureLog('log', ...args);
          originalConsole.log(...args);
        };
        
        console.warn = (...args) => {
          _captureLog('warn', ...args);
          originalConsole.warn(...args);
        };
        
        console.error = (...args) => {
          _captureLog('error', ...args);
          originalConsole.error(...args);
        };
        
        console.info = (...args) => {
          _captureLog('info', ...args);
          originalConsole.info(...args);
        };
      }
      
      console.info('[Diagnostic] Diagnostic tools initialized');
      
      // Set up global error handlers
      _setupErrorHandlers();
      
      return true;
    } catch (error) {
      originalConsole.error('[Diagnostic] Error initializing diagnostic tools:', error);
      return false;
    }
  };
  
  /**
   * Capture log entries
   * @param {string} level - Log level (log, warn, error, info)
   * @param {...any} args - Log arguments
   * @private
   */
  const _captureLog = (level, ...args) => {
    try {
      // Create a string representation of the log
      let logString = args.map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg);
          } catch (e) {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');
      
      // Add timestamp and level
      const entry = {
        timestamp: new Date().toISOString(),
        level,
        message: logString
      };
      
      // Add to history, keeping max size
      _logHistory.push(entry);
      if (_logHistory.length > MAX_LOG_HISTORY) {
        _logHistory.shift();
      }
    } catch (error) {
      // Use original console to avoid infinite recursion
      originalConsole.error('[Diagnostic] Error capturing log:', error);
    }
  };
  
  /**
   * Set up global error handlers
   * @private
   */
  const _setupErrorHandlers = () => {
    try {
      // Global error handler
      if (typeof window !== 'undefined') {
        window.addEventListener('error', (event) => {
          _captureLog('error', `[UNCAUGHT ERROR] ${event.message} at ${event.filename}:${event.lineno}:${event.colno}`);
        });
        
        // Unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
          _captureLog('error', `[UNHANDLED REJECTION] ${event.reason}`);
        });
      } else if (typeof self !== 'undefined') {
        // For service workers
        self.addEventListener('error', (event) => {
          _captureLog('error', `[UNCAUGHT ERROR] ${event.message}`);
        });
        
        self.addEventListener('unhandledrejection', (event) => {
          _captureLog('error', `[UNHANDLED REJECTION] ${event.reason}`);
        });
      }
      
      console.info('[Diagnostic] Error handlers set up');
    } catch (error) {
      originalConsole.error('[Diagnostic] Error setting up error handlers:', error);
    }
  };

  /**
   * Log the current state of all windows and tabs
   * @returns {Promise<object>} The diagnostic information
   */
  const logCurrentState = async () => {
    console.group('=== EXTENSION DIAGNOSTIC STATE ===');
    
    try {
      const diagnosticInfo = await collectDiagnosticInfo();
      
      // Log the diagnostic info
      console.log(`Total windows: ${diagnosticInfo.windows.length}`);
      
      // Log details for each window
      diagnosticInfo.windows.forEach(win => {
        console.group(`Window ${win.id} (${win.type})`);
        
        // Log the tabs in this window
        console.log(`Total tabs: ${win.tabs.length}`);
        win.tabs.forEach(tab => {
          console.log(`Tab ${tab.id}: ${tab.url || tab.pendingUrl || 'No URL'} (${tab.status})`);
        });
        
        console.groupEnd();
      });
      
      // Log extension info
      console.log(`Extension: ${diagnosticInfo.extension.name} v${diagnosticInfo.extension.version}`);
      console.log(`Service worker: ${diagnosticInfo.extension.serviceWorker}`);
      console.log(`TabManager initialized: ${diagnosticInfo.tabManager.isInitialized}`);
      
      console.groupEnd();
      return diagnosticInfo;
    } catch (error) {
      console.error('Error generating diagnostic info:', error);
      console.groupEnd();
      throw error;
    }
  };
  
  /**
   * Collect diagnostic information about the extension
   * @returns {Promise<object>} Diagnostic information
   */
  const collectDiagnosticInfo = async () => {
    try {
      // Get all windows with their tabs
      const windows = await chrome.windows.getAll({ populate: true });
      
      // Check TabManager status if available
      let tabManagerInfo = {
        isAvailable: false,
        isInitialized: false,
        windowMap: null
      };
      
      // Try to get TabManager info - note this will only work in a context
      // where TabManager is directly accessible (not from content scripts)
      try {
        if (typeof TabManager !== 'undefined') {
          tabManagerInfo.isAvailable = true;
          tabManagerInfo.isInitialized = TabManager.isInitialized ? TabManager.isInitialized() : false;
          tabManagerInfo.windowMap = TabManager.getWindowMap ? TabManager.getWindowMap() : null;
        } else if (typeof window !== 'undefined' && window.TabManager) {
          tabManagerInfo.isAvailable = true;
          tabManagerInfo.isInitialized = window.TabManager.isInitialized ? window.TabManager.isInitialized() : false;
          tabManagerInfo.windowMap = window.TabManager.getWindowMap ? window.TabManager.getWindowMap() : null;
        }
      } catch (error) {
        console.warn('[Diagnostic] Error accessing TabManager:', error);
      }
      
      // Get extension manifest
      const manifest = chrome.runtime.getManifest();
      
      // Build diagnostic info object
      const diagnosticInfo = {
        timestamp: new Date().toISOString(),
        windows,
        extension: {
          name: manifest.name,
          version: manifest.version,
          serviceWorker: chrome.runtime.getURL('js/background.js'),
          permissions: manifest.permissions || []
        },
        tabManager: tabManagerInfo,
        logHistory: getLogHistory()
      };
      
      return diagnosticInfo;
    } catch (error) {
      console.error('[Diagnostic] Error collecting diagnostic info:', error);
      throw error;
    }
  };
  
  /**
   * Create a test tab to verify tab override behavior
   * @returns {Promise<chrome.tabs.Tab>} The created tab
   */
  const createTestTab = async () => {
    try {
      console.log('[Diagnostic] Creating test tab...');
      const tab = await chrome.tabs.create({ url: 'chrome://newtab/' });
      console.log(`[Diagnostic] Test tab created: ${tab.id}`);
      return tab;
    } catch (error) {
      console.error('[Diagnostic] Error creating test tab:', error);
      throw error;
    }
  };
  
  /**
   * Reset all window tracking data
   * @returns {Promise<boolean>} Whether the reset was successful
   */
  const resetTracking = async () => {
    try {
      console.log('[Diagnostic] Resetting tab tracking data...');
      
      // Try direct access first
      if (typeof TabManager !== 'undefined' && TabManager.resetTabCounts) {
        TabManager.resetTabCounts();
        console.log('[Diagnostic] Tab tracking data reset via direct access');
        return true;
      }
      
      // Try window access
      if (typeof window !== 'undefined' && window.TabManager && window.TabManager.resetTabCounts) {
        window.TabManager.resetTabCounts();
        console.log('[Diagnostic] Tab tracking data reset via window access');
        return true;
      }
      
      // Try message to background
      const response = await chrome.runtime.sendMessage({
        action: 'resetTabCounts'
      });
      
      if (response && response.success) {
        console.log('[Diagnostic] Tab tracking data reset via messaging');
        return true;
      }
      
      console.error('[Diagnostic] Failed to reset tab tracking data:', response);
      return false;
    } catch (error) {
      console.error('[Diagnostic] Error resetting tracking data:', error);
      return false;
    }
  };
  
  /**
   * Get captured log history
   * @returns {Array} Log history
   */
  const getLogHistory = () => {
    return [..._logHistory];
  };
  
  /**
   * Clear log history
   */
  const clearLogHistory = () => {
    _logHistory.length = 0;
    console.log('[Diagnostic] Log history cleared');
  };
  
  /**
   * Download diagnostic information as JSON
   */
  const downloadDiagnosticInfo = async () => {
    try {
      const diagnosticInfo = await collectDiagnosticInfo();
      
      // Create a data URL for the JSON
      const jsonString = JSON.stringify(diagnosticInfo, null, 2);
      const dataUrl = `data:application/json;charset=utf-8,${encodeURIComponent(jsonString)}`;
      
      // Create a link and click it to download
      if (typeof document !== 'undefined') {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `chrome-extension-diagnostic-${new Date().toISOString().replace(/:/g, '-')}.json`;
        link.click();
        
        console.log('[Diagnostic] Diagnostic info downloaded');
        return true;
      } else {
        console.warn('[Diagnostic] Cannot download - not in a document context');
        return false;
      }
    } catch (error) {
      console.error('[Diagnostic] Error downloading diagnostic info:', error);
      return false;
    }
  };
  
  /**
   * Test tab override functionality
   * @returns {Promise<object>} Test results
   */
  const testTabOverride = async () => {
    try {
      console.group('[Diagnostic] Testing tab override functionality');
      
      // Record start time
      const startTime = Date.now();
      
      // Get current window
      const windows = await chrome.windows.getAll({ populate: true });
      const currentWindow = windows[0];
      
      console.log(`[Diagnostic] Using window ${currentWindow.id} for testing`);
      
      // Create first tab - should be default Chrome new tab
      console.log('[Diagnostic] Creating first tab (should NOT be overridden)...');
      const firstTab = await chrome.tabs.create({ 
        url: 'chrome://newtab/',
        windowId: currentWindow.id
      });
      
      // Wait 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Get the current URL of the first tab
      const firstTabInfo = await chrome.tabs.get(firstTab.id);
      const firstTabIsDefault = firstTabInfo.url === 'chrome://newtab/';
      
      console.log(`[Diagnostic] First tab URL: ${firstTabInfo.url}`);
      console.log(`[Diagnostic] First tab is default new tab: ${firstTabIsDefault}`);
      
      // Create second tab - should be custom new tab
      console.log('[Diagnostic] Creating second tab (should be overridden)...');
      const secondTab = await chrome.tabs.create({ 
        url: 'chrome://newtab/',
        windowId: currentWindow.id
      });
      
      // Wait 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Get the current URL of the second tab
      const secondTabInfo = await chrome.tabs.get(secondTab.id);
      const customNewTabUrl = chrome.runtime.getURL('newtab.html');
      const secondTabIsCustom = secondTabInfo.url === customNewTabUrl;
      
      console.log(`[Diagnostic] Second tab URL: ${secondTabInfo.url}`);
      console.log(`[Diagnostic] Custom new tab URL: ${customNewTabUrl}`);
      console.log(`[Diagnostic] Second tab is custom new tab: ${secondTabIsCustom}`);
      
      // Record end time
      const endTime = Date.now();
      
      // Prepare results
      const results = {
        success: firstTabIsDefault && secondTabIsCustom,
        firstTab: {
          id: firstTab.id,
          url: firstTabInfo.url,
          isDefault: firstTabIsDefault
        },
        secondTab: {
          id: secondTab.id,
          url: secondTabInfo.url,
          isCustom: secondTabIsCustom
        },
        window: currentWindow.id,
        duration: endTime - startTime,
        timestamp: new Date().toISOString()
      };
      
      console.log(`[Diagnostic] Test ${results.success ? 'PASSED' : 'FAILED'}`);
      console.groupEnd();
      
      return results;
    } catch (error) {
      console.error('[Diagnostic] Error during tab override test:', error);
      console.groupEnd();
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  };
  
  // Initialize on creation
  initialize();
  
  // Public API
  return {
    logCurrentState,
    collectDiagnosticInfo,
    createTestTab,
    resetTracking,
    getLogHistory,
    clearLogHistory,
    downloadDiagnosticInfo,
    testTabOverride
  };
})();

// Export for ES modules
export { Diagnostic };
export default Diagnostic; 