/**
 * Panel Manager - Handles panel visibility and state management
 */

import { PANEL_KEYS } from '../config/constants.js';
import { emptyDiv } from '../ui/dom-utils.js';

export class PanelManager {
  constructor() {
    this.visibleState = {
      [PANEL_KEYS.LOCAL_STORAGE]: false,
      [PANEL_KEYS.LINKS]: false,
      [PANEL_KEYS.CREDENTIALS]: false,
      [PANEL_KEYS.FETCHES]: false,
      [PANEL_KEYS.GENERATOR]: false,
      [PANEL_KEYS.CODE_KEEPER]: false,
      [PANEL_KEYS.PINGER]: false
    };
    
    this.initializePanelMap();
    this.initializeSideMenu();
  }

  initializePanelMap() {
    this.panelMap = new Map([
      [document.getElementById('checkButton'), { 
        key: PANEL_KEYS.LOCAL_STORAGE, 
        element: document.getElementById('result') 
      }],
      [document.getElementById('showLinksButton'), { 
        key: PANEL_KEYS.LINKS, 
        element: document.getElementById('links') 
      }],
      [document.getElementById('credentialsButton'), { 
        key: PANEL_KEYS.CREDENTIALS, 
        element: document.getElementById('credentials') 
      }],
      [document.getElementById('fetchesButton'), { 
        key: PANEL_KEYS.FETCHES, 
        element: document.getElementById('fetch-requests') 
      }],
      [document.getElementById('generateCredentialsButton'), { 
        key: PANEL_KEYS.GENERATOR, 
        element: document.getElementById('generate-credentials') 
      }],
      [document.getElementById('codeKeeperButton'), { 
        key: PANEL_KEYS.CODE_KEEPER, 
        element: document.getElementById('code-keeper') 
      }],
      [document.getElementById('pingerButton'), { 
        key: PANEL_KEYS.PINGER, 
        element: document.getElementById('pinger') 
      }]
    ]);
  }

  initializeSideMenu() {
    const sideMenu = document.getElementById('sideMenu');
    const sideMenuToggle = document.getElementById('sideMenuToggle');

    if (sideMenu) {
      const menuButtons = sideMenu.querySelectorAll('.button-container > button');
      
      menuButtons.forEach(btn => {
        const tooltip = btn.querySelector('.btn-label') && btn.querySelector('.btn-label').textContent.trim();
        if (tooltip) btn.setAttribute('aria-label', tooltip);
      });
    }

    // Initialize side menu as expanded
    try {
      document.body.classList.remove('side-collapsed');
      if (sideMenuToggle) sideMenuToggle.title = 'Hide';
      chrome.storage && chrome.storage.local && chrome.storage.local.set({ sideCollapsed: false });
    } catch (e) { /* ignore */ }

    sideMenuToggle?.addEventListener('click', () => {
      const collapsed = document.body.classList.toggle('side-collapsed');
      sideMenuToggle.title = collapsed ? 'Expand' : 'Hide';
      try {
        chrome.storage.local.set({ sideCollapsed: collapsed });
      } catch (e) {
        // fall back silently if storage not available
      }
    });
  }

  cleanTooltipLabel(raw) {
    if (!raw) return '';
    let s = String(raw).trim();
    s = s.replace(/\.{2,}$/g, '').trim();
    s = s.replace(/^(Show|Hide|Check|Hide\s+Code|Add)\s+/i, '');
    s = s.replace(/^Hide\s+/i, '');
    s = s.replace(/^Show\s+/i, '');
    return s.trim();
  }

  setButtonLabel(button, text) {
    if (!button) return;
    const lbl = button.querySelector('.btn-label');
    if (lbl) {
      lbl.textContent = text;
    } else {
      button.textContent = text;
    }
  }

  async toggleDisplay(button) {
    // Clear common elements
    emptyDiv(document.getElementById('result'));
    emptyDiv(document.getElementById('credentialsList'));
    emptyDiv(document.getElementById('fetchRequestList'));

    const info = this.panelMap.get(button);
    if (!info) return;

    // Toggle the requested panel, hide others
    for (const [, p] of this.panelMap.entries()) {
      this.visibleState[p.key] = (p === info) ? !this.visibleState[p.key] : false;
    }

    // Update element visibility
    for (const [, p] of this.panelMap.entries()) {
      if (p.element) p.element.hidden = !this.visibleState[p.key];
    }

    // Update button labels
    this.updateButtonLabels();
  }

  updateButtonLabels() {
    const buttons = {
      checkButton: {
        visible: this.visibleState[PANEL_KEYS.LOCAL_STORAGE],
        showText: 'Show Local Storage',
        hideText: 'Hide Local Storage'
      },
      showLinksButton: {
        visible: this.visibleState[PANEL_KEYS.LINKS],
        showText: 'Show Useful Links',
        hideText: 'Hide Useful Links'
      },
      credentialsButton: {
        visible: this.visibleState[PANEL_KEYS.CREDENTIALS],
        showText: 'Show Credentials',
        hideText: 'Hide Credentials'
      },
      fetchesButton: {
        visible: this.visibleState[PANEL_KEYS.FETCHES],
        showText: 'Show Fetch Requests',
        hideText: 'Hide Fetch Requests'
      },
      generateCredentialsButton: {
        visible: this.visibleState[PANEL_KEYS.GENERATOR],
        showText: 'Show Credential Generator',
        hideText: 'Hide Credential Generator'
      },
      codeKeeperButton: {
        visible: this.visibleState[PANEL_KEYS.CODE_KEEPER],
        showText: 'Code Keeper',
        hideText: 'Hide Code Keeper'
      },
      pingerButton: {
        visible: this.visibleState[PANEL_KEYS.PINGER],
        showText: 'Pinger',
        hideText: 'Hide Pinger'
      }
    };

    Object.entries(buttons).forEach(([buttonId, config]) => {
      const button = document.getElementById(buttonId);
      if (button) {
        this.setButtonLabel(button, config.visible ? config.hideText : config.showText);
      }
    });
  }

  isVisible(panelKey) {
    return this.visibleState[panelKey];
  }
}