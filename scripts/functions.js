import { getDataFromDB, removeLink } from './db.js';

// Constants for action types
const ACTION_TYPES = {
  USEFUL_LINKS: 'usefulLinks',
  CREDENTIALS: 'credentials'
};

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
 * Create a single list item element safely using DOM API
 * @param {object} item - Data item with key and value/website
 * @param {string} action - 'usefulLinks' or 'credentials'
 * @returns {HTMLLIElement}
 */
function createListItemElement(item, action) {
  const key = item.key || '';
  const isUseful = action === ACTION_TYPES.USEFUL_LINKS;
  const rawUrl = isUseful ? (item.value || '') : (item.website || '');
  
  // Make a safe href: if empty use '#' otherwise ensure protocol
  let href = '#';
  if (rawUrl) {
    href = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
  }
  const meta = isUseful ? (item.value || '') : (item.website || '');
  const dataValue = isUseful ? (item.value || '') : (item.website || '');

  // Create elements safely
  const li = document.createElement('li');
  li.className = 'list-card';
  li.dataset.key = key;

  const itemMain = document.createElement('div');
  itemMain.className = 'item-main';

  const link = document.createElement('a');
  link.href = href;
  link.target = '_blank';
  link.rel = 'noreferrer';
  link.dataset.value = dataValue;
  link.textContent = key;

  const itemMeta = document.createElement('div');
  itemMeta.className = 'item-meta';
  itemMeta.textContent = meta;

  itemMain.appendChild(link);
  itemMain.appendChild(itemMeta);

  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'actions-inline';

  const removeBtn = document.createElement('button');
  removeBtn.className = 'small-btn delete remove-button';
  removeBtn.dataset.action = action;
  removeBtn.dataset.key = key;
  removeBtn.title = 'Remove';
  removeBtn.setAttribute('aria-label', 'Remove');

  const iconSpan = document.createElement('span');
  iconSpan.className = 'action-icon';
  iconSpan.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>';

  const labelSpan = document.createElement('span');
  labelSpan.textContent = 'Remove';

  removeBtn.appendChild(iconSpan);
  removeBtn.appendChild(labelSpan);
  actionsDiv.appendChild(removeBtn);

  li.appendChild(itemMain);
  li.appendChild(actionsDiv);

  return li;
}

/**
 * Update a container with items from the DB and wire inline actions
 * @param {string} action - object store name
 * @param {Array<object>} data
 * @param {HTMLElement} resultDiv
 */
async function updateTable(action, data, resultDiv) {
  emptyDiv(resultDiv);
  
  if (data == null) {
    resultDiv.textContent = 'No available data please try again later.';
    return;
  }
  if (!Array.isArray(data) || data.length === 0) {
    resultDiv.textContent = '';
    return;
  }

  // Create a document fragment for better performance
  const fragment = document.createDocumentFragment();
  
  data.forEach((item) => {
    const listItem = createListItemElement(item, action);
    
    // Wire remove button
    const removeBtn = listItem.querySelector('.remove-button');
    if (removeBtn) {
      removeBtn.addEventListener('click', async () => {
        try {
          const storeName = removeBtn.dataset.action;
          const key = removeBtn.dataset.key;
          await removeLink(storeName, key);
          const fresh = await getDataFromDB(storeName);
          await updateTable(storeName, fresh, resultDiv);
        } catch (err) {
          console.error('Failed to remove item', err);
        }
      });
    }
    
    fragment.appendChild(listItem);
  });
  
  resultDiv.appendChild(fragment);
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
 * Generate a cryptographically strong password (default length 12)
 * @param {number} [length=12]
 * @returns {string}
 */
function generatePassword(length = 12) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=';
  let password = '';
  
  // Use crypto.getRandomValues for secure random numbers
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);
  
  for (let i = 0; i < length; i++) {
    const idx = randomValues[i] % chars.length;
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