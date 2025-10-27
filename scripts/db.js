let db;
let dbReadyResolve;
const dbReady = new Promise((resolve) => { dbReadyResolve = resolve; });

const request = window.indexedDB.open("DevToolsDB", 3);

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
  // Create an objectStore for this database
  if (!db.objectStoreNames.contains("usefulLinks")) {
    db.createObjectStore("usefulLinks", { keyPath: 'key' });
  }
  if (!db.objectStoreNames.contains("credentials")) {
    db.createObjectStore("credentials", { keyPath: 'key' });
  }
};

function promisifyRequest(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function addLink(key, value) {
  if (!db) return false;
  try {
    const tx = db.transaction("usefulLinks", "readwrite");
    const store = tx.objectStore("usefulLinks");
    console.log('Adding link', key, value);
    const req = store.put({ key: key, value: value });
    await promisifyRequest(req);
    return true;
  } catch (e) {
    console.error('addLink error', e);
    return false;
  }
}

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

export async function removeLink(action, key) {
  if (!db) return false;
  try {
    const tx = db.transaction(action, 'readwrite');
    const store = tx.objectStore(action);
    const req = store.delete(key);
    await promisifyRequest(req);
    return true;
  } catch (e) {
    console.error('removeLink error', e);
    return false;
  }
}

// Captured requests helpers using chrome.storage.local for popup/service worker communication
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

export async function getCapturedRequests() {
  return new Promise((resolve) => {
    chrome.storage.local.get({ capturedRequests: [] }, (items) => {
      resolve(items.capturedRequests || []);
    });
  });
}

export async function removeCapturedRequest(id) {
  return new Promise((resolve) => {
    chrome.storage.local.get({ capturedRequests: [] }, (items) => {
      const arr = (items.capturedRequests || []).filter(r => r.id !== id);
      chrome.storage.local.set({ capturedRequests: arr }, () => resolve(true));
    });
  });
}

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