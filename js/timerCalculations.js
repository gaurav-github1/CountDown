/**
 * TimerCalculator - Handles timer calculations
 * 
 * Calculates time remaining for different timer types (life, birthday, daily)
 * Uses ModuleRegistry pattern to prevent redeclaration errors
 */

// Use IIFE to prevent global namespace pollution
(function() {
    // Skip if already registered
    if (window.ModuleRegistry && window.ModuleRegistry.isRegistered('TimerCalculator')) {
        console.log('TimerCalculator already registered, skipping definition');
        return;
    }
    
    /**
     * TimerCalculator class for handling timer calculations
     */
    class TimerCalculator {
        constructor() {
            // Debug mode flag
            this.debug = window.DEBUG_MODE || false;
        }
        
        /**
         * Calculate life timer (time remaining in life based on life expectancy)
         * @param {string} birthDateString - Birth date in YYYY-MM-DD format
         * @param {number} lifeExpectancy - Life expectancy in years
         * @returns {Object} Object containing years, months, days, hours, minutes, seconds remaining
         */
        calculateLifeTimer(birthDateString, lifeExpectancy = 80) {
            try {
                this.log('Calculating life timer');
                
                // Get current date and time
                const now = new Date();
                
                // Parse birth date
                let birthDate;
                try {
                    birthDate = new Date(birthDateString);
                    
                    // Validate birth date
                    if (isNaN(birthDate.getTime())) {
                        throw new Error('Invalid birth date');
                    }
                } catch (error) {
                    console.error('Error parsing birth date:', error);
                    return this.getDefaultTimerData('Invalid birth date. Please check your settings.');
                }
                
                // Calculate end date (birth date + life expectancy years)
                const endDate = new Date(birthDate);
                endDate.setFullYear(birthDate.getFullYear() + lifeExpectancy);
                
                // If end date is in the past, life expectancy has been reached
                if (endDate < now) {
                    this.log('Life expectancy reached');
                    return this.getDefaultTimerData('Life expectancy reached.');
                }
                
                // Calculate time difference
                const result = this.calculateTimeDifference(now, endDate);
                
                // Calculate more accurate progress percentage for life timer
                const totalLifeMs = endDate.getTime() - birthDate.getTime();
                const elapsedLifeMs = now.getTime() - birthDate.getTime();
                const progressPercentage = (elapsedLifeMs / totalLifeMs) * 100;
                
                result.progressPercentage = progressPercentage;
                
                return result;
                
            } catch (error) {
                console.error('Error calculating life timer:', error);
                return this.getDefaultTimerData('Error calculating life timer.');
            }
        }
        
        /**
         * Calculate birthday timer (time until next birthday)
         * @param {string} birthDateString - Birth date in YYYY-MM-DD format
         * @returns {Object} Object containing years, months, days, hours, minutes, seconds until next birthday
         */
        calculateBirthdayTimer(birthDateString) {
            try {
                this.log('Calculating birthday timer');
                
                // Get current date and time
                const now = new Date();
                
                // Parse birth date
                let birthDate;
                try {
                    birthDate = new Date(birthDateString);
                    
                    // Validate birth date
                    if (isNaN(birthDate.getTime())) {
                        throw new Error('Invalid birth date');
                    }
                } catch (error) {
                    console.error('Error parsing birth date:', error);
                    return this.getDefaultTimerData('Invalid birth date. Please check your settings.');
                }
                
                // Calculate next birthday
                const nextBirthday = new Date(now.getFullYear(), birthDate.getMonth(), birthDate.getDate());
                
                // If birthday has already occurred this year, set to next year
                if (nextBirthday < now) {
                    nextBirthday.setFullYear(now.getFullYear() + 1);
                }
                
                // Calculate previous birthday
                const prevBirthday = new Date(nextBirthday);
                prevBirthday.setFullYear(prevBirthday.getFullYear() - 1);
                
                // Calculate time difference
                const result = this.calculateTimeDifference(now, nextBirthday);
                
                // Calculate more accurate progress percentage for birthday timer
                const totalDuration = nextBirthday.getTime() - prevBirthday.getTime();
                const elapsed = now.getTime() - prevBirthday.getTime();
                const progressPercentage = (elapsed / totalDuration) * 100;
                
                result.progressPercentage = progressPercentage;
                
                // Add age information
                const age = now.getFullYear() - birthDate.getFullYear() - (nextBirthday > now ? 0 : 1);
                result.message = `Countdown to your ${age + 1}${this.getOrdinalSuffix(age + 1)} birthday`;
                
                return result;
                
            } catch (error) {
                console.error('Error calculating birthday timer:', error);
                return this.getDefaultTimerData('Error calculating birthday timer.');
            }
        }
        
        /**
         * Calculate daily timer (time until midnight)
         * @returns {Object} Object containing hours, minutes, seconds until midnight
         */
        calculateDailyTimer() {
            try {
                this.log('Calculating daily timer');
                
                // Get current date and time
                const now = new Date();
                
                // Calculate midnight
                const midnight = new Date(now);
                midnight.setHours(24, 0, 0, 0);
                
                // Calculate the start of the day
                const startOfDay = new Date(now);
                startOfDay.setHours(0, 0, 0, 0);
                
                // Calculate time difference
                const result = this.calculateTimeDifference(now, midnight);
                result.years = 0;
                result.months = 0;
                result.days = 0;
                
                // Calculate more accurate progress percentage based on time of day
                const totalSecondsInDay = 24 * 60 * 60;
                const secondsSinceDayStart = (now.getTime() - startOfDay.getTime()) / 1000;
                result.progressPercentage = (secondsSinceDayStart / totalSecondsInDay) * 100;
                
                return result;
                
            } catch (error) {
                console.error('Error calculating daily timer:', error);
                return this.getDefaultTimerData('Error calculating daily timer.');
            }
        }
        
        /**
         * Calculate time difference between two dates
         * @param {Date} startDate - Start date
         * @param {Date} endDate - End date
         * @returns {Object} Object containing time units (years, months, days, hours, minutes, seconds)
         */
        calculateTimeDifference(startDate, endDate) {
            try {
                this.log(`Calculating time difference from ${startDate.toISOString()} to ${endDate.toISOString()}`);
                
                // Calculate total difference in milliseconds
                const diffMs = endDate.getTime() - startDate.getTime();
                
                // If end date is in the past, return zero values
                if (diffMs <= 0) {
                    return this.getZeroValues();
                }
                
                // Calculate time units
                const diffSeconds = Math.floor(diffMs / 1000) % 60;
                const diffMinutes = Math.floor(diffMs / (1000 * 60)) % 60;
                const diffHours = Math.floor(diffMs / (1000 * 60 * 60)) % 24;
                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) % 30;
                const diffMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30)) % 12;
                const diffYears = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365));
                
                // Calculate a simple progress percentage (for life expectancy)
                const totalMs = endDate.getTime() - startDate.getTime();
                const progressPercentage = ((totalMs - diffMs) / totalMs) * 100;
                
                return {
                    years: diffYears,
                    months: diffMonths,
                    days: diffDays,
                    hours: diffHours,
                    minutes: diffMinutes,
                    seconds: diffSeconds,
                    progressPercentage: progressPercentage,
                    isPassed: false
                };
                
            } catch (error) {
                console.error('Error calculating time difference:', error);
                return this.getZeroValues();
            }
        }
        
        /**
         * Get zero values for all time units
         * @returns {Object} Object with all time units set to zero
         */
        getZeroValues() {
            return {
                years: 0,
                months: 0,
                days: 0,
                hours: 0,
                minutes: 0,
                seconds: 0,
                progressPercentage: 100,
                isPassed: true
            };
        }
        
        /**
         * Get default timer data with an optional message
         * @param {string} message - Optional message to include
         * @returns {Object} Default timer data
         */
        getDefaultTimerData(message = '') {
            const data = this.getZeroValues();
            
            if (message) {
                data.message = message;
            }
            
            return data;
        }
        
        /**
         * Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
         * @param {number} n - Number
         * @returns {string} Ordinal suffix
         */
        getOrdinalSuffix(n) {
            const s = ["th", "st", "nd", "rd"];
            const v = n % 100;
            return s[(v - 20) % 10] || s[v] || s[0];
        }
        
        /**
         * Log message if debug mode is enabled
         * @param {string} message - Message to log
         * @param {any} [data] - Additional data to log
         */
        log(message, data) {
            if (this.debug) {
                if (data) {
                    console.log(`[TimerCalculator] ${message}`, data);
                } else {
                    console.log(`[TimerCalculator] ${message}`);
                }
            }
        }
    }
    
    // Register the TimerCalculator class with the ModuleRegistry
    if (window.ModuleRegistry) {
        window.ModuleRegistry.register('TimerCalculator', TimerCalculator);
    }
    
    // Make TimerCalculator globally available (safely)
    if (typeof window !== 'undefined') {
        window.TimerCalculator = TimerCalculator;
    }
})(); 