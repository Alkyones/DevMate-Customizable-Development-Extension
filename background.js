let contentScriptReady = false;
const manipulators = [
  "https://www.youtube.com"
]

const pendingRequests = new Map();


chrome.runtime.onMessage.addListener((request) => {
  console.log(request, "request");
  if (request.action === "contentScriptReady") {
    contentScriptReady = true;
  }
});

async function isCaptureEnabled() {
  return new Promise((resolve) => {
    chrome.storage.local.get({ captureEnabled: false }, (items) => {
      resolve(Boolean(items.captureEnabled));
    });
  });
}

function saveCapturedRequest(record) {
  chrome.storage.local.get({ capturedRequests: [] }, (items) => {
    const arr = items.capturedRequests || [];
    arr.unshift(record); // newest first
    // keep a reasonable cap
    const capped = arr.slice(0, 200);
    chrome.storage.local.set({ capturedRequests: capped });
  });
}

// Handle control messages: toggle capture, replay
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.action) return;

  if (msg.action === 'toggleCapture') {
    chrome.storage.local.set({ captureEnabled: !!msg.enabled }, () => {
      sendResponse({ ok: true, enabled: !!msg.enabled });
    });
    // return true to indicate we'll call sendResponse asynchronously
    return true;
  }

  if (msg.action === 'replayRequest') {
    const request = msg.request;
    // perform replay and send a result message back
    (async () => {
      const result = { requestId: request.id, status: null, statusText: null, headers: [], body: null, error: null, timestamp: Date.now() };
      try {
        const headersInit = {};
        if (Array.isArray(request.headers)) {
          request.headers.forEach(h => {
            if (h && h.name) headersInit[h.name] = h.value;
          });
        } else if (request.headers && typeof request.headers === 'object') {
          Object.assign(headersInit, request.headers);
        }

        const fetchOpts = {
          method: request.method || 'GET',
          headers: headersInit,
          credentials: 'include'
        };

        let bodyForDebug = null;
        if (request.body) {
          // Handle different body types
          if (typeof request.body === 'object' && request.body !== null) {
            // If body is formData object with key-value pairs
            if (Object.keys(request.body).length > 0 && !Array.isArray(request.body)) {
              const formData = new FormData();
              for (const [key, value] of Object.entries(request.body)) {
                if (Array.isArray(value)) {
                  value.forEach(v => formData.append(key, v));
                } else {
                  formData.append(key, value);
                }
              }
              fetchOpts.body = formData;
              bodyForDebug = `FormData: ${JSON.stringify(request.body)}`;
            } else {
              // Try to stringify as JSON
              fetchOpts.body = JSON.stringify(request.body);
              bodyForDebug = fetchOpts.body;
              if (!headersInit['Content-Type'] && !headersInit['content-type']) {
                fetchOpts.headers['Content-Type'] = 'application/json';
              }
            }
          } else {
            // Body is already a string
            fetchOpts.body = request.body;
            bodyForDebug = request.body;
          }
        }

        // Store request info for debugging
        result.requestInfo = {
          method: fetchOpts.method,
          url: request.url,
          headers: headersInit,
          body: bodyForDebug
        };

        const resp = await fetch(request.url, fetchOpts);
        result.status = resp.status;
        result.statusText = resp.statusText;

        try {
          // gather headers
          for (const pair of resp.headers.entries()) {
            result.headers.push({ name: pair[0], value: pair[1] });
          }
        } catch (e) {
          // ignore header reading errors
        }

        // Try to get the body as text. This may fail or produce an opaque body due to CORS.
        try {
          const text = await resp.text();
          result.body = text;
        } catch (err) {
          result.body = null;
          result.error = 'Could not read response body (CORS or opaque response)';
        }
      } catch (err) {
        result.error = err && err.message ? err.message : String(err);
      }

      // send result back to any listeners (popup)
      chrome.runtime.sendMessage({ action: 'replayResult', result });
      sendResponse({ ok: true });
    })();
    return true; // indicates async sendResponse
  }
});


chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    // If capture is enabled, persist the request. Also still notify popup when open.
    (async () => {
      const capture = await isCaptureEnabled();

      // Merge any earlier information (body) captured in onBeforeRequest
      const existing = pendingRequests.get(details.requestId) || {};
      const merged = Object.assign({}, existing, {
        id: existing.id || `${details.requestId}-${Date.now()}-${Math.floor(Math.random()*10000)}`,
        url: details.url,
        method: details.method,
        requestId: details.requestId,
        headers: details.requestHeaders || [],
        type: details.type,
        timestamp: existing.timestamp || Date.now()
      });

      // Clean up pending map
      pendingRequests.delete(details.requestId);

      if (capture) {
        saveCapturedRequest(merged);
        // notify any open popup listeners about the new captured request
        chrome.runtime.sendMessage({ action: 'newCapturedRequest', request: merged });
      } else {
        // still notify popup live when contentScriptReady was used previously
        if (contentScriptReady) {
          chrome.runtime.sendMessage({
            action: "addFetchRequest",
            requestName: details.url,
            fetchCode: `fetch('${details.url}', { method: '${details.method}', headers: ${JSON.stringify(details.requestHeaders)} })`,
            requestDetails: merged
          });
        }
      }
    })();
  },
  { urls: ["<all_urls>"] },
  ["requestHeaders"]
);


// Listen earlier in the pipeline to capture request bodies when available.
// requestBody is available for POST/PUT/etc when the extension has webRequest permission
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    try {
      const entry = {
        requestId: details.requestId,
        url: details.url,
        method: details.method,
        timestamp: Date.now()
      };

      // details.requestBody may have formData or raw bytes
      if (details.requestBody) {
        if (details.requestBody.formData) {
          entry.body = details.requestBody.formData; // object of arrays
        } else if (details.requestBody.raw && details.requestBody.raw.length) {
          // raw is an array of ArrayBuffer-like objects
          try {
            const combined = details.requestBody.raw.map(r => {
              // r.bytes may be a Uint8Array-like
              if (r.bytes) {
                return new TextDecoder().decode(r.bytes);
              }
              return '';
            }).join('');
            entry.body = combined;
          } catch (e) {
            // best-effort; if decoding fails, store a placeholder
            entry.body = null;
          }
        }
      }

      // Store in pending map to merge later with headers from onBeforeSendHeaders
      pendingRequests.set(details.requestId, entry);
    } catch (err) {
      // ignore parse errors — don't let capturing break requests
      console.warn('onBeforeRequest parsing failed', err);
    }
  },
  { urls: ["<all_urls>"] },
  ["requestBody"]
);