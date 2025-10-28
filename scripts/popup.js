import { emptyDiv, copyValueToClipboard, checkLocalStorage, updateTable, generateUsername, generatePassword, generateEmail } from './functions.js';
import { addLink, addCredential, getDataFromDB, addCapturedRequest, getCapturedRequests, removeCapturedRequest, updateCapturedRequest, dbReady } from './db.js';

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

// visible state for panels
const visibleState = {
  localStorageVisible: false,
  linksListVisible: false,
  credentialsVisible: false,
  fetchListVisible: false,
  generateCredentialsVisible: false,
};

// Helper: set button label without removing icon nodes
function setButtonLabel(button, text) {
  if (!button) return;
  const lbl = button.querySelector('.btn-label');
  if (lbl) lbl.textContent = text;
  else button.textContent = text;
}

// Panel mapping for toggles
const panelMap = new Map([
  [showLocalStorageButton, { key: 'localStorageVisible', element: resultDiv }],
  [showLinksButton, { key: 'linksListVisible', element: addLinksDiv }],
  [credentialsButton, { key: 'credentialsVisible', element: credentialsDiv }],
  [showFetchesButton, { key: 'fetchListVisible', element: fetchListDiv }],
  [generateCredentialsButton, { key: 'generateCredentialsVisible', element: generateCredentialsDiv }],
]);

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

  const editBtn = createActionButton({ classes: ['edit'], title: 'Edit request', label: 'Edit', html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>`, onClick: () => openEditBox(r, newListItem) });

  const delBtn = createActionButton({ classes: ['delete'], title: 'Delete request', label: 'Delete', html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>`, onClick: async () => { await removeCapturedRequest(r.id); newListItem.remove(); } });

  actions.appendChild(replayBtn); actions.appendChild(editBtn); actions.appendChild(delBtn);
  newListItem.appendChild(meta); newListItem.appendChild(actions);

  if (prepend && fetchList.firstChild) fetchList.insertBefore(newListItem, fetchList.firstChild);
  else fetchList.appendChild(newListItem);
}

function prependCapturedRequestToUI(r) { createFetchItem(r, { prepend: true }); }
function appendCapturedRequestToUI(r) { createFetchItem(r, { prepend: false }); }

function openEditBox(r, container) {
  const editor = document.createElement('div'); editor.style.marginTop = '6px';
  const headersLabel = document.createElement('div'); headersLabel.textContent = 'Headers (JSON array or object):';
  const headersInput = document.createElement('textarea'); headersInput.style.width = '100%'; headersInput.style.height = '80px';
  try { headersInput.value = JSON.stringify(r.headers, null, 2); } catch (e) { headersInput.value = ''; }
  const bodyLabel = document.createElement('div'); bodyLabel.textContent = 'Body (string):';
  const bodyInput = document.createElement('textarea'); bodyInput.style.width = '100%'; bodyInput.style.height = '80px'; bodyInput.value = r.body || '';
  const saveBtn = document.createElement('button'); saveBtn.textContent = 'Save';
  saveBtn.addEventListener('click', async () => {
    let parsedHeaders = r.headers;
    try { parsedHeaders = JSON.parse(headersInput.value); } catch (e) { alert('Headers JSON invalid'); return; }
    const updated = { headers: parsedHeaders, body: bodyInput.value };
    await updateCapturedRequest(r.id, updated);
    container.remove();
    await loadCapturedRequests();
  });
  const cancelBtn = document.createElement('button'); cancelBtn.textContent = 'Cancel'; cancelBtn.style.marginLeft = '8px'; cancelBtn.addEventListener('click', () => editor.remove());
  editor.appendChild(headersLabel); editor.appendChild(headersInput); editor.appendChild(bodyLabel); editor.appendChild(bodyInput); editor.appendChild(saveBtn); editor.appendChild(cancelBtn);
  container.appendChild(editor);
}

async function loadCapturedRequests() {
  emptyDiv(fetchList);
  const requests = await getCapturedRequests();
  requests.forEach(r => appendCapturedRequestToUI(r));
}

// Consolidated message handler
chrome.runtime.onMessage.addListener((message) => {
  if (!message || !message.action) return;
  if (message.action === 'localStorage') {
    if (message.isEmpty) { resultDiv.textContent = 'Local Storage is empty.'; return; }
    const localStorageData = message.localStorageData;
    if (!localStorageData) { resultDiv.textContent = 'Local Storage data is unavailable.'; return; }
    const keys = Object.keys(localStorageData || {});
    const keysList = document.createElement('ul');
    keys.forEach((key) => {
      const displayedKey = key.length > 45 ? key.slice(0, 45) + '...' : key;
      const listItem = document.createElement('li'); listItem.className = 'list-card';
      const itemMain = document.createElement('div'); itemMain.className = 'item-main';
      const keyLink = document.createElement('a'); keyLink.href = '#'; keyLink.textContent = displayedKey; keyLink.title = 'Click to copy value'; keyLink.style.textDecoration = 'none';
      const copiedBadge = document.createElement('div'); copiedBadge.className = 'copied-badge'; copiedBadge.textContent = 'Copied';
      keyLink.addEventListener('click', (e) => {
        e.preventDefault(); copyValueToClipboard(localStorageData[key]); copiedBadge.classList.add('show'); const prevColor = keyLink.style.color; keyLink.style.color = '';
        setTimeout(() => { copiedBadge.classList.remove('show'); keyLink.style.color = prevColor; showSnackbar('Copied'); }, 1200);
      });
      itemMain.appendChild(keyLink); listItem.appendChild(copiedBadge); listItem.appendChild(itemMain); keysList.appendChild(listItem);
    });
    resultDiv.innerHTML = ''; resultDiv.appendChild(keysList);
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
    const res = message.result; const replayDiv = document.getElementById('replayResult'); if (!replayDiv) return;
    replayDiv.innerHTML = `<div><strong>Replay result for ${res.requestId}</strong>: ${res.status} ${res.statusText}</div><pre style="max-height:200px;overflow:auto">${res.body ? escapeHtml(res.body).slice(0,2000) : (res.error || 'no body')}</pre>`;
    showSnackbar(`Replay: ${res.status} ${res.statusText}`);
    return;
  }
});

chrome.action.setPopup({ popup: 'popup.html' });
chrome.runtime.sendMessage({ action: 'contentScriptReady' });
 