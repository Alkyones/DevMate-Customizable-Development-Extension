/**
 * Autofill Content Script
 * Handles credential autofill on web pages
 */

// Guard against multiple injections
if (typeof window.__devmateAutofillLoaded === 'undefined') {
  window.__devmateAutofillLoaded = true;

// Track the last focused/right-clicked element
let lastFocusedElement = null;

// Track focused element for context menu
document.addEventListener('focusin', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
    lastFocusedElement = e.target;
  }
});

document.addEventListener('contextmenu', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
    lastFocusedElement = e.target;
  }
});

// Listen for autofill messages from the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'autofillCredentials') {
    const result = autofillCredentials(message.username, message.password);
    sendResponse({ success: result });
  }
  return true;
});

/**
 * Find and fill login form fields
 * @param {string} username 
 * @param {string} password 
 * @returns {boolean} success
 */
function autofillCredentials(username, password) {
  let filledAny = false;
  
  // If user right-clicked on a specific field, try smart fill from there
  if (lastFocusedElement && isVisible(lastFocusedElement)) {
    const focusedType = lastFocusedElement.type?.toLowerCase();
    const focusedName = (lastFocusedElement.name || '').toLowerCase();
    const focusedId = (lastFocusedElement.id || '').toLowerCase();
    
    // Determine if it's a password or username field
    const isPasswordField = focusedType === 'password' || 
                           focusedName.includes('pass') || 
                           focusedId.includes('pass');
    
    if (isPasswordField) {
      // Fill password in focused field
      fillField(lastFocusedElement, password);
      filledAny = true;
      
      // Try to find and fill username field nearby
      const form = lastFocusedElement.closest('form');
      const usernameField = findUsernameField(form || document);
      if (usernameField && usernameField !== lastFocusedElement) {
        fillField(usernameField, username);
      }
    } else {
      // Fill username in focused field
      fillField(lastFocusedElement, username);
      filledAny = true;
      
      // Try to find and fill password field nearby
      const form = lastFocusedElement.closest('form');
      const passwordField = findPasswordField(form || document);
      if (passwordField) {
        fillField(passwordField, password);
      }
    }
    
    return filledAny;
  }
  
  // Fallback: auto-detect fields
  const usernameField = findUsernameField(document);
  const passwordField = findPasswordField(document);
  
  if (usernameField && username) {
    fillField(usernameField, username);
    filledAny = true;
  }
  
  if (passwordField && password) {
    fillField(passwordField, password);
    filledAny = true;
  }
  
  return filledAny;
}

/**
 * Find username field in container
 */
function findUsernameField(container) {
  // Common username field selectors
  const usernameSelectors = [
    'input[type="email"]',
    'input[autocomplete="username"]',
    'input[autocomplete="email"]',
    'input[name="username"]',
    'input[name="email"]',
    'input[name="login"]',
    'input[id="username"]',
    'input[id="email"]',
    'input[id="login"]',
    'input[type="text"][name*="user"]',
    'input[type="text"][name*="email"]',
    'input[type="text"][name*="login"]',
    'input[type="text"][id*="user"]',
    'input[type="text"][id*="email"]',
    'input[type="text"][id*="login"]',
    'input[placeholder*="email" i]',
    'input[placeholder*="user" i]',
    'input[type="text"]:not([type="password"])'
  ];
  
  for (const selector of usernameSelectors) {
    const field = container.querySelector(selector);
    if (field && isVisible(field)) {
      return field;
    }
  }
  return null;
}

/**
 * Find password field in container
 */
function findPasswordField(container) {
  const passwordSelectors = [
    'input[type="password"]',
    'input[autocomplete="current-password"]',
    'input[autocomplete="new-password"]',
    'input[name*="pass"]',
    'input[id*="pass"]'
  ];
  
  for (const selector of passwordSelectors) {
    const field = container.querySelector(selector);
    if (field && isVisible(field)) {
      return field;
    }
  }
  return null;
}

/**
 * Fill a field and trigger appropriate events
 * @param {HTMLInputElement} field 
 * @param {string} value 
 */
function fillField(field, value) {
  // Focus the field
  field.focus();
  
  // Clear existing value
  field.value = '';
  
  // Set the value
  field.value = value;
  
  // Dispatch events to trigger form validation/frameworks
  field.dispatchEvent(new Event('input', { bubbles: true }));
  field.dispatchEvent(new Event('change', { bubbles: true }));
  field.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
  
  // For React/Vue/Angular frameworks
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  nativeInputValueSetter.call(field, value);
  field.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * Check if element is visible
 * @param {HTMLElement} element 
 * @returns {boolean}
 */
function isVisible(element) {
  if (!element) return false;
  const style = window.getComputedStyle(element);
  return style.display !== 'none' && 
         style.visibility !== 'hidden' && 
         style.opacity !== '0' &&
         element.offsetParent !== null;
}

} // End of injection guard
