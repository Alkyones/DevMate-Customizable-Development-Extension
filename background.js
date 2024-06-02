let contentScriptReady = false;
const manipators = [
  "https://www.youtube.com"
]


chrome.runtime.onMessage.addListener((request) => {
  console.log(request, "request");
  if (request.action === "contentScriptReady") {
    contentScriptReady = true;
  }
});

chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    if (details.type === "xmlhttprequest" && !details.initiator.includes(manipators)) {
      const method = details.method.toUpperCase();
      const url = details.url;
      const headers = {};

      const lastIndex = url.lastIndexOf('/');
      const displayedKey = lastIndex > 0
       ? `${url.slice(0, 20)}...${url.slice(lastIndex)}`
        : url.slice(0, 20) + "...";

      for (const header of details.requestHeaders) {
        headers[header.name] = header.value;
      }

      const fetchCode = `fetch("${url}", {
        method: "${method}",
        headers: {
          ${Object.entries(headers)
           .map(([key, value]) => `${key}: "${value}"`)
           .join(", ")}
        },
      });`;

      if (contentScriptReady) {
        chrome.runtime.sendMessage({ action: "addFetchRequest", fetchCode, requestName: `${method} ${displayedKey}` });
      }
    }
  },
  { urls: ["<all_urls>"] },
  ["requestHeaders"]
);