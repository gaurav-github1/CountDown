/**
 * Timer Calculations Module for Countdown Timer Extension
 * Contains functions for calculating different types of countdowns
 */

class TimerCalculator {
  /**
   * Calculate the life timer (time until end of life expectancy)
   * @param {string} birthDateStr - Birth date in ISO format
   * @param {number} lifeExpectancy - Life expectancy in years
   * @returns {Object} Time remaining details or null if already passed
   */
  calculateLifeTimer(birthDateStr, lifeExpectancy) {
    if (!birthDateStr || !lifeExpectancy) {
      console.error('Invalid parameters for life timer calculation');
      return null;
    }

    try {
      const birthDate = new Date(birthDateStr);
      const now = new Date();
      
      // Validate birth date
      if (birthDate > now || isNaN(birthDate.getTime())) {
        console.error('Invalid birth date');
        return null;
      }
      
      // Calculate end date based on life expectancy more precisely
      // This accounts for leap years by adding the exact number of days
      const endDate = new Date(birthDate);
      
      // Add life expectancy years to birth date
      // This handles leap years correctly by keeping the same day and month
      endDate.setFullYear(birthDate.getFullYear() + lifeExpectancy);
      
      // Handle special case: if birthdate is Feb 29 and the target year is not a leap year
      if (birthDate.getMonth() === 1 && birthDate.getDate() === 29 && !this._isLeapYear(endDate.getFullYear())) {
        endDate.setDate(28); // Use Feb 28th instead
      }
      
      // If end date has passed, return appropriate message
      if (endDate <= now) {
        return {
          timeRemaining: 0,
          targetDate: endDate,
          isPassed: true,
          progressPercentage: 100,
          message: 'You have reached your estimated life expectancy. Every day is a gift!',
          years: 0,
          months: 0,
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0
        };
      }
      
      // Calculate time remaining
      const timeRemaining = this._calculateTimeRemaining(now, endDate);
      const progressPercentage = this._calculateLifeProgressPercentage(birthDate, endDate, now);
      
      return {
        ...timeRemaining,
        targetDate: endDate,
        isPassed: false,
        progressPercentage,
        message: null
      };
    } catch (error) {
      console.error('Error calculating life timer:', error);
      return this._getDefaultTimerData();
    }
  }
  
  /**
   * Calculate the birthday timer (time until next birthday)
   * @param {string} birthDateStr - Birth date in ISO format
   * @returns {Object} Time remaining details
   */
  calculateBirthdayTimer(birthDateStr) {
    if (!birthDateStr) {
      console.error('Invalid parameters for birthday timer calculation');
      return null;
    }

    try {
      const birthDate = new Date(birthDateStr);
      const now = new Date();
      
      // Validate birth date
      if (birthDate > now || isNaN(birthDate.getTime())) {
        console.error('Invalid birth date');
        return null;
      }
      
      // Get current year, month, and day for accurate comparison
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const currentDate = now.getDate();
      const birthMonth = birthDate.getMonth();
      const birthDay = birthDate.getDate();
      
      // Calculate next birthday
      let nextBirthdayYear = currentYear;
      
      // If this year's birthday has passed, next birthday is next year
      if (
        (birthMonth < currentMonth) || 
        (birthMonth === currentMonth && birthDay < currentDate)
      ) {
        nextBirthdayYear = currentYear + 1;
      }
      
      // Create date for next birthday
      const nextBirthday = new Date(nextBirthdayYear, birthMonth, birthDay);
      
      // Handle leap year birthdays (February 29)
      if (birthMonth === 1 && birthDay === 29) {
        // Check if next birthday year is not a leap year
        if (!this._isLeapYear(nextBirthdayYear)) {
          // Set to Feb 28 for non-leap years
          nextBirthday.setDate(28);
        }
      }
      
      // Calculate age on next birthday
      const nextAge = nextBirthdayYear - birthDate.getFullYear();
      
      // Check if it's birthday today - compare only month and day
      const isBirthdayToday = currentMonth === birthMonth && currentDate === birthDay;
      
      // Calculate time remaining
      const timeRemaining = this._calculateTimeRemaining(now, nextBirthday);
      
      // Calculate progress (days passed since last birthday and until next birthday)
      const lastBirthday = new Date(
        isBirthdayToday ? currentYear : (nextBirthdayYear - 1), 
        birthMonth, 
        birthDay
      );
      
      // Adjust for leap year if needed
      if (birthMonth === 1 && birthDay === 29 && !this._isLeapYear(lastBirthday.getFullYear())) {
        lastBirthday.setDate(28);
      }
      
      // Calculate days between birthdays accounting for leap years
      const daysFromLastTillNext = this._getDaysBetweenDates(lastBirthday, nextBirthday);
      const daysSinceLastBirthday = this._getDaysBetweenDates(lastBirthday, now);
      
      const progressPercentage = (daysSinceLastBirthday / daysFromLastTillNext) * 100;
      
      if (isBirthdayToday) {
        return {
          ...timeRemaining,
          targetDate: nextBirthday,
          nextAge,
          isPassed: true,
          progressPercentage: 0, // Reset progress on birthday
          message: `Happy ${nextAge}${this._getOrdinalSuffix(nextAge)} Birthday!`
        };
      }
      
      return {
        ...timeRemaining,
        targetDate: nextBirthday,
        nextAge,
        isPassed: false,
        progressPercentage,
        message: null
      };
    } catch (error) {
      console.error('Error calculating birthday timer:', error);
      return this._getDefaultTimerData();
    }
  }
  
