/**
 * Credential Generator Feature
 * Handles username, password, and email generation
 */

import { CONFIG, PANEL_KEYS } from '../config/constants.js';
import { pick } from '../ui/dom-utils.js';
import { showSnackbar } from '../ui/snackbar.js';

export class CredentialGenerator {
  constructor(panelManager) {
    this.panelManager = panelManager;
    this.initializeElements();
    this.setupEventListeners();
  }

  initializeElements() {
    this.generateCredentialsDiv = document.getElementById('generate-credentials');
    this.generateUsernameButton = document.getElementById('generateUsernameButton');
    this.generatePasswordButton = document.getElementById('generatePasswordButton');
    this.generateEmailButton = document.getElementById('generateEmailButton');
    this.generatedResult = document.getElementById('generatedResult');
  }

  setupEventListeners() {
    const generateCredentialsButton = document.getElementById('generateCredentialsButton');
    generateCredentialsButton?.addEventListener('click', () => this.handleShowGenerator());
    
    this.generateUsernameButton?.addEventListener('click', () => this.handleGenerateUsername());
    this.generatePasswordButton?.addEventListener('click', () => this.handleGeneratePassword());
    this.generateEmailButton?.addEventListener('click', () => this.handleGenerateEmail());
    
    // Add click listener to result div for copy and hide
    this.generatedResult?.addEventListener('click', () => this.handleResultClick());
  }

  /**
   * Generate a semi-random username (adjective + animal + number)
   * @returns {string}
   */
  generateUsername() {
    const { ADJECTIVES, ANIMALS } = CONFIG.GENERATORS;
    const number = Math.floor(Math.random() * 1000);
    return `${pick(ADJECTIVES)}${pick(ANIMALS)}${number}`;
  }

  /**
   * Generate a cryptographically strong password
   * @param {number} [length=12]
   * @returns {string}
   */
  generatePassword(length = CONFIG.UI.PASSWORD_LENGTH) {
    const chars = CONFIG.GENERATORS.PASSWORD_CHARS;
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
  generateEmail() {
    const { EMAIL_PROVIDERS } = CONFIG.GENERATORS;
    return `${this.generateUsername()}@${pick(EMAIL_PROVIDERS)}`;
  }

  async handleShowGenerator() {
    await this.panelManager.toggleDisplay(document.getElementById('generateCredentialsButton'));
  }

  async handleGenerateUsername() {
    const username = this.generateUsername();
    this.displayResult('Username', username);
  }

  async handleGeneratePassword() {
    const password = this.generatePassword();
    this.displayResult('Password', password);
  }

  async handleGenerateEmail() {
    const email = this.generateEmail();
    this.displayResult('Email', email);
  }

  displayResult(type, value) {
    if (this.generatedResult) {
      this.generatedResult.textContent = value;
      this.generatedResult.classList.add('show');
      this.generatedResult.dataset.value = value; // Store value for later use
    }
    showSnackbar(`${type} generated and copied!`);
    
    // Copy to clipboard
    this.copyToClipboard(value);
  }

  handleResultClick() {
    if (this.generatedResult) {
      const value = this.generatedResult.dataset.value || this.generatedResult.textContent;
      this.copyToClipboard(value);
      showSnackbar('Copied!');
      
      // Hide the result
      this.generatedResult.classList.remove('show');
    }
  }

  async copyToClipboard(value) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(String(value));
        return;
      }
    } catch (e) {
      // fall through to legacy approach
    }

    // Legacy fallback
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
}