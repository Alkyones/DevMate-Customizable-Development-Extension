/*
 * scripts/db.js
 * Simple IndexedDB wrapper for DevToolsDB plus helpers to share captured requests
 * between the background service worker and the popup via chrome.storage.local.
 */

let db;
let dbReadyResolve;
const dbReady = new Promise((resolve) => { dbReadyResolve = resolve; });

// Open (or create) the database
const request = indexedDB.open("DevToolsDB", 3);

request.onerror = (event) => {
  console.warn("Database open failed. Some features may not work.");
  if (dbReadyResolve) dbReadyResolve(false);
};

request.onsuccess = (event) => {
  db = event.target.result;
  console.log("Database opened successfully");
  if (dbReadyResolve) dbReadyResolve(true);
};

request.onupgradeneeded = (event) => {
  db = event.target.result;
  console.log("Object Store creation");
  // Create object stores if missing
  if (!db.objectStoreNames.contains("usefulLinks")) {
    db.createObjectStore("usefulLinks", { keyPath: 'key' });
  }
  if (!db.objectStoreNames.contains("credentials")) {
    db.createObjectStore("credentials", { keyPath: 'key' });
  }
};

// --- Helpers ---------------------------------------------------------------
/**
 * Convert an IDBRequest into a Promise that resolves with req.result
 * @param {IDBRequest} req
 * @returns {Promise<any>}
 */
function promisifyRequest(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// --- IndexedDB operations -------------------------------------------------
/**
 * Add or update a useful link entry
 * @param {string} key
 * @param {string} value
 * @returns {Promise<boolean>}
 */
export async function addLink(key, value) {
  if (!db) return false;
  try {
    const tx = db.transaction("usefulLinks", "readwrite");
    const store = tx.objectStore("usefulLinks");
    const req = store.put({ key: key, value: value });
    await promisifyRequest(req);
    return true;
  } catch (e) {
    console.error('addLink error', e);
    return false;
  }
}

/**
 * Add or update a credential entry
 * @param {string} website
 * @param {string} key
 * @param {string} value
 * @returns {Promise<boolean>}
 */
export async function addCredential(website, key, value) {
  if (!db) return false;
  try {
    const tx = db.transaction("credentials", "readwrite");
    const store = tx.objectStore("credentials");
    const req = store.put({ website, key, value });
    await promisifyRequest(req);
    return true;
  } catch (e) {
    console.error('addCredential error', e);
    return false;
  }
}

/**
 * Read all records from an object store
 * @param {string} collection
 * @returns {Promise<array|null>}
 */
export async function getDataFromDB(collection) {
  if (!db) return null;
  try {
    const tx = db.transaction(collection, 'readonly');
    const store = tx.objectStore(collection);
    const req = store.getAll();
    const res = await promisifyRequest(req);
    return res;
  } catch (e) {
    console.error('getDataFromDB error', e);
    return null;
  }
}

/**
 * Remove an entry by key from the specified object store
 * @param {string} storeName
 * @param {string} key
 * @returns {Promise<boolean>}
 */
export async function removeLink(storeName, key) {
  if (!db) return false;
  try {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.delete(key);
    await promisifyRequest(req);
    return true;
  } catch (e) {
    console.error('removeLink error', e);
    return false;
  }
}

// --- Captured requests helpers (chrome.storage.local) --------------------
// These helpers are used by the popup and the background/service worker to
// exchange captured network requests.

/**
 * Add a captured request to chrome.storage.local (keeps newest first)
 * @param {object} requestObj
 * @returns {Promise<boolean>}
 */
export async function addCapturedRequest(requestObj) {
  return new Promise((resolve) => {
    chrome.storage.local.get({ capturedRequests: [] }, (items) => {
      const arr = items.capturedRequests || [];
      arr.unshift(requestObj);
      const capped = arr.slice(0, 200);
      chrome.storage.local.set({ capturedRequests: capped }, () => resolve(true));
    });
  });
}

/**
 * Return the list of captured requests
 * @returns {Promise<Array>}
 */
export async function getCapturedRequests() {
  return new Promise((resolve) => {
    chrome.storage.local.get({ capturedRequests: [] }, (items) => {
      resolve(items.capturedRequests || []);
    });
  });
}

/**
 * Remove a captured request by id
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function removeCapturedRequest(id) {
  return new Promise((resolve) => {
    chrome.storage.local.get({ capturedRequests: [] }, (items) => {
      const arr = (items.capturedRequests || []).filter(r => r.id !== id);
      chrome.storage.local.set({ capturedRequests: arr }, () => resolve(true));
    });
  });
}

/**
 * Update an existing captured request by id
 * @param {string} id
 * @param {object} newObj
 * @returns {Promise<boolean>}
 */
export async function updateCapturedRequest(id, newObj) {
  return new Promise((resolve) => {
    chrome.storage.local.get({ capturedRequests: [] }, (items) => {
      const arr = items.capturedRequests || [];
      const idx = arr.findIndex(r => r.id === id);
      if (idx !== -1) arr[idx] = Object.assign({}, arr[idx], newObj);
      chrome.storage.local.set({ capturedRequests: arr }, () => resolve(true));
    });
  });
}

export { dbReady };