  /**
   * Calculate the daily timer (time until midnight)
   * @returns {Object} Time remaining details
   */
  calculateDailyTimer() {
    try {
      const now = new Date();
      
      // Calculate midnight tonight in local time zone
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      
      // Calculate time remaining
      const timeRemaining = this._calculateTimeRemaining(now, midnight);
      
      // Calculate progress (percentage of day passed)
      const millisecondsInDay = 24 * 60 * 60 * 1000;
      const millisecondsSinceMidnight = 
        now - new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const progressPercentage = (millisecondsSinceMidnight / millisecondsInDay) * 100;
      
      // Add a message when it's near the end of the day
      let message = null;
      if (timeRemaining.hours === 0 && timeRemaining.minutes < 30) {
        message = "Almost there! Today is nearly complete.";
      }
      
      return {
        ...timeRemaining,
        targetDate: midnight,
        isPassed: false,
        progressPercentage,
        message
      };
    } catch (error) {
      console.error('Error calculating daily timer:', error);
      return this._getDefaultTimerData();
    }
  }
  
  /**
   * Get default timer data for error cases
   * @returns {Object} Default timer data
   * @private
   */
  _getDefaultTimerData() {
    return {
      total: 0,
      years: 0,
      months: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      progressPercentage: 0,
      isPassed: false,
      message: "Error calculating timer."
    };
  }
  
  /**
   * Calculate number of days between two dates accurately
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {number} Number of days between dates
   * @private
   */
  _getDaysBetweenDates(startDate, endDate) {
    // Clone dates to avoid modifying originals
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Reset time part for accurate day calculation
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    
    // Calculate difference in days
    const millisecondsPerDay = 1000 * 60 * 60 * 24;
    return Math.max(0, Math.round((end - start) / millisecondsPerDay));
  }
  
  /**
   * Calculate time remaining between two dates more accurately
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Object} Time remaining broken down into units
   * @private
   */
  _calculateTimeRemaining(startDate, endDate) {
    // Calculate total milliseconds remaining
    const millisRemaining = Math.max(0, endDate - startDate);
    
    if (millisRemaining <= 0) {
      return {
        total: 0,
        years: 0,
        months: 0,
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0
      };
    }
    
    // For more accurate year and month calculations
    let tempDate = new Date(startDate);
    let years = 0;
    let months = 0;
    
    // Calculate years
    while (true) {
      const nextYear = new Date(tempDate);
      nextYear.setFullYear(tempDate.getFullYear() + 1);
      
      if (nextYear > endDate) {
        break;
      }
      
      years++;
      tempDate = nextYear;
    }
    
    // Calculate months
    while (true) {
      const nextMonth = new Date(tempDate);
      nextMonth.setMonth(tempDate.getMonth() + 1);
      
      if (nextMonth > endDate) {
        break;
      }
      
      months++;
      tempDate = nextMonth;
    }
    
    // Calculate remaining days, hours, minutes, seconds from remaining time
    const remainingMs = endDate - tempDate;
    
    // Convert to seconds for simpler calculations
    let secondsRemaining = Math.floor(remainingMs / 1000);
    
    // Calculate days, hours, minutes, and seconds
    const days = Math.floor(secondsRemaining / 86400);
    secondsRemaining %= 86400;
    
    const hours = Math.floor(secondsRemaining / 3600);
    secondsRemaining %= 3600;
    
    const minutes = Math.floor(secondsRemaining / 60);
    const seconds = secondsRemaining % 60;
    
    return {
      total: millisRemaining,
      years,
      months,
      days,
      hours,
      minutes,
      seconds
    };
  }
  
  /**
   * Check if a year is a leap year
   * @param {number} year - Year to check
   * @returns {boolean} True if it's a leap year
   * @private
   */
  _isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  }
  
  /**
   * Calculate progress percentage for life timer
   * @param {Date} birthDate - Birth date
   * @param {Date} endDate - End date (based on life expectancy)
   * @param {Date} currentDate - Current date
   * @returns {number} Progress percentage (0-100)
   * @private
   */
  _calculateLifeProgressPercentage(birthDate, endDate, currentDate) {
    const totalLifespan = endDate - birthDate;
    const lived = currentDate - birthDate;
    const percentage = (lived / totalLifespan) * 100;
    
    // Ensure percentage is between 0 and 100
    return Math.max(0, Math.min(100, percentage));
  }
  
  /**
   * Get ordinal suffix for a number (e.g., 1st, 2nd, 3rd)
   * @param {number} num - Number to get suffix for
   * @returns {string} Ordinal suffix
   * @private
   */
  _getOrdinalSuffix(num) {
    const j = num % 10;
    const k = num % 100;
    
    if (j === 1 && k !== 11) {
      return 'st';
    }
    if (j === 2 && k !== 12) {
      return 'nd';
    }
    if (j === 3 && k !== 13) {
      return 'rd';
    }
    return 'th';
  }
}

// Create and export a singleton instance
const timerCalculator = new TimerCalculator(); 