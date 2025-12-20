/**
 * Useful Links Feature
 * Handles useful links management functionality
 */

import { addLink, getDataFromDB } from '../db.js';
import { updateTable, createListItemElement } from '../functions.js';
import { showSnackbar } from '../ui/snackbar.js';
import { PANEL_KEYS } from '../config/constants.js';

export class UsefulLinksFeature {
  constructor(panelManager) {
    this.panelManager = panelManager;
    this.initializeElements();
    this.setupEventListeners();
  }

  initializeElements() {
    this.showLinksButton = document.getElementById('showLinksButton');
    this.addLinksDiv = document.getElementById('links');
    this.saveLinkButton = document.getElementById('saveLinkButton');
    this.saveCurrentLinkButton = document.getElementById('saveCurrentLinkButton');
    this.usefulLinkKeyInput = document.getElementById('linkKeyInput');
    this.usefulLinkValueInput = document.getElementById('linkValueInput');
    this.usefulLinksList = document.getElementById('usefulLinks');
  }

  setupEventListeners() {
    this.showLinksButton?.addEventListener('click', () => this.handleShowLinks());
    this.saveLinkButton?.addEventListener('click', () => this.handleSaveLink());
    this.saveCurrentLinkButton?.addEventListener('click', () => this.handleSaveCurrentLink());
  }

  async handleShowLinks() {
    await this.panelManager.toggleDisplay(this.showLinksButton);
    if (this.panelManager.isVisible(PANEL_KEYS.LINKS)) {
      const linksInDB = await getDataFromDB('usefulLinks');
      await updateTable('usefulLinks', linksInDB, this.usefulLinksList);
    }
  }

  async handleSaveLink() {
    try {
      const key = (this.usefulLinkKeyInput?.value || '').trim();
      const value = (this.usefulLinkValueInput?.value || '').trim();
      if (!key || !value) { 
        alert('Please enter both a key and a value.'); 
        return; 
      }
      const ok = await addLink(key, value);
      if (ok) showSnackbar('Link saved');
      if (this.usefulLinkKeyInput) this.usefulLinkKeyInput.value = '';
      if (this.usefulLinkValueInput) this.usefulLinkValueInput.value = '';
      const data = await getDataFromDB('usefulLinks');
      await updateTable('usefulLinks', data, this.usefulLinksList);
    } catch (err) {
      console.error('saveLink error', err);
      showSnackbar('Error saving link');
    }
  }

  async handleSaveCurrentLink() {
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        const activeTab = tabs && tabs[0];
        if (!activeTab) { 
          showSnackbar('No active tab'); 
          return; 
        }
        const key = activeTab.title || activeTab.url;
        const value = activeTab.url;
        const ok = await addLink(key, value);
        if (ok) showSnackbar('Current link saved');
        const data = await getDataFromDB('usefulLinks');
        await updateTable('usefulLinks', data, this.usefulLinksList);
      });
    } catch (err) {
      console.error('saveCurrentLink error', err);
      showSnackbar('Error saving current link');
    }
  }
}