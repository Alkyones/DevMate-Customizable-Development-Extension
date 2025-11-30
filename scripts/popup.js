import { emptyDiv, copyValueToClipboard, checkLocalStorage, updateTable, generateUsername, generatePassword, generateEmail } from './functions.js';
import { addLink, addCredential, getDataFromDB, addCapturedRequest, getCapturedRequests, removeCapturedRequest, updateCapturedRequest, dbReady, addSnippet, getSnippets, removeSnippet, updateSnippet } from './db.js';

// DOM refs
const resultDiv = document.getElementById('result');
const credentialsDiv = document.getElementById('credentials');
const addLinksDiv = document.getElementById('links');
const showLocalStorageButton = document.getElementById('checkButton');
const credentialsButton = document.getElementById('credentialsButton');
const saveLinkButton = document.getElementById('saveLinkButton');
const saveCurrentLinkButton = document.getElementById('saveCurrentLinkButton');
const showLinksButton = document.getElementById('showLinksButton');
const saveCredentialButton = document.getElementById('saveCredentialButton');
const usefulLinkKeyInput = document.getElementById('linkKeyInput');
const usefulLinkValueInput = document.getElementById('linkValueInput');
const usefulLinksList = document.getElementById('usefulLinks');
const credentialsWebsiteInput = document.getElementById('credentialsWebsiteInput');
const credentialsKeyInput = document.getElementById('credentialsKeyInput');
const credentialsValueInput = document.getElementById('credentialsValueInput');
const credentialsList = document.getElementById('credentialsList');
const fetchListDiv = document.getElementById('fetch-requests');
const fetchList = document.getElementById('fetchRequestList');
const showFetchesButton = document.getElementById('fetchesButton');
const captureToggle = document.getElementById('captureToggle');
const clearCapturedButton = document.getElementById('clearCapturedButton');
const generateCredentialsDiv = document.getElementById('generate-credentials');
const generateCredentialsButton = document.getElementById('generateCredentialsButton');
const generateUsernameButton = document.getElementById('generateUsernameButton');
const generatePasswordButton = document.getElementById('generatePasswordButton');
const generateEmailButton = document.getElementById('generateEmailButton');
const generatedResult = document.getElementById('generatedResult');
const codeKeeperButton = document.getElementById('codeKeeperButton');
const codeKeeperDiv = document.getElementById('code-keeper');
const codeTitleInput = document.getElementById('codeTitleInput');
const codeTextarea = document.getElementById('codeTextarea');
const saveSnippetButton = document.getElementById('saveSnippetButton');
const codeSnippetList = document.getElementById('codeSnippetList');
const snippetStatus = document.getElementById('snippetStatus');
const sideMenuToggle = document.getElementById('sideMenuToggle');
const sideMenu = document.getElementById('sideMenu');
const popupContent = document.getElementById('popup-content');

// visible state for panels
const visibleState = {
  localStorageVisible: false,
  linksListVisible: false,
  credentialsVisible: false,
  fetchListVisible: false,
  generateCredentialsVisible: false,
  codeKeeperVisible: false,
};

// Helper: set button label without removing icon nodes
function setButtonLabel(button, text) {
  if (!button) return;
  const lbl = button.querySelector('.btn-label');
  if (lbl) {
    lbl.textContent = text;
    // keep tooltip in sync with label (cleaned)
    const cleaned = cleanTooltipLabel(text);
    button.dataset.tooltip = cleaned;
  } else {
    button.textContent = text;
    button.dataset.tooltip = cleanTooltipLabel(text);
  }
}

function cleanTooltipLabel(raw) {
  if (!raw) return '';
  // remove common leading verbs/words like 'Show', 'Hide', 'Check', 'Hide Code', etc.
  // Also remove leading punctuation and ellipses
  let s = String(raw).trim();
  // remove trailing ellipsis and collapse spaces
  s = s.replace(/\.{2,}$/g, '').trim();
  s = s.replace(/^(Show|Hide|Check|Hide\s+Code|Add)\s+/i, '');
  // If it starts with 'Hide ' remove it
  s = s.replace(/^Hide\s+/i, '');
  // remove leading 'Show Fetch' -> 'Fetch'
  s = s.replace(/^Show\s+/i, '');
  return s.trim();
}

