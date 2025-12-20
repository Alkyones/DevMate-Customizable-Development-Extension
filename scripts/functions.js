/**
 * Shared utility functions that are used across multiple features
 * Functions that are specific to one feature should be moved to that feature's file
 */

import { getDataFromDB, removeLink } from './db.js';
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