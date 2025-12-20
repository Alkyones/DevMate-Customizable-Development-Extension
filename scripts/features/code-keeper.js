/**
 * Code Keeper Feature
 * Handles code snippets management functionality
 */

import { addSnippet, getSnippets, removeSnippet, updateSnippet } from '../db.js';
import { copyValueToClipboard, createActionButton } from '../ui/dom-utils.js';
import { showSnackbar } from '../ui/snackbar.js';
import { emptyDiv } from '../ui/dom-utils.js';
import { PANEL_KEYS } from '../config/constants.js';

export class CodeKeeperFeature {
  constructor(panelManager) {
    this.panelManager = panelManager;
    this.editingSnippetId = null;
    this.initializeElements();
    this.setupEventListeners();
  }

  initializeElements() {
    this.codeKeeperButton = document.getElementById('codeKeeperButton');
    this.codeKeeperDiv = document.getElementById('code-keeper');
    this.codeTitleInput = document.getElementById('codeTitleInput');
    this.codeTextarea = document.getElementById('codeTextarea');
    this.saveSnippetButton = document.getElementById('saveSnippetButton');
    this.codeSnippetList = document.getElementById('codeSnippetList');
    this.snippetStatus = document.getElementById('snippetStatus');
  }

  setupEventListeners() {
    this.codeKeeperButton?.addEventListener('click', () => this.handleShowCodeKeeper());
    this.saveSnippetButton?.addEventListener('click', () => this.handleSaveSnippet());
  }

  async handleShowCodeKeeper() {
    await this.panelManager.toggleDisplay(this.codeKeeperButton);
    if (this.panelManager.isVisible(PANEL_KEYS.CODE_KEEPER)) {
      await this.loadSnippets();
    }
  }

  async handleSaveSnippet() {
    const title = (this.codeTitleInput?.value || '').trim();
    const code = (this.codeTextarea?.value || '').trim();
    
    if (!code) { 
      alert('Please enter some code'); 
      return; 
    }
    
    const payload = { 
      title: title || (code.slice(0, 64) + (code.length > 64 ? '...' : '')), 
      code 
    };
    
    if (this.editingSnippetId) {
      await updateSnippet(this.editingSnippetId, { title: payload.title, code: payload.code });
      this.snippetStatus.textContent = 'Saved (updated)';
      this.editingSnippetId = null;
    } else {
      await addSnippet(payload);
      this.snippetStatus.textContent = 'Saved';
    }
    
    this.codeTitleInput.value = '';
    this.codeTextarea.value = '';
    setTimeout(() => { this.snippetStatus.textContent = ''; }, 1200);
    await this.loadSnippets();
  }

  renderSnippetItem(s) {
    const item = document.createElement('li');
    item.className = 'list-card';
    item.dataset.id = s.id;
    
    const main = document.createElement('div'); 
    main.className = 'item-main';
    
    const title = document.createElement('div'); 
    title.style.fontWeight = '700'; 
    title.style.fontSize = '13px'; 
    title.textContent = s.title || '(untitled)';
    
    const meta = document.createElement('div'); 
    meta.className = 'item-meta'; 
    meta.textContent = s.updatedAt ? new Date(s.updatedAt).toLocaleString() : '';
    
    const actions = document.createElement('div'); 
    actions.className = 'actions-inline';

    const copyBtn = createActionButton({ 
      classes: ['replay'], 
      title: 'Copy code', 
      label: 'Copy', 
      html: '', 
      onClick: () => { 
        copyValueToClipboard(s.code); 
        showSnackbar('Copied'); 
      } 
    });
    
    const editBtn = createActionButton({ 
      classes: ['edit'], 
      title: 'Edit snippet', 
      label: 'Edit', 
      html: '', 
      onClick: () => { 
        this.editingSnippetId = s.id; 
        this.codeTitleInput.value = s.title || ''; 
        this.codeTextarea.value = s.code || ''; 
        this.snippetStatus.textContent = 'Editing...'; 
      } 
    });
    
    const delBtn = createActionButton({ 
      classes: ['delete'], 
      title: 'Delete snippet', 
      label: 'Delete', 
      html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>`, 
      onClick: async () => { 
        await removeSnippet(s.id); 
        await this.loadSnippets(); 
        showSnackbar('Deleted'); 
      } 
    });

    actions.appendChild(copyBtn); 
    actions.appendChild(editBtn); 
    actions.appendChild(delBtn);
    main.appendChild(title); 
    main.appendChild(meta);
    item.appendChild(main); 
    item.appendChild(actions);
    return item;
  }

  async loadSnippets() {
    emptyDiv(this.codeSnippetList);
    const items = await getSnippets();
    (items || []).forEach(s => this.codeSnippetList.appendChild(this.renderSnippetItem(s)));
  }
}