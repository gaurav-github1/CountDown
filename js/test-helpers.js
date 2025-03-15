/**
 * Test Helpers for Countdown Timer Extension
 * These functions help test the functionality manually
 */

// Test toggling between timer types to verify input visibility
function testTimerTypeToggle() {
  console.log('---- TESTING TIMER TYPE TOGGLE ----');
  
  const lifeRadio = document.getElementById('life-timer');
  const birthdayRadio = document.getElementById('birthday-timer');
  const dailyRadio = document.getElementById('daily-timer');
  
  if (!lifeRadio || !birthdayRadio || !dailyRadio) {
    console.error('Radio buttons not found');
    return;
  }
  
  // Test daily timer
  console.log('Selecting daily timer');
  dailyRadio.checked = true;
  dailyRadio.dispatchEvent(new Event('change'));
  
  // Test birthday timer
  setTimeout(() => {
    console.log('Selecting birthday timer');
    birthdayRadio.checked = true;
    birthdayRadio.dispatchEvent(new Event('change'));
    
    // Test life timer
    setTimeout(() => {
      console.log('Selecting life timer');
      lifeRadio.checked = true;
      lifeRadio.dispatchEvent(new Event('change'));
      
      console.log('---- TIMER TYPE TOGGLE TEST COMPLETE ----');
    }, 1000);
  }, 1000);
}

// Test timer screen functionality
function testTimerScreen() {
  console.log('---- TESTING TIMER SCREEN ----');
  
  // Verify DOM elements
  const elements = [
    { name: 'Years Container', el: document.getElementById('years-container') },
    { name: 'Months Container', el: document.getElementById('months-container') },
    { name: 'Days Container', el: document.getElementById('days-container') },
    { name: 'Hours Container', el: document.getElementById('hours-container') },
    { name: 'Minutes Container', el: document.getElementById('minutes-container') },
    { name: 'Seconds Container', el: document.getElementById('seconds-container') },
    { name: 'Progress Bar', el: document.getElementById('progress-bar') },
    { name: 'Seek Bar', el: document.getElementById('seek-bar-fill') }
  ];
  
  elements.forEach(item => {
    if (item.el) {
      console.log(`✓ ${item.name} exists`);
    } else {
      console.error(`✗ ${item.name} not found`);
    }
  });
  
  console.log('---- TIMER SCREEN TEST COMPLETE ----');
}

// Run tests if this script is loaded in debug mode
window.runTests = function() {
  testTimerTypeToggle();
  // Wait for toggle test to complete
  setTimeout(testTimerScreen, 3500);
}; 