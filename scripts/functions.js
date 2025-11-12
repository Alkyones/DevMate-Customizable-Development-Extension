import { getDataFromDB, removeLink } from './db.js';

/**
 * Send localStorage snapshot to the background (if any)
 */
function checkLocalStorage() {
  const isEmpty = Object.keys(localStorage).length === 0;
  const localStorageData = isEmpty ? null : localStorage;
  chrome.runtime.sendMessage({ action: 'localStorage', isEmpty, localStorageData });
}

/**
 * Empty a container element safely
 * @param {HTMLElement} div
 * @returns {HTMLElement}
 */
function emptyDiv(div) {
  if (!div) return div;
  div.innerHTML = "";
  return div;
}

/**
 * Copy text to clipboard using modern API when available, fallback to a textarea
 * @param {string} value
 * @returns {Promise<void>}
 */
async function copyValueToClipboard(value) {
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
 * Build list items HTML for either usefulLinks or credentials
 * @param {Array<object>} data
 * @param {string} action - 'usefulLinks' or 'credentials'
 * @returns {Array<string>} array of <li> HTML strings
 */
function createListItems(data, action) {
  if (!Array.isArray(data)) return [];
  return data.map((item) => {
    const key = item.key || '';
    const isUseful = action === 'usefulLinks';
    const rawUrl = isUseful ? (item.value || '') : (item.website || '');
    // make a safe href: if empty use '#' otherwise ensure protocol
    let href = '#';
    if (rawUrl) {
      href = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
    }
    const meta = isUseful ? (item.value || '') : (item.website || '');
    const dataValue = isUseful ? (item.value || '') : (item.website || '');

    return `
      <li class="list-card" data-key="${escapeHtml(key)}">
        <div class="item-main">
          <a href="${escapeHtml(href)}" target="_blank" rel="noreferrer" data-value="${escapeHtml(dataValue)}">${escapeHtml(key)}</a>
          <div class="item-meta">${escapeHtml(meta)}</div>
        </div>
        <div class="actions-inline">
          <button class="small-btn delete remove-button" data-action="${escapeHtml(action)}" data-key="${escapeHtml(key)}" title="Remove" aria-label="Remove">
            <span class="action-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg></span>
            <span>Remove</span>
          </button>
        </div>
      </li>`;
  });
}

/**
 * Update a container with items from the DB and wire inline actions
 * @param {string} action - object store name
 * @param {Array<object>} data
 * @param {HTMLElement} resultDiv
 */
async function updateTable(action, data, resultDiv) {
  emptyDiv(resultDiv);
  // Debugging: log incoming data shape to help diagnose unexpected empty results
  try { console.debug('updateTable', { action, dataLength: Array.isArray(data) ? data.length : null, data }); } catch (e) {}
  if (data == null) {
    resultDiv.innerText = 'No available data please try again later.';
    return;
  }
  if (!Array.isArray(data) || data.length === 0) {
    resultDiv.innerText = '';
    return;
  }

  const listItems = createListItems(data, action);
  resultDiv.innerHTML = listItems.join('');

  // wire remove buttons
  const removeButtons = resultDiv.querySelectorAll('.remove-button');
  removeButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        const storeName = button.getAttribute('data-action');
        const key = button.getAttribute('data-key');
        await removeLink(storeName, key);
        const fresh = await getDataFromDB(storeName);
        await updateTable(storeName, fresh, resultDiv);
      } catch (err) {
        console.error('Failed to remove item', err);
      }
    });
  });

  
}

// --- small generators -----------------------------------------------------
/**
 * Generate a semi-random username (adjective + animal + number)
 * @returns {string}
 */
function generateUsername() {
  const adjectives = ['fast', 'cool', 'smart', 'silent', 'brave', 'lucky', 'happy', 'wild'];
  const animals = ['lion', 'tiger', 'bear', 'wolf', 'fox', 'eagle', 'hawk', 'owl'];
  const number = Math.floor(Math.random() * 1000);
  return `${pick(adjectives)}${pick(animals)}${number}`;
}

/**
 * Generate a reasonably strong password (default length 12)
 * @param {number} [length=12]
 * @returns {string}
 */
function generatePassword(length = 12) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=';
  let password = '';
  for (let i = 0; i < length; i++) {
    const idx = Math.floor(Math.random() * chars.length);
    password += chars.charAt(idx);
  }
  return password;
}

/**
 * Generate a pseudo-random email using generateUsername and common providers
 * @returns {string}
 */
function generateEmail() {
  const providers = ['gmail.com', 'yahoo.com', 'outlook.com', 'mail.com'];
  return `${generateUsername()}@${pick(providers)}`;
}

// --- small utility functions ---------------------------------------------
/**
 * Pick a random element from an array
 * @param {Array<any>} arr
 * @returns {any}
 */
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Minimal HTML escaper for attribute/text insertion
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export { checkLocalStorage, emptyDiv, copyValueToClipboard, updateTable, generateUsername, generatePassword, generateEmail };