let contentScriptReady = false;
const manipators = [
  "https://www.youtube.com"
]


chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "contentScriptReady") {
    contentScriptReady = true;
  }
});


chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    if (!contentScriptReady) return;
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        requestDetails = {
          url: details.url,
          method: details.method,
          requestId: details.requestId,
          requestHeaders: details.requestHeaders,
          type: details.type
        }
        chrome.runtime.sendMessage({
          action: "addFetchRequest",
          requestName: details.url,
          fetchCode: `fetch('${details.url}', { method: '${details.method}', headers: ${JSON.stringify(details.requestHeaders)} })`,
          requestDetails
        });
    });
  },
  { urls: ["<all_urls>"] },
  ["requestHeaders"]
);