/**
 * Fetch Capture Feature
 * Handles request capturing and replay functionality
 */

import { addCapturedRequest, getCapturedRequests, removeCapturedRequest, updateCapturedRequest } from '../db.js';
import { createActionButton, emptyDiv } from '../ui/dom-utils.js';
import { showSnackbar } from '../ui/snackbar.js';
import { PANEL_KEYS, CONFIG } from '../config/constants.js';

export class FetchCaptureFeature {
  constructor(panelManager) {
    this.panelManager = panelManager;
    this.initializeElements();
    this.setupEventListeners();
  }

  initializeElements() {
    this.showFetchesButton = document.getElementById('fetchesButton');
    this.fetchListDiv = document.getElementById('fetch-requests');
    this.fetchList = document.getElementById('fetchRequestList');
    this.captureToggle = document.getElementById('captureToggle');
    this.clearCapturedButton = document.getElementById('clearCapturedButton');
  }

  setupEventListeners() {
    this.showFetchesButton?.addEventListener('click', () => this.handleShowFetches());
    this.captureToggle?.addEventListener('change', () => this.handleCaptureToggle());
    this.clearCapturedButton?.addEventListener('click', () => this.handleClearCaptured());
  }

  async handleShowFetches() {
    await this.panelManager.toggleDisplay(this.showFetchesButton);
    if (this.panelManager.isVisible(PANEL_KEYS.FETCHES)) {
      await this.loadCapturedRequests();
      chrome.storage.local.get({ captureEnabled: false }, (items) => { 
        this.captureToggle.checked = !!items.captureEnabled; 
      });
    }
  }

  handleCaptureToggle() {
    const enabled = !!this.captureToggle.checked;
    chrome.runtime.sendMessage({ action: 'toggleCapture', enabled }, (resp) => {
      if (chrome.runtime.lastError) console.warn('toggleCapture send failed', chrome.runtime.lastError);
      else showSnackbar(enabled ? 'Capture enabled' : 'Capture disabled');
    });
  }

  handleClearCaptured() {
    chrome.storage.local.set({ capturedRequests: [] }, () => {
      emptyDiv(this.fetchList);
      const replayDiv = document.getElementById('replayResult');
      if (replayDiv) replayDiv.innerHTML = '';
      showSnackbar('Cleared captured requests');
    });
  }

  async loadCapturedRequests() {
    emptyDiv(this.fetchList);
    const requests = await getCapturedRequests();
    if (!requests || requests.length === 0) return;
    requests.forEach(r => this.appendCapturedRequestToUI(r));
  }

  createFetchItem(r, { prepend = false } = {}) {
    const newListItem = document.createElement('li');
    newListItem.classList.add('fetch-item');
    newListItem.dataset.requestId = r.id;

    const meta = document.createElement('div'); 
    meta.className = 'request-meta';
    const methodBadge = document.createElement('div'); 
    methodBadge.className = 'request-method'; 
    methodBadge.textContent = r.method;
    const urlSpan = document.createElement('div'); 
    urlSpan.className = 'request-url'; 
    urlSpan.title = r.url; 
    urlSpan.textContent = `${r.url} (${new Date(r.timestamp).toLocaleTimeString()})`;
    meta.appendChild(methodBadge); 
    meta.appendChild(urlSpan);

    const actions = document.createElement('div'); 
    actions.className = 'request-actions';

    const replayBtn = createActionButton({ 
      classes: ['replay'], 
      title: 'Replay request', 
      label: 'Replay', 
      html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M20 20v-6a7 7 0 00-7-7H7"/></svg>`, 
      onClick: () => chrome.runtime.sendMessage({ action: 'replayRequest', request: r }) 
    });

    const editBtn = createActionButton({ 
      classes: ['edit'], 
      title: 'Edit request', 
      label: 'Edit', 
      html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>`, 
      onClick: () => this.openEditBox(r, newListItem, actions) 
    });

    const delBtn = createActionButton({ 
      classes: ['delete'], 
      title: 'Delete request', 
      label: 'Delete', 
      html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>`, 
      onClick: async () => { 
        await removeCapturedRequest(r.id); 
        newListItem.remove(); 
      } 
    });

    actions.appendChild(replayBtn); 
    actions.appendChild(editBtn); 
    actions.appendChild(delBtn);
    newListItem.appendChild(meta);
    newListItem.appendChild(actions);

    if (prepend && this.fetchList.firstChild) this.fetchList.insertBefore(newListItem, this.fetchList.firstChild);
    else this.fetchList.appendChild(newListItem);
  }

