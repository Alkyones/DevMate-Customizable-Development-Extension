/**
 * Shared utility functions that are used across multiple features
 * Functions that are specific to one feature should be moved to that feature's file
 */

import { getDataFromDB, removeLink } from './db.js';
import { copyValueToClipboard } from './ui/dom-utils.js';
import { showSnackbar } from './ui/snackbar.js';
import { CONFIG } from './config/constants.js';

/**
 * Update a container with items from the DB and wire inline actions
 * Used by both useful-links and credentials features
 * @param {string} action - object store name
 * @param {Array<object>} data
 * @param {HTMLElement} resultDiv
 */
export async function updateTable(action, data, resultDiv) {
  if (!resultDiv) return;
  
  // Empty the container
  resultDiv.innerHTML = '';
  
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

/**
 * Update credentials list with copy buttons for username/password
 * @param {Array<object>} data
 * @param {HTMLElement} resultDiv
 */
export async function updateCredentialsTable(data, resultDiv) {
  if (!resultDiv) return;
  
  resultDiv.innerHTML = '';
  
  if (!Array.isArray(data) || data.length === 0) {
    resultDiv.textContent = '';
    return;
  }

  const fragment = document.createDocumentFragment();
  
  data.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'list-card credential-card';
    li.dataset.key = item.key || '';

    // Main content
    const itemMain = document.createElement('div');
    itemMain.className = 'item-main';

    // Website as title with link
    const website = item.website || '';
    const href = website.startsWith('http') ? website : `https://${website}`;
    
    const link = document.createElement('a');
    link.href = href;
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.className = 'credential-website';
    link.textContent = website;

    // Username display
    const usernameDiv = document.createElement('div');
    usernameDiv.className = 'credential-username';
    usernameDiv.textContent = item.key || '';

    itemMain.appendChild(link);
    itemMain.appendChild(usernameDiv);

    // Actions container
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'actions-inline';

    // Autofill button
    const autofillBtn = document.createElement('button');
    autofillBtn.className = 'small-btn autofill';
    autofillBtn.setAttribute('aria-label', 'Autofill form');
    autofillBtn.innerHTML = `<span class="action-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span><span>Fill</span>`;
    autofillBtn.addEventListener('click', async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
          await chrome.tabs.sendMessage(tab.id, {
            action: 'autofillCredentials',
            username: item.key || '',
            password: item.value || ''
          });
          showSnackbar('Credentials filled');
        }
      } catch (err) {
        console.error('Autofill failed:', err);
        showSnackbar('Could not autofill - try copying instead');
      }
    });

    // Copy Username button
    const copyUserBtn = document.createElement('button');
    copyUserBtn.className = 'small-btn replay';
    copyUserBtn.setAttribute('aria-label', 'Copy username');
    copyUserBtn.innerHTML = `<span class="action-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span><span>User</span>`;
    copyUserBtn.addEventListener('click', () => {
      copyValueToClipboard(item.key || '');
      showSnackbar('Username copied');
    });

    // Copy Password button
    const copyPassBtn = document.createElement('button');
    copyPassBtn.className = 'small-btn edit';
    copyPassBtn.setAttribute('aria-label', 'Copy password');
    copyPassBtn.innerHTML = `<span class="action-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg></span><span>Pass</span>`;
    copyPassBtn.addEventListener('click', () => {
      copyValueToClipboard(item.value || '');
      showSnackbar('Password copied');
    });

    // Remove button
    const removeBtn = document.createElement('button');
    removeBtn.className = 'small-btn delete remove-button';
    removeBtn.dataset.action = 'credentials';
    removeBtn.dataset.key = item.key || '';
    removeBtn.setAttribute('aria-label', 'Remove');
    removeBtn.innerHTML = `<span class="action-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg></span><span>Remove</span>`;
    removeBtn.addEventListener('click', async () => {
      try {
        await removeLink('credentials', item.key);
        const fresh = await getDataFromDB('credentials');
        // Update cache for context menu
        chrome.storage.local.set({ credentialsCache: fresh || [] });
        await updateCredentialsTable(fresh, resultDiv);
        showSnackbar('Credential removed');
      } catch (err) {
        console.error('Failed to remove credential', err);
      }
    });

    actionsDiv.appendChild(autofillBtn);
    actionsDiv.appendChild(copyUserBtn);
    actionsDiv.appendChild(copyPassBtn);
    actionsDiv.appendChild(removeBtn);

    li.appendChild(itemMain);
    li.appendChild(actionsDiv);
    fragment.appendChild(li);
  });
  
  resultDiv.appendChild(fragment);
}

/**
 * Create a single list item element safely using DOM API
 * Used by both useful-links and credentials features
 * @param {object} item - Data item with key and value/website
 * @param {string} action - 'usefulLinks' or 'credentials'
 * @returns {HTMLLIElement}
 */
export function createListItemElement(item, action) {
  const key = item.key || '';
  const isUseful = action === CONFIG.ACTION_TYPES.USEFUL_LINKS;
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