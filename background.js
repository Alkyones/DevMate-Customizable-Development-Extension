let contentScriptReady = false;
const manipulators = [
  "https://www.youtube.com"
]


chrome.runtime.onMessage.addListener((request) => {
  console.log(request, "request");
  if (request.action === "contentScriptReady") {
    contentScriptReady = true;
  }
});

// Capture enabled flag is stored in chrome.storage.local under 'captureEnabled'
// Persist captured requests under 'capturedRequests' as an array.
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

        if (request.body) {
          // if body looks like an object, leave as-is; otherwise string
          fetchOpts.body = request.body;
        }

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

      const requestDetails = {
        id: `${details.requestId}-${Date.now()}-${Math.floor(Math.random()*10000)}`,
        url: details.url,
        method: details.method,
        requestId: details.requestId,
        headers: details.requestHeaders || [],
        type: details.type,
        timestamp: Date.now()
      };

      if (capture) {
        saveCapturedRequest(requestDetails);
        // notify any open popup listeners about the new captured request
        chrome.runtime.sendMessage({ action: 'newCapturedRequest', request: requestDetails });
      } else {
        // still notify popup live when contentScriptReady was used previously
        if (contentScriptReady) {
          chrome.runtime.sendMessage({
            action: "addFetchRequest",
            requestName: details.url,
            fetchCode: `fetch('${details.url}', { method: '${details.method}', headers: ${JSON.stringify(details.requestHeaders)} })`,
            requestDetails
          });
        }
      }
    })();
  },
  { urls: ["<all_urls>"] },
  ["requestHeaders"]
);