// Panel mapping for toggles
const panelMap = new Map([
  [showLocalStorageButton, { key: 'localStorageVisible', element: resultDiv }],
  [showLinksButton, { key: 'linksListVisible', element: addLinksDiv }],
  [credentialsButton, { key: 'credentialsVisible', element: credentialsDiv }],
  [showFetchesButton, { key: 'fetchListVisible', element: fetchListDiv }],
  [generateCredentialsButton, { key: 'generateCredentialsVisible', element: generateCredentialsDiv }],
  [codeKeeperButton, { key: 'codeKeeperVisible', element: codeKeeperDiv }],
]);

// Side menu toggle: collapse/expand the left menu
// initialize side menu button tooltips (data-tooltip) from label text
if (sideMenu) {
  const menuButtons = sideMenu.querySelectorAll('.button-container > button');
  menuButtons.forEach(btn => {
    const lbl = btn.querySelector('.btn-label');
    if (lbl) btn.dataset.tooltip = cleanTooltipLabel(lbl.textContent.trim());
  });
  // accessibility: set aria-label from tooltip or visible label so screen readers have a name
  menuButtons.forEach(btn => {
    const tooltip = btn.dataset.tooltip || (btn.querySelector('.btn-label') && btn.querySelector('.btn-label').textContent.trim());
    if (tooltip) btn.setAttribute('aria-label', tooltip);
  });
}

// restore collapsed state from storage
// Force start expanded (do not automatically restore hidden state on load)
// but persist future toggles. This ensures popup opens expanded each time.
try {
  document.body.classList.remove('side-collapsed');
  if (sideMenuToggle) sideMenuToggle.title = 'Hide';
  // set storage to false so previous hidden state doesn't persist
  chrome.storage && chrome.storage.local && chrome.storage.local.set({ sideCollapsed: false });
} catch (e) { /* ignore */ }

sideMenuToggle?.addEventListener('click', () => {
  const collapsed = document.body.classList.toggle('side-collapsed');
  sideMenuToggle.title = collapsed ? 'Expand' : 'Hide';
  // persist state
  try {
    chrome.storage.local.set({ sideCollapsed: collapsed });
  } catch (e) {
    // fall back silently if storage not available
  }
});

// Toggle display: hide others and toggle the requested panel
async function toggleDisplay(button) {
  emptyDiv(resultDiv);
  emptyDiv(credentialsList);
  emptyDiv(fetchList);

  const info = panelMap.get(button);
  if (!info) return;

  for (const [, p] of panelMap.entries()) {
    visibleState[p.key] = (p === info) ? !visibleState[p.key] : false;
  }

  for (const [btn, p] of panelMap.entries()) {
    if (p.element) p.element.hidden = !visibleState[p.key];
  }

  setButtonLabel(showLocalStorageButton, visibleState.localStorageVisible ? 'Hide Local Storage' : 'Show Local Storage');
  setButtonLabel(showLinksButton, visibleState.linksListVisible ? 'Hide Useful Links' : 'Show Useful Links');
  setButtonLabel(credentialsButton, visibleState.credentialsVisible ? 'Hide Credentials' : 'Show Credentials');
  setButtonLabel(showFetchesButton, visibleState.fetchListVisible ? 'Hide Fetch Requests' : 'Show Fetch Requests');
  setButtonLabel(generateCredentialsButton, visibleState.generateCredentialsVisible ? 'Hide Credential Generator' : 'Show Credential Generator');
  setButtonLabel(codeKeeperButton, visibleState.codeKeeperVisible ? 'Hide Code Keeper' : 'Code Keeper');
}

