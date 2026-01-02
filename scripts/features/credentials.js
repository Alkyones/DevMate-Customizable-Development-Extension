/**
 * Credentials Feature
 * Handles credentials management functionality
 */

import { addCredential, getDataFromDB } from '../db.js';
import { updateCredentialsTable } from '../functions.js';
import { copyValueToClipboard } from '../ui/dom-utils.js';
import { showSnackbar } from '../ui/snackbar.js';
import { PANEL_KEYS } from '../config/constants.js';

export class CredentialsFeature {
  constructor(panelManager) {
    this.panelManager = panelManager;
    this.initializeElements();
    this.setupEventListeners();
  }

  initializeElements() {
    this.credentialsButton = document.getElementById('credentialsButton');
    this.credentialsDiv = document.getElementById('credentials');
    this.saveCredentialButton = document.getElementById('saveCredentialButton');
    this.credentialsWebsiteInput = document.getElementById('credentialsWebsiteInput');
    this.credentialsKeyInput = document.getElementById('credentialsKeyInput');
    this.credentialsValueInput = document.getElementById('credentialsValueInput');
    this.credentialsList = document.getElementById('credentialsList');
  }

  setupEventListeners() {
    this.credentialsButton?.addEventListener('click', () => this.handleShowCredentials());
    this.saveCredentialButton?.addEventListener('click', () => this.handleSaveCredential());
  }

  async autoFillCurrentSite() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url) {
        const url = new URL(tab.url);
        const domain = url.hostname.replace(/^www\./, '');
        if (this.credentialsWebsiteInput && !this.credentialsWebsiteInput.value) {
          this.credentialsWebsiteInput.value = domain;
        }
      }
    } catch (e) {
      // Ignore - might not have tab access
    }
  }

  async handleShowCredentials() {
    await this.panelManager.toggleDisplay(this.credentialsButton);
    if (this.panelManager.isVisible(PANEL_KEYS.CREDENTIALS)) {
      await this.autoFillCurrentSite();
      const credentialsData = await getDataFromDB('credentials');
      await this.cacheCredentialsForContextMenu(credentialsData);
      await updateCredentialsTable(credentialsData, this.credentialsList);
    }
  }

  async handleSaveCredential() {
    const website = this.credentialsWebsiteInput?.value.trim() || '';
    const key = this.credentialsKeyInput?.value.trim() || '';
    const value = this.credentialsValueInput?.value.trim() || '';
    
    if (website && key && value) {
      await addCredential(website, key, value);
      this.credentialsWebsiteInput.value = '';
      this.credentialsKeyInput.value = '';
      this.credentialsValueInput.value = '';
      showSnackbar('Credential saved');
      await this.autoFillCurrentSite();
    } else {
      alert('Please enter website, username and password.');
    }
    
    const data = await getDataFromDB('credentials');
    await this.cacheCredentialsForContextMenu(data);
    await updateCredentialsTable(data, this.credentialsList);
  }

  // Cache credentials for context menu access
  async cacheCredentialsForContextMenu(credentials) {
    try {
      await chrome.storage.local.set({ credentialsCache: credentials || [] });
    } catch (e) {
      console.warn('Failed to cache credentials:', e);
    }
  }
}