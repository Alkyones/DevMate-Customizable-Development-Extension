/**
 * DevMate Popup - Main Entry Point
 * Orchestrates all features and handles minimal popup-specific logic
 */

import { dbReady } from './db.js';
import { PanelManager } from './ui/panel-manager.js';
import { showSnackbar } from './ui/snackbar.js';
import { CredentialGenerator } from './features/credential-generator.js';
import { LocalStorageFeature } from './features/local-storage.js';
import { UsefulLinksFeature } from './features/useful-links.js';
import { CredentialsFeature } from './features/credentials.js';
import { FetchCaptureFeature } from './features/fetch-capture.js';
import { CodeKeeperFeature } from './features/code-keeper.js';
import { PingerFeature } from './features/pinger.js';

// Initialize all feature modules
const panelManager = new PanelManager();
const credentialGenerator = new CredentialGenerator(panelManager);
const localStorageFeature = new LocalStorageFeature(panelManager);
const usefulLinksFeature = new UsefulLinksFeature(panelManager);
const credentialsFeature = new CredentialsFeature(panelManager);
const fetchCaptureFeature = new FetchCaptureFeature(panelManager);
const codeKeeperFeature = new CodeKeeperFeature(panelManager);
const pingerFeature = new PingerFeature(panelManager);

// Global message listeners for background script communication
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'newCapturedRequest') {
    fetchCaptureFeature.prependCapturedRequestToUI(message.request);
  }
  if (message.action === 'replayResult') {
    displayReplayResult(message.result);
  }
  if (message.action === 'pingResult') {
    // Handle ping results if needed
    console.log('Ping result:', message);
  }
  if (message.action === 'localStorage') {
    displayLocalStorageResults(message);
  }
});

// Handle replay results display
function displayReplayResult(result) {
  const replayDiv = document.getElementById('replayResult');
  if (!replayDiv) return;
  
  replayDiv.innerHTML = `
    <div class="replay-result">
      <h4>Replay Result for Request ID: ${result.requestId}</h4>
      <p><strong>Status:</strong> ${result.status || 'N/A'} ${result.statusText || ''}</p>
      <p><strong>Response Time:</strong> ${result.timestamp ? 'Completed at ' + new Date(result.timestamp).toLocaleTimeString() : 'N/A'}</p>
      ${result.error ? `<p class="error"><strong>Error:</strong> ${result.error}</p>` : ''}
      ${result.body ? `<div class="response-body"><strong>Response Body:</strong><pre>${result.body.slice(0, 500)}${result.body.length > 500 ? '...' : ''}</pre></div>` : ''}
    </div>
  `;
}

// Handle localStorage results display
function displayLocalStorageResults(message) {
  const resultDiv = document.getElementById('result');
  if (!resultDiv) return;

  resultDiv.innerHTML = '';

  if (message.isEmpty) {
    resultDiv.textContent = 'Local Storage is empty.';
    return;
  }

  const localStorageData = message.localStorageData;
  if (!localStorageData) {
    resultDiv.textContent = 'Local Storage data is unavailable.';
    return;
  }

  const keysList = document.createElement('ul');
  Object.keys(localStorageData).forEach((key) => {
    const listItem = createLocalStorageListItem(key, localStorageData[key]);
    keysList.appendChild(listItem);
  });

  resultDiv.appendChild(keysList);
}