// Snackbar for small transient messages
function showSnackbar(text, timeout = 1400) {
  const bar = document.getElementById('copied');
  if (!bar) return;
  bar.textContent = text;
  bar.classList.add('show');
  clearTimeout(bar._hideTimer);
  bar._hideTimer = setTimeout(() => bar.classList.remove('show'), timeout);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ----------- EVENT HANDLERS (cleaned) -----------
saveCredentialButton?.addEventListener('click', async () => {
  await dbReady;
  const website = credentialsWebsiteInput?.value.trim() || '';
  const key = credentialsKeyInput?.value.trim() || '';
  const value = credentialsValueInput?.value.trim() || '';
  if (website && key && value) {
    await addCredential(website, key, value);
    credentialsWebsiteInput.value = '';
    credentialsKeyInput.value = '';
    credentialsValueInput.value = '';
  } else {
    alert('Please enter website, username and password.');
  }
  const data = await getDataFromDB('credentials');
  await updateTable('credentials', data, credentialsList);
});

saveLinkButton?.addEventListener('click', async () => {
  try {
    await dbReady;
    const key = (usefulLinkKeyInput?.value || '').trim();
    const value = (usefulLinkValueInput?.value || '').trim();
    if (!key || !value) { alert('Please enter both a key and a value.'); return; }
    const ok = await addLink(key, value);
    if (ok) showSnackbar('Link saved');
    if (usefulLinkKeyInput) usefulLinkKeyInput.value = '';
    if (usefulLinkValueInput) usefulLinkValueInput.value = '';
    const data = await getDataFromDB('usefulLinks');
    await updateTable('usefulLinks', data, usefulLinksList);
  } catch (err) {
    console.error('saveLink error', err);
    showSnackbar('Error saving link');
  }
});

saveCurrentLinkButton?.addEventListener('click', async () => {
  try {
    await dbReady;
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const activeTab = tabs && tabs[0];
      if (!activeTab) { showSnackbar('No active tab'); return; }
      const key = activeTab.title || activeTab.url;
      const value = activeTab.url;
      const ok = await addLink(key, value);
      if (ok) showSnackbar('Current link saved');
      const data = await getDataFromDB('usefulLinks');
      await updateTable('usefulLinks', data, usefulLinksList);
    });
  } catch (err) {
    console.error('saveCurrentLink error', err);
    showSnackbar('Error saving current link');
  }
});

showLinksButton?.addEventListener('click', async () => {
  await dbReady;
  await toggleDisplay(showLinksButton);
  if (visibleState.linksListVisible) {
    const linksInDB = await getDataFromDB('usefulLinks');
    await updateTable('usefulLinks', linksInDB, usefulLinksList);
  }
});

showLocalStorageButton?.addEventListener('click', async () => {
  await dbReady;
  await toggleDisplay(showLocalStorageButton);
  if (visibleState.localStorageVisible) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab) return;
      chrome.scripting.executeScript({ target: { tabId: activeTab.id }, function: checkLocalStorage });
    });
  }
});

credentialsButton?.addEventListener('click', async () => {
  await dbReady;
  await toggleDisplay(credentialsButton);
  if (visibleState.credentialsVisible) {
    const credentialsData = await getDataFromDB('credentials');
    await updateTable('credentials', credentialsData, credentialsList);
  }
});

showFetchesButton?.addEventListener('click', async () => {
  await dbReady;
  await toggleDisplay(showFetchesButton);
  if (visibleState.fetchListVisible) {
    await loadCapturedRequests();
    chrome.storage.local.get({ captureEnabled: false }, (items) => { captureToggle.checked = !!items.captureEnabled; });
  }
});

// ----------- Code Keeper handlers -----------
let _editingSnippetId = null;