  prependCapturedRequestToUI(r) { 
    this.createFetchItem(r, { prepend: true }); 
  }
  
  appendCapturedRequestToUI(r) { 
    this.createFetchItem(r, { prepend: false }); 
  }

  openEditBox(r, container, actionsElement) {
    if (actionsElement) actionsElement.style.display = 'none';
    
    const editor = document.createElement('div');
    editor.className = 'edit-box';

    const headersLabel = this.createLabel('Headers (JSON array or object):');
    let headersValue;
    try { 
      headersValue = JSON.stringify(r.headers, null, 2); 
    } catch (e) { 
      headersValue = ''; 
    }
    const headersInput = this.createStyledTextarea(headersValue);
    
    const bodyLabel = this.createLabel('Body (string):');
    const bodyInput = this.createStyledTextarea(r.body || '');
    
    const urlLabel = this.createLabel('URL:');
    const urlInput = this.createStyledInput(r.url || '');
    
    const methodLabel = this.createLabel('Method:');
    const methodInput = this.createStyledInput(r.method || 'GET');

    const saveBtn = this.createStyledSaveButton('Save');
    const cancelBtn = this.createStyledCancelButton('Cancel');

    saveBtn.addEventListener('click', async () => {
      try {
        let parsedHeaders = [];
        if (headersInput.value.trim()) {
          parsedHeaders = JSON.parse(headersInput.value);
        }
        
        const updated = {
          ...r,
          url: urlInput.value || r.url,
          method: methodInput.value || r.method,
          headers: parsedHeaders,
          body: bodyInput.value || r.body
        };
        
        await updateCapturedRequest(r.id, updated);
        showSnackbar('Request updated');
        await this.loadCapturedRequests();
      } catch (e) {
        alert('Invalid JSON in headers field');
      }
    });

    cancelBtn.addEventListener('click', () => {
      editor.remove();
      if (actionsElement) actionsElement.style.display = '';
    });

    editor.appendChild(urlLabel);
    editor.appendChild(urlInput);
    editor.appendChild(methodLabel);
    editor.appendChild(methodInput);
    editor.appendChild(headersLabel);
    editor.appendChild(headersInput);
    editor.appendChild(bodyLabel);
    editor.appendChild(bodyInput);
    
    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'button-group';
    buttonGroup.appendChild(saveBtn);
    buttonGroup.appendChild(cancelBtn);
    editor.appendChild(buttonGroup);

    container.appendChild(editor);
  }

  // Utility functions for edit box
  createLabel(text) {
    const label = document.createElement('div');
    label.className = 'edit-box-label';
    label.textContent = text;
    return label;
  }

  createStyledTextarea(value = '', height = '80px') {
    const textarea = document.createElement('textarea');
    textarea.className = 'edit-box-textarea';
    textarea.value = value;
    textarea.style.height = height;
    return textarea;
  }

  createStyledInput(value = '', type = 'text') {
    const input = document.createElement('input');
    input.className = 'edit-box-input';
    input.type = type;
    input.value = value;
    return input;
  }

  createStyledSaveButton(text = 'Save') {
    const btn = document.createElement('button');
    btn.className = 'btn-save';
    btn.textContent = text;
    return btn;
  }

  createStyledCancelButton(text = 'Cancel') {
    const btn = document.createElement('button');
    btn.className = 'btn-cancel';
    btn.textContent = text;
    return btn;
  }
}