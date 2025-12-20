/**
 * Local Storage Feature
 * Handles local storage inspection functionality
 */

import { PANEL_KEYS } from '../config/constants.js';

/**
 * Send localStorage snapshot to the background (if any)
 */
function checkLocalStorage() {
  const isEmpty = Object.keys(localStorage).length === 0;
  const localStorageData = isEmpty ? null : localStorage;
  chrome.runtime.sendMessage({ action: 'localStorage', isEmpty, localStorageData }, (response) => {
    if (chrome.runtime.lastError) {
      console.warn('localStorage message failed:', chrome.runtime.lastError);
    }
  });
}

export class LocalStorageFeature {
  constructor(panelManager) {
    this.panelManager = panelManager;
    this.setupEventListeners();
  }

  setupEventListeners() {
    const showLocalStorageButton = document.getElementById('checkButton');
    showLocalStorageButton?.addEventListener('click', () => this.handleShowLocalStorage());
  }

  async handleShowLocalStorage() {
    await this.panelManager.toggleDisplay(document.getElementById('checkButton'));
    
    if (this.panelManager.isVisible(PANEL_KEYS.LOCAL_STORAGE)) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        if (!activeTab) return;
        chrome.scripting.executeScript({ 
          target: { tabId: activeTab.id }, 
          function: checkLocalStorage 
        });
      });
    }
  }
}