function renderSnippetItem(s) {
  const item = document.createElement('li');
  item.className = 'list-card';
  item.dataset.id = s.id;
  const main = document.createElement('div'); main.className = 'item-main';
  const title = document.createElement('div'); title.style.fontWeight = '700'; title.style.fontSize = '13px'; title.textContent = s.title || '(untitled)';
  const meta = document.createElement('div'); meta.className = 'item-meta'; meta.textContent = s.updatedAt ? new Date(s.updatedAt).toLocaleString() : '';
  const actions = document.createElement('div'); actions.className = 'actions-inline';

  const copyBtn = createActionButton({ classes: ['replay'], title: 'Copy code', label: 'Copy', html: '', onClick: () => { copyValueToClipboard(s.code); showSnackbar('Copied'); } });
  const editBtn = createActionButton({ classes: ['edit'], title: 'Edit snippet', label: 'Edit', html: '', onClick: () => { _editingSnippetId = s.id; codeTitleInput.value = s.title || ''; codeTextarea.value = s.code || ''; snippetStatus.textContent = 'Editing...'; } });
  const delBtn = createActionButton({ classes: ['delete'], title: 'Delete snippet', label: 'Delete', html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>`, onClick: async () => { await removeSnippet(s.id); await loadSnippets(); showSnackbar('Deleted'); } });

  actions.appendChild(copyBtn); actions.appendChild(editBtn); actions.appendChild(delBtn);
  main.appendChild(title); main.appendChild(meta);
  item.appendChild(main); item.appendChild(actions);
  return item;
}

async function loadSnippets() {
  emptyDiv(codeSnippetList);
  const items = await getSnippets();
  (items || []).forEach(s => codeSnippetList.appendChild(renderSnippetItem(s)));
}

saveSnippetButton?.addEventListener('click', async () => {
  await dbReady;
  const title = (codeTitleInput?.value || '').trim();
  const code = (codeTextarea?.value || '').trim();
  if (!code) { alert('Please enter some code'); return; }
  const payload = { title: title || (code.slice(0, 64) + (code.length > 64 ? '...' : '')), code };
  if (_editingSnippetId) {
    await updateSnippet(_editingSnippetId, { title: payload.title, code: payload.code });
    snippetStatus.textContent = 'Saved (updated)';
    _editingSnippetId = null;
  } else {
    await addSnippet(payload);
    snippetStatus.textContent = 'Saved';
  }
  codeTitleInput.value = '';
  codeTextarea.value = '';
  setTimeout(() => { snippetStatus.textContent = ''; }, 1200);
  await loadSnippets();
});

codeKeeperButton?.addEventListener('click', async () => {
  await dbReady;
  await toggleDisplay(codeKeeperButton);
  if (visibleState.codeKeeperVisible) {
    await loadSnippets();
  }
});

captureToggle?.addEventListener('change', () => {
  const enabled = !!captureToggle.checked;
  chrome.runtime.sendMessage({ action: 'toggleCapture', enabled }, (resp) => {
    if (chrome.runtime.lastError) console.warn('toggleCapture send failed', chrome.runtime.lastError);
    else showSnackbar(enabled ? 'Capture enabled' : 'Capture disabled');
  });
});

clearCapturedButton?.addEventListener('click', () => {
  chrome.storage.local.set({ capturedRequests: [] }, () => {
    emptyDiv(fetchList);
    const replayDiv = document.getElementById('replayResult');
    if (replayDiv) replayDiv.innerHTML = '';
    showSnackbar('Cleared captured requests');
  });
});

generateCredentialsButton?.addEventListener('click', async () => await toggleDisplay(generateCredentialsButton));

generateUsernameButton?.addEventListener('click', () => {
  const username = generateUsername();
  if (generatedResult) { generatedResult.textContent = username; generatedResult.classList.add('show'); }
});
generatePasswordButton?.addEventListener('click', () => {
  const password = generatePassword();
  if (generatedResult) { generatedResult.textContent = password; generatedResult.classList.add('show'); }
});
generateEmailButton?.addEventListener('click', () => {
  const email = generateEmail();
  if (generatedResult) { generatedResult.textContent = email; generatedResult.classList.add('show'); }
});

generatedResult?.addEventListener('click', () => {
  const text = generatedResult.textContent || '';
  if (!text) return;
  copyValueToClipboard(text);
  showSnackbar('Copied');
  generatedResult.classList.remove('show');
  const onTransitionEnd = (e) => {
    if (e.propertyName === 'opacity') {
      generatedResult.textContent = '';
      generatedResult.removeEventListener('transitionend', onTransitionEnd);
    }
  };
  generatedResult.addEventListener('transitionend', onTransitionEnd);
});

// ----------- Fetch/captured requests UI helpers -----------
function createActionButton({ classes = [], title = '', label = '', html = '', onClick = null }) {
  const btn = document.createElement('button');
  btn.classList.add('small-btn', ...classes);
  if (title) btn.title = title;
  if (label) {
    const lbl = document.createElement('span'); lbl.textContent = label; btn.appendChild(lbl);
  }
  if (html) {
    const icon = document.createElement('span'); icon.className = 'action-icon'; icon.innerHTML = html; btn.insertBefore(icon, btn.firstChild);
  }
  if (typeof onClick === 'function') btn.addEventListener('click', onClick);
  return btn;
}

// Utility: Create styled Save button
function createStyledSaveButton(text = 'Save') {
  const btn = document.createElement('button');
  btn.className = 'btn-save';
  btn.textContent = text;
  return btn;
}

// Utility: Create styled Cancel button
function createStyledCancelButton(text = 'Cancel') {
  const btn = document.createElement('button');
  btn.className = 'btn-cancel';
  btn.textContent = text;
  return btn;
}

// Utility: Create styled textarea
function createStyledTextarea(value = '', height = '80px') {
  const textarea = document.createElement('textarea');
  textarea.className = 'edit-box-textarea';
  textarea.value = value;
  textarea.style.height = height;
  return textarea;
}

// Utility: Create styled input
function createStyledInput(value = '', type = 'text') {
  const input = document.createElement('input');
  input.className = 'edit-box-input';
  input.type = type;
  input.value = value;
  return input;
}

// Utility: Create form label
function createLabel(text) {
  const label = document.createElement('div');
  label.className = 'edit-box-label';
  label.textContent = text;
  return label;
}

function createFetchItem(r, { prepend = false } = {}) {
  const newListItem = document.createElement('li');
  newListItem.classList.add('fetch-item');
  newListItem.dataset.requestId = r.id;

  const meta = document.createElement('div'); meta.className = 'request-meta';
  const methodBadge = document.createElement('div'); methodBadge.className = 'request-method'; methodBadge.textContent = r.method;
  const urlSpan = document.createElement('div'); urlSpan.className = 'request-url'; urlSpan.title = r.url; urlSpan.textContent = `${r.url} (${new Date(r.timestamp).toLocaleTimeString()})`;
  meta.appendChild(methodBadge); meta.appendChild(urlSpan);

  const actions = document.createElement('div'); actions.className = 'request-actions';

  const replayBtn = createActionButton({ classes: ['replay'], title: 'Replay request', label: 'Replay', html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M20 20v-6a7 7 0 00-7-7H7"/></svg>`, onClick: () => chrome.runtime.sendMessage({ action: 'replayRequest', request: r }) });

  const editBtn = createActionButton({ classes: ['edit'], title: 'Edit request', label: 'Edit', html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>`, onClick: () => openEditBox(r, newListItem, actions) });

  const delBtn = createActionButton({ classes: ['delete'], title: 'Delete request', label: 'Delete', html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>`, onClick: async () => { await removeCapturedRequest(r.id); newListItem.remove(); } });

  actions.appendChild(replayBtn); actions.appendChild(editBtn); actions.appendChild(delBtn);
  newListItem.appendChild(meta);
  newListItem.appendChild(actions);

  if (prepend && fetchList.firstChild) fetchList.insertBefore(newListItem, fetchList.firstChild);
  else fetchList.appendChild(newListItem);
}

