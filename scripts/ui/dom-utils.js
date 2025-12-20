/**
 * DOM utility functions for creating and manipulating elements
 */

/**
 * Empty a container element safely
 * @param {HTMLElement} div
 * @returns {HTMLElement}
 */
export function emptyDiv(div) {
  if (!div) return div;
  div.innerHTML = "";
  return div;
}

/**
 * Copy text to clipboard using modern API when available, fallback to textarea
 * @param {string} value
 * @returns {Promise<void>}
 */
export async function copyValueToClipboard(value) {
  if (!value && value !== 0) return;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(String(value));
      return;
    }
  } catch (e) {
    // fall through to legacy approach
  }

  // Legacy fallback (works for older WebViews/DevTools)
  const ta = document.createElement('textarea');
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  ta.value = String(value);
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
  } catch (e) {
    console.warn('copy fallback failed', e);
  }
  document.body.removeChild(ta);
}

/**
 * Minimal HTML escaper for attribute/text insertion
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Create action button with consistent styling
 * @param {Object} options - Button configuration
 * @returns {HTMLButtonElement}
 */
export function createActionButton(options) {
  const { classes = [], title = '', label = '', html = '', onClick } = options;
  
  const button = document.createElement('button');
  button.className = ['small-btn', ...classes].join(' ');
  if (title) button.title = title;
  button.setAttribute('aria-label', title || label);
  
  const iconSpan = document.createElement('span');
  iconSpan.className = 'action-icon';
  iconSpan.innerHTML = html;
  
  const labelSpan = document.createElement('span');
  labelSpan.textContent = label;
  
  button.appendChild(iconSpan);
  button.appendChild(labelSpan);
  
  if (onClick) {
    button.addEventListener('click', onClick);
  }
  
  return button;
}

/**
 * Pick a random element from an array
 * @param {Array<any>} arr
 * @returns {any}
 */
export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}