// Create a single localStorage list item with proper styling
function createLocalStorageListItem(key, value) {
  const displayedKey = key.length > 45 ? key.slice(0, 45) + '...' : key;
  
  const listItem = document.createElement('li');
  listItem.className = 'list-card ls-item-vertical';
  
  const topRow = document.createElement('div');
  topRow.className = 'ls-item-row';
  
  const itemMain = document.createElement('div');
  itemMain.className = 'item-main';
  
  const keyLink = document.createElement('a');
  keyLink.href = '#';
  keyLink.textContent = displayedKey;
  keyLink.style.textDecoration = 'none';
  
  const copiedBadge = document.createElement('div');
  copiedBadge.className = 'copied-badge';
  copiedBadge.textContent = 'Copied';
  
  keyLink.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(value);
      copiedBadge.classList.add('show');
      const prevColor = keyLink.style.color;
      keyLink.style.color = '';
      setTimeout(() => {
        copiedBadge.classList.remove('show');
        keyLink.style.color = prevColor;
      }, 1200);
    } catch (err) {
      console.warn('Copy failed', err);
    }
  });
  
  itemMain.appendChild(keyLink);
  itemMain.appendChild(copiedBadge);
  
  const actions = document.createElement('div');
  actions.className = 'actions-inline';
  
  const copyBtn = createActionButton({
    classes: ['replay'],
    label: 'Copy',
    html: '',
    onClick: async () => {
      try {
        await navigator.clipboard.writeText(value);
        showSnackbar('Copied!');
      } catch (err) {
        console.warn('Copy failed', err);
        showSnackbar('Copy failed');
      }
    }
  });
  
  const editBtn = createActionButton({
    classes: ['edit'],
    label: 'Edit',
    html: '',
    onClick: () => openLocalStorageEditBox(key, value, listItem, actions)
  });
  
  const delBtn = createActionButton({
    classes: ['delete'],
    label: 'Delete',
    html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>`,
    onClick: () => {
      if (confirm(`Delete localStorage item "${key}"?`)) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const activeTab = tabs[0];
          if (!activeTab) return;
          chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            func: (keyToDelete) => { localStorage.removeItem(keyToDelete); },
            args: [key]
          }, () => {
            listItem.remove();
          });
        });
      }
    }
  });
  
  actions.appendChild(copyBtn);
  actions.appendChild(editBtn);
  actions.appendChild(delBtn);
  
  topRow.appendChild(itemMain);
  topRow.appendChild(actions);
  
  const valueRow = document.createElement('div');
  valueRow.className = 'ls-value-row';
  const valueDiv = document.createElement('div');
  valueDiv.className = 'ls-value';
  valueDiv.textContent = String(value).length > 100 ? String(value).slice(0, 100) + '...' : value;
  valueRow.appendChild(valueDiv);
  
  listItem.appendChild(topRow);
  listItem.appendChild(valueRow);
  
  return listItem;
}

// localStorage edit functionality
function openLocalStorageEditBox(key, value, container, actionsElement) {
  if (actionsElement) actionsElement.style.display = 'none';
  
  const editor = document.createElement('div');
  editor.className = 'edit-box';

  const keyLabel = createLabel('Key:');
  const keyInput = createStyledInput(key);
  
  const valueLabel = createLabel('Value:');
  const valueInput = createStyledTextarea(value);

  const saveBtn = createStyledSaveButton('Save');
  const cancelBtn = createStyledCancelButton('Cancel');

  saveBtn.addEventListener('click', () => {
    const newKey = keyInput.value || key;
    const newValue = valueInput.value || value;
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab) return;
      
      chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: (oldKey, newKey, newValue) => {
          if (oldKey !== newKey) localStorage.removeItem(oldKey);
          localStorage.setItem(newKey, newValue);
        },
        args: [key, newKey, newValue]
      }, () => {
        chrome.scripting.executeScript({ 
          target: { tabId: activeTab.id }, 
          function: () => {
            const isEmpty = Object.keys(localStorage).length === 0;
            const localStorageData = isEmpty ? null : localStorage;
            chrome.runtime.sendMessage({ action: 'localStorage', isEmpty, localStorageData }, (response) => {
              if (chrome.runtime.lastError) {
                console.warn('localStorage message failed:', chrome.runtime.lastError);
              }
            });
          }
        });
      });
    });
  });

  cancelBtn.addEventListener('click', () => {
    editor.remove();
    if (actionsElement) actionsElement.style.display = '';
  });

  editor.appendChild(keyLabel);
  editor.appendChild(keyInput);
  editor.appendChild(valueLabel);
  editor.appendChild(valueInput);
  
  const buttonGroup = document.createElement('div');
  buttonGroup.className = 'button-group';
  buttonGroup.appendChild(saveBtn);
  buttonGroup.appendChild(cancelBtn);
  editor.appendChild(buttonGroup);

  container.appendChild(editor);
}

// Helper functions for edit box
function createLabel(text) {
  const label = document.createElement('div');
  label.className = 'edit-box-label';
  label.textContent = text;
  return label;
}

function createStyledTextarea(value = '', height = '80px') {
  const textarea = document.createElement('textarea');
  textarea.className = 'edit-box-textarea';
  textarea.value = value;
  textarea.style.height = height;
  return textarea;
}

function createStyledInput(value = '', type = 'text') {
  const input = document.createElement('input');
  input.className = 'edit-box-input';
  input.type = type;
  input.value = value;
  return input;
}

function createStyledSaveButton(text = 'Save') {
  const btn = document.createElement('button');
  btn.className = 'btn-save';
  btn.textContent = text;
  return btn;
}

function createStyledCancelButton(text = 'Cancel') {
  const btn = document.createElement('button');
  btn.className = 'btn-cancel';
  btn.textContent = text;
  return btn;
}

function createActionButton(options) {
  const { classes = [], title = '', label = '', html = '', onClick } = options;
  
  const button = document.createElement('button');
  button.className = ['small-btn', ...classes].join(' ');
  if (title) button.title = title;
  button.setAttribute('aria-label', title || label);
  
  if (html) {
    const iconSpan = document.createElement('span');
    iconSpan.className = 'action-icon';
    iconSpan.innerHTML = html;
    button.appendChild(iconSpan);
  }
  
  if (label) {
    const labelSpan = document.createElement('span');
    labelSpan.textContent = label;
    button.appendChild(labelSpan);
  }
  
  if (onClick) {
    button.addEventListener('click', onClick);
  }
  
  return button;
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  await dbReady;
  console.log('DevMate popup initialized with all features');
});