function prependCapturedRequestToUI(r) { createFetchItem(r, { prepend: true }); }
function appendCapturedRequestToUI(r) { createFetchItem(r, { prepend: false }); }

function openEditBox(r, container, actionsElement) {
  if (actionsElement) actionsElement.style.display = 'none';
  
  const editor = document.createElement('div');
  editor.className = 'edit-box';

  const headersLabel = createLabel('Headers (JSON array or object):');
  let headersValue;
  try { headersValue = JSON.stringify(r.headers, null, 2); } catch (e) { headersValue = ''; }
  const headersInput = createStyledTextarea(headersValue);
  
  const bodyLabel = createLabel('Body (string):');
  const bodyInput = createStyledTextarea(r.body || '');
  
  const btnContainer = document.createElement('div');
  btnContainer.className = 'edit-box-buttons';
  
  const saveBtn = createStyledSaveButton();
  saveBtn.addEventListener('click', async () => {
    let parsedHeaders = r.headers;
    try { parsedHeaders = JSON.parse(headersInput.value); } catch (e) { alert('Headers JSON invalid'); return; }
    const updated = { headers: parsedHeaders, body: bodyInput.value };
    await updateCapturedRequest(r.id, updated);
    editor.remove();
    if (actionsElement) actionsElement.style.display = 'flex';
    await loadCapturedRequests();
  });
  
  const cancelBtn = createStyledCancelButton();
  cancelBtn.addEventListener('click', () => {
    editor.remove();
    if (actionsElement) actionsElement.style.display = 'flex';
  });
  
  btnContainer.appendChild(saveBtn);
  btnContainer.appendChild(cancelBtn);
  editor.appendChild(headersLabel);
  editor.appendChild(headersInput);
  editor.appendChild(bodyLabel);
  editor.appendChild(bodyInput);
  editor.appendChild(btnContainer);
  container.appendChild(editor);
}

function openLocalStorageEditBox(key, value, container, actionsElement) {
  if (actionsElement) actionsElement.style.display = 'none';
  
  const editor = document.createElement('div');
  editor.className = 'edit-box';

  const keyLabel = createLabel('Key:');
  const keyInput = createStyledInput(key);
  
  const valueLabel = createLabel('Value:');
  const valueInput = createStyledTextarea(value, '120px');
  
  const btnContainer = document.createElement('div');
  btnContainer.className = 'edit-box-buttons';
  
  const saveBtn = createStyledSaveButton();
  saveBtn.addEventListener('click', () => {
    const newKey = keyInput.value.trim();
    const newValue = valueInput.value;
    if (!newKey) { alert('Key cannot be empty'); return; }
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
        editor.remove();
        if (actionsElement) actionsElement.style.display = 'flex';
        showSnackbar('Saved');
        chrome.scripting.executeScript({ target: { tabId: activeTab.id }, function: checkLocalStorage });
      });
    });
  });
  
  const cancelBtn = createStyledCancelButton();
  cancelBtn.addEventListener('click', () => {
    editor.remove();
    if (actionsElement) actionsElement.style.display = 'flex';
  });
  
  btnContainer.appendChild(saveBtn);
  btnContainer.appendChild(cancelBtn);
  editor.appendChild(keyLabel);
  editor.appendChild(keyInput);
  editor.appendChild(valueLabel);
  editor.appendChild(valueInput);
  editor.appendChild(btnContainer);
  container.appendChild(editor);
}

async function loadCapturedRequests() {
  emptyDiv(fetchList);
  const requests = await getCapturedRequests();
  requests.forEach(r => appendCapturedRequestToUI(r));
}

// Handle localStorage display
function handleLocalStorageMessage(message) {
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
  
  resultDiv.innerHTML = '';
  resultDiv.appendChild(keysList);
}

// Create a single localStorage list item
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
  keyLink.title = key;
  keyLink.style.textDecoration = 'none';
  
  const copiedBadge = document.createElement('div');
  copiedBadge.className = 'copied-badge';
  copiedBadge.textContent = 'Copied';
  
  keyLink.addEventListener('click', (e) => {
    e.preventDefault();
    copyValueToClipboard(value);
    copiedBadge.classList.add('show');
    const prevColor = keyLink.style.color;
    keyLink.style.color = '';
    setTimeout(() => {
      copiedBadge.classList.remove('show');
      keyLink.style.color = prevColor;
      showSnackbar('Copied');
    }, 1200);
  });
  
  const actions = document.createElement('div');
  actions.className = 'actions-inline';
  
  const copyBtn = createActionButton({
    classes: ['replay'],
    title: 'Copy value',
    label: 'Copy',
    html: '',
    onClick: () => {
      copyValueToClipboard(value);
      showSnackbar('Copied');
    }
  });
  
  const editBtn = createActionButton({
    classes: ['edit'],
    title: 'Edit item',
    label: 'Edit',
    html: '',
    onClick: () => openLocalStorageEditBox(key, value, listItem, actions)
  });
  
  const delBtn = createActionButton({
    classes: ['delete'],
    title: 'Delete item',
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
            showSnackbar('Deleted');
          });
        });
      }
    }
  });
  
  actions.appendChild(copyBtn);
  actions.appendChild(editBtn);
  actions.appendChild(delBtn);
  itemMain.appendChild(keyLink);
  topRow.appendChild(copiedBadge);
  topRow.appendChild(itemMain);
  topRow.appendChild(actions);
  listItem.appendChild(topRow);
  
  return listItem;
}

// Consolidated message handler
chrome.runtime.onMessage.addListener((message) => {
  if (!message || !message.action) return;
  
  if (message.action === 'localStorage') {
    handleLocalStorageMessage(message);
    return;
  }

  if (message.action === 'addFetchRequest') {
    const fetchName = message.requestName; const fetchCode = message.fetchCode;
    const newListItem = document.createElement('li'); const codeButton = document.createElement('a'); codeButton.textContent = fetchName; codeButton.addEventListener('click', () => { copyValueToClipboard(fetchCode); showSnackbar('Copied fetch code'); }); newListItem.appendChild(codeButton); fetchList.appendChild(newListItem);
    return;
  }

  if (message.action === 'newCapturedRequest') {
    if (visibleState.fetchListVisible && message.request) prependCapturedRequestToUI(message.request);
    return;
  }

  if (message.action === 'replayResult') {
    const res = message.result; 
    const replayDiv = document.getElementById('replayResult'); 
    if (!replayDiv) return;
    
    // Check if body exists and has content (not just whitespace)
    const hasBody = res.body && res.body.trim().length > 0;
    const bodyContent = hasBody ? escapeHtml(res.body).slice(0, 2000) : (res.error || 'No response body');
    
    // Build full details including response
    let detailsContent = '';
    if (res.requestInfo) {
      detailsContent = `<details class="replay-request-details" open>
        <summary>Request & Response Details</summary>
        <div class="replay-details-content">
          <div><strong>Method</strong>${escapeHtml(res.requestInfo.method)}</div>
          <div class="replay-url"><strong>URL</strong>${escapeHtml(res.requestInfo.url)}</div>
          ${res.requestInfo.body ? `<div><strong>Request Body</strong><pre class="replay-body-pre">${escapeHtml(String(res.requestInfo.body).slice(0, 500))}</pre></div>` : '<div><strong>Request Body</strong>None</div>'}
          ${res.requestInfo.headers ? `<div><strong>Headers</strong><pre class="replay-headers-pre">${escapeHtml(JSON.stringify(res.requestInfo.headers, null, 2).slice(0, 500))}</pre></div>` : ''}
          ${hasBody ? `<div><strong>Response Body</strong><pre class="replay-response-pre">${bodyContent}</pre></div>` : ''}
          ${res.error ? `<div><strong>Error</strong>${escapeHtml(res.error)}</div>` : ''}
        </div>
      </details>`;
    }
    
    replayDiv.textContent = ''; // Clear completely first
    replayDiv.innerHTML = `<div class="replay-result-container"><div class="replay-result-header"><strong>Replay result for ${res.requestId}</strong>: ${res.status} ${res.statusText}</div>${detailsContent}</div>`;
    showSnackbar(`Replay: ${res.status} ${res.statusText}`);
    return;
  }
});

chrome.action.setPopup({ popup: 'popup.html' });
chrome.runtime.sendMessage({ action: 'contentScriptReady' });
 