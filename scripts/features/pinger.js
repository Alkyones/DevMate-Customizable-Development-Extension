/**
 * Pinger Feature
 * Handles ping requests and monitoring functionality
 */

import { addPingRequest, getPingRequests, updatePingRequest, removePingRequest } from '../db.js';
import { createActionButton, emptyDiv } from '../ui/dom-utils.js';
import { showSnackbar } from '../ui/snackbar.js';
import { PANEL_KEYS } from '../config/constants.js';

export class PingerFeature {
  constructor(panelManager) {
    this.panelManager = panelManager;
    this.editingPingerId = null;
    this.initializeElements();
    this.setupEventListeners();
  }

  initializeElements() {
    this.pingerButton = document.getElementById('pingerButton');
    this.pingerDiv = document.getElementById('pinger');
    this.pingerNameInput = document.getElementById('pingerNameInput');
    this.pingerMethodSelect = document.getElementById('pingerMethodSelect');
    this.pingerUrlInput = document.getElementById('pingerUrlInput');
    this.pingerHeadersInput = document.getElementById('pingerHeadersInput');
    this.pingerBodyInput = document.getElementById('pingerBodyInput');
    this.pingerIntervalInput = document.getElementById('pingerIntervalInput');
    this.savePingerButton = document.getElementById('savePingerButton');
    this.pingerStatus = document.getElementById('pingerStatus');
    this.pingerList = document.getElementById('pingerList');
  }

  setupEventListeners() {
    this.pingerButton?.addEventListener('click', () => this.handleShowPinger());
    this.savePingerButton?.addEventListener('click', () => this.handleSavePinger());
  }

  async handleShowPinger() {
    await this.panelManager.toggleDisplay(this.pingerButton);
    if (this.panelManager.isVisible(PANEL_KEYS.PINGER)) {
      await this.loadPingRequests();
    }
  }

  async handleSavePinger() {
    const name = this.pingerNameInput?.value.trim() || '';
    const method = this.pingerMethodSelect?.value || 'GET';
    const url = this.pingerUrlInput?.value.trim() || '';
    const headers = this.pingerHeadersInput?.value.trim() || '';
    const body = this.pingerBodyInput?.value.trim() || '';
    const interval = parseInt(this.pingerIntervalInput?.value) || 60;

    if (!name) {
      alert('Please enter a name for the ping request.');
      return;
    }
    
    if (!url) {
      alert('Please enter a URL.');
      return;
    }
    
    if (interval < 1) {
      alert('Interval must be at least 1 second.');
      return;
    }
    
    // Validate headers JSON if provided
    if (headers) {
      try {
        JSON.parse(headers);
      } catch (e) {
        alert('Headers must be valid JSON format.');
        return;
      }
    }
    
    const pingData = {
      name: name,
      method: method,
      url: url,
      headers: headers,
      body: body,
      interval: interval
    };
    
    if (this.editingPingerId) {
      await updatePingRequest(this.editingPingerId, pingData);
      this.pingerStatus.textContent = 'Ping request updated';
      this.editingPingerId = null;
    } else {
      const id = await addPingRequest(pingData);
      if (id) {
        this.pingerStatus.textContent = 'Ping request saved';
      } else {
        this.pingerStatus.textContent = 'Error saving ping request';
      }
    }
    
    // Clear form
    this.pingerNameInput.value = '';
    this.pingerMethodSelect.value = 'GET';
    this.pingerUrlInput.value = '';
    this.pingerHeadersInput.value = '';
    this.pingerBodyInput.value = '';
    this.pingerIntervalInput.value = '60';
    
    setTimeout(() => { this.pingerStatus.textContent = ''; }, 2000);
    await this.loadPingRequests();
  }

  renderPingItem(pingRequest) {
    const item = document.createElement('li');
    item.className = 'list-card';
    item.dataset.id = pingRequest.id;
    
    const main = document.createElement('div');
    main.className = 'item-main';
    
    const title = document.createElement('div');
    title.style.fontWeight = '700';
    title.style.fontSize = '13px';
    title.textContent = pingRequest.name || 'Unnamed Request';
    
    const url = document.createElement('div');
    url.style.fontSize = '12px';
    url.style.color = 'var(--muted)';
    url.textContent = `${pingRequest.method} ${pingRequest.url}`;
    
    const meta = document.createElement('div');
    meta.className = 'item-meta';
    const intervalText = `${pingRequest.interval}s interval`;
    const statusText = pingRequest.isActive ? '🟢 Active' : '⭕ Inactive';
    const lastPingText = pingRequest.lastPingAt ? ` | Last: ${new Date(pingRequest.lastPingAt).toLocaleTimeString()}` : '';
    const statusInfo = pingRequest.lastStatus ? ` | Status: ${pingRequest.lastStatus}` : '';
    meta.textContent = `${intervalText} | ${statusText}${lastPingText}${statusInfo}`;
    
    const actions = document.createElement('div');
    actions.className = 'actions-inline';
    
    const pingBtn = createActionButton({
      classes: ['replay'],
      title: 'Execute ping now',
      label: 'Ping',
      html: '',
      onClick: async () => {
        try {
          const result = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
              action: 'executePing',
              pingRequest: pingRequest
            }, (response) => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
              } else {
                resolve(response);
              }
            });
          });
          
          if (result.ok) {
            showSnackbar(`Ping executed: ${result.result.status} (${result.result.responseTime}ms)`);
            await updatePingRequest(pingRequest.id, {
              lastPingAt: Date.now(),
              lastStatus: result.result.status,
              lastError: result.result.error || null,
              pingCount: (pingRequest.pingCount || 0) + 1
            });
            await this.loadPingRequests();
          } else {
            showSnackbar(`Ping failed: ${result.error}`);
          }
        } catch (error) {
          console.error('Ping execution error:', error);
          showSnackbar(`Ping error: ${error.message}`);
        }
      }
    });

    const toggleBtn = createActionButton({
      classes: pingRequest.isActive ? ['stop'] : ['start'],
      title: pingRequest.isActive ? 'Stop ping' : 'Start ping',
      label: pingRequest.isActive ? 'Stop' : 'Start',
      html: '',
      onClick: async () => {
        if (pingRequest.isActive) {
          chrome.runtime.sendMessage({ 
            action: 'stopPing', 
            pingId: pingRequest.id 
          });
          await updatePingRequest(pingRequest.id, { isActive: false });
          showSnackbar('Ping stopped');
        } else {
          chrome.runtime.sendMessage({ 
            action: 'startPing', 
            pingRequest: { ...pingRequest, isActive: true } 
          });
          await updatePingRequest(pingRequest.id, { isActive: true });
          showSnackbar('Ping started');
        }
        await this.loadPingRequests();
      }
    });

    const editBtn = createActionButton({
      classes: ['edit'],
      title: 'Edit ping request',
      label: 'Edit',
      html: '',
      onClick: () => {
        this.editingPingerId = pingRequest.id;
        this.pingerNameInput.value = pingRequest.name || '';
        this.pingerMethodSelect.value = pingRequest.method || 'GET';
        this.pingerUrlInput.value = pingRequest.url || '';
        this.pingerHeadersInput.value = pingRequest.headers || '';
        this.pingerBodyInput.value = pingRequest.body || '';
        this.pingerIntervalInput.value = pingRequest.interval || 60;
        this.pingerStatus.textContent = 'Editing...';
      }
    });

    const delBtn = createActionButton({
      classes: ['delete'],
      title: 'Delete ping request',
      label: 'Delete',
      html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>`,
      onClick: async () => {
        if (pingRequest.isActive) {
          chrome.runtime.sendMessage({ 
            action: 'stopPing', 
            pingId: pingRequest.id 
          });
        }
        await removePingRequest(pingRequest.id);
        await this.loadPingRequests();
        showSnackbar('Ping request deleted');
      }
    });

    actions.appendChild(pingBtn);
    actions.appendChild(toggleBtn);
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
    
    main.appendChild(title);
    main.appendChild(url);
    main.appendChild(meta);
    item.appendChild(main);
    item.appendChild(actions);
    
    return item;
  }

  async loadPingRequests() {
    emptyDiv(this.pingerList);
    const requests = await getPingRequests();
    (requests || []).forEach(request => {
      this.pingerList.appendChild(this.renderPingItem(request));
    });
  }
}