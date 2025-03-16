/**
 * ModuleRegistry - A simple module registry to manage modules
 * 
 * This registry helps prevent redeclaration of modules and provides a centralized
 * way to access modules throughout the application.
 */

(function() {
  // Create the module registry if it doesn't exist
  if (window.ModuleRegistry) {
    console.log('ModuleRegistry already exists, skipping definition');
    return;
  }
  
  class ModuleRegistry {
    constructor() {
      this.modules = {};
    }
    
    /**
     * Register a module with the registry
     * @param {string} name - Name of the module
     * @param {any} moduleClass - The module class or object
     * @returns {boolean} - Whether registration was successful
     */
    register(name, moduleClass) {
      if (!name || typeof name !== 'string') {
        console.error('Invalid module name');
        return false;
      }
      
      if (!moduleClass) {
        console.error('Invalid module class');
        return false;
      }
      
      if (this.modules[name]) {
        console.warn(`Module ${name} already registered`);
        return false;
      }
      
      this.modules[name] = moduleClass;
      console.log(`Module ${name} registered successfully`);
      return true;
    }
    
    /**
     * Get a module from the registry
     * @param {string} name - Name of the module
     * @returns {any} - The module class or object
     */
    get(name) {
      return this.modules[name];
    }
    
    /**
     * Check if a module is registered
     * @param {string} name - Name of the module
     * @returns {boolean} - Whether the module is registered
     */
    isRegistered(name) {
      return !!this.modules[name];
    }
    
    /**
     * Unregister a module from the registry
     * @param {string} name - Name of the module
     * @returns {boolean} - Whether unregistration was successful
     */
    unregister(name) {
      if (!this.modules[name]) {
        console.warn(`Module ${name} not registered`);
        return false;
      }
      
      delete this.modules[name];
      console.log(`Module ${name} unregistered successfully`);
      return true;
    }
    
    /**
     * Get all registered module names
     * @returns {string[]} - Array of registered module names
     */
    getRegisteredModules() {
      return Object.keys(this.modules);
    }
    
    /**
     * Initialize a module instance
     * @param {string} name - Name of the module
     * @param {any[]} args - Arguments to pass to the module constructor
     * @returns {any} - The module instance
     */
    createInstance(name, ...args) {
      const ModuleClass = this.get(name);
      
      if (!ModuleClass) {
        console.error(`Module ${name} not registered`);
        return null;
      }
      
      try {
        return new ModuleClass(...args);
      } catch (error) {
        console.error(`Error creating instance of ${name}:`, error);
        return null;
      }
    }
  }
  
  // Create a global module registry
  window.ModuleRegistry = new ModuleRegistry();
  console.log('ModuleRegistry initialized');
})(); 