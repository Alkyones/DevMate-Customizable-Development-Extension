/**
 * Credentials Feature
 * Handles credentials management functionality
 */

import { addCredential, getDataFromDB } from '../db.js';
import { updateTable, createListItemElement } from '../functions.js';
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

  async handleShowCredentials() {
    await this.panelManager.toggleDisplay(this.credentialsButton);
    if (this.panelManager.isVisible(PANEL_KEYS.CREDENTIALS)) {
      const credentialsData = await getDataFromDB('credentials');
      await updateTable('credentials', credentialsData, this.credentialsList);
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
    } else {
      alert('Please enter website, username and password.');
    }
    
    const data = await getDataFromDB('credentials');
    await updateTable('credentials', data, this.credentialsList);
  }
}