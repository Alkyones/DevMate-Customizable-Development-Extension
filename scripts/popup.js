import { emptyDiv, copyValueToClipboard, checkLocalStorage, updateTable } from './functions.js';
import { addLink, addCredential, getDataFromDB } from './db.js';



const resultDiv = document.getElementById("result");
const credentialsDiv = document.getElementById("credentials");
const addLinksDiv = document.getElementById("links");
const showLocalStorageButton = document.getElementById("checkButton");
const credentialsButton = document.getElementById("credentialsButton");
const saveLinkButton = document.getElementById("saveLinkButton");
const showLinksButton = document.getElementById("showLinksButton");
const saveCredentialButton = document.getElementById("saveCredentialButton");
const usefulLinkKeyInput = document.getElementById("linkKeyInput");
const usefulLinkValueInput = document.getElementById("linkValueInput");
const credentialsWebsiteInput = document.getElementById("credentialsWebsiteInput");
const credentialsKeyInput = document.getElementById("credentialsKeyInput");
const credentialsValueInput = document.getElementById("credentialsValueInput");
const credentialsList = document.getElementById("credentialsList");
const fetchListDiv = document.getElementById("fetch-requests");
const fetchList = document.getElementById("fetchRequestList");
const showFetchesButton = document.getElementById("fetchesButton");

const visibleState = {
  localStorageVisible: false,
  linksListVisible: false,
  credentialsVisible: false,
  fetchListVisible: false
}

const toggleDisplay = async (changeStateButton, visibleState) => {
  let { localStorageVisible, linksListVisible, credentialsVisible, fetchListVisible } = visibleState;
  emptyDiv(resultDiv);
  emptyDiv(credentialsList);
  emptyDiv(fetchList)
  switch (changeStateButton) {
    case showLocalStorageButton: {
      localStorageVisible = !localStorageVisible;

      visibleState.localStorageVisible = localStorageVisible;
      visibleState.linksListVisible = false;
      visibleState.credentialsVisible = false;
      visibleState.fetchListVisible = false;

      break;
    }
    case showLinksButton: {
      linksListVisible = !linksListVisible;

      visibleState.linksListVisible = linksListVisible;
      visibleState.credentialsVisible = false;
      visibleState.localStorageVisible = false;
      visibleState.fetchListVisible = false;

      break;
    }
    case credentialsButton: {
      credentialsVisible = !credentialsVisible;

      visibleState.credentialsVisible = credentialsVisible;
      visibleState.linksListVisible = false;
      visibleState.localStorageVisible = false;
      visibleState.fetchListVisible = false;

      break;
    }

    case showFetchesButton: {
      fetchListVisible = !fetchListVisible

      visibleState.fetchListVisible = fetchListVisible
      visibleState.linksListVisible = false
      visibleState.credentialsVisible = false
      visibleState.localStorageVisible = false
      break

    }

  }
  showLocalStorageButton.textContent = visibleState.localStorageVisible == true ? "Hide Local Storage" : "Show Local Storage";
  showLinksButton.textContent = visibleState.linksListVisible == true ? "Hide Useful Links" : "Show Useful Links";
  credentialsButton.textContent = visibleState.credentialsVisible == true ? "Hide Credentials" : "Show Credentials"
  showFetchesButton.textContent = visibleState.fetchListVisible == true ? "Hide Fetch Requests" : "Show Fetch Requests"

  addLinksDiv.hidden = visibleState.linksListVisible == false ? true : false;
  credentialsDiv.hidden = visibleState.credentialsVisible == false ? true : false;
  fetchListDiv.hidden = visibleState.fetchListVisible == false ? true : false


  return visibleState;
};


saveCredentialButton.addEventListener("click", async function () {
  const website = credentialsWebsiteInput.value.trim();
  const key = credentialsKeyInput.value.trim();
  const value = credentialsValueInput.value;
  if (key.length > 2 && value.length > 2, website.length > 2) {
    await addCredential(website, key, value);

    credentialsWebsiteInput.value = "";
    credentialsKeyInput.value = "";
    credentialsValueInput.value = "";
  } else {
    alert("Please enter both a key and a value.");
  }

  const data = await getDataFromDB('credentials');
  await updateTable('credentials', data, resultDiv);
});

saveLinkButton.addEventListener("click", async function () {
  const key = usefulLinkKeyInput.value.trim();
  const value = usefulLinkValueInput.value;
  if (typeof key === 'string' && key.length > 2 && typeof value === 'string' && value.length > 2) {
    await addLink(key, value);

    usefulLinkKeyInput.value = "";
    usefulLinkValueInput.value = "";
  } else {
    alert("Please enter both a key and a value.");
  }

  const data = await getDataFromDB('usefulLinks');
  await updateTable('usefulLinks', data, resultDiv);

});

showLinksButton.addEventListener("click", async function () {
  await toggleDisplay(showLinksButton, visibleState);
  if (visibleState.linksListVisible) {
    const linksInDB = await getDataFromDB('usefulLinks');
    await updateTable('usefulLinks', linksInDB, resultDiv)
    return true;
  }
});

showLocalStorageButton.addEventListener("click", async function () {
  await toggleDisplay(showLocalStorageButton, visibleState);

  if (visibleState.localStorageVisible == true) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const activeTab = tabs[0];
      chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        function: checkLocalStorage,
      });
    });
  }
});

credentialsButton.addEventListener("click", async function () {
  await toggleDisplay(credentialsButton, visibleState);
  if (visibleState.credentialsVisible) {
    const credentialsData = await getDataFromDB('credentials');
    await updateTable('credentials', credentialsData, resultDiv);
    return true;

  }
});

showFetchesButton.addEventListener("click", async function () {
  await toggleDisplay(showFetchesButton, visibleState);
  if (visibleState.fetchListVisible) {
    return true;
  }
});

chrome.runtime.onMessage.addListener(function (message) {
  if (message.action === "localStorage") {

    if (message.isEmpty) {
      resultDiv.textContent = "Local Storage is empty.";
    } else {
      const localStorageData = message.localStorageData;
      if (localStorageData) {
        const keys = Object.keys(localStorageData);
        const keysList = document.createElement("ul");
        keys.forEach((key) => {
          const listItem = document.createElement("li");
          const keyLink = document.createElement("a");
          const displayedKey = key.length > 45 ? key.slice(0, 45) + "..." : key;
          keyLink.textContent = displayedKey;
          keyLink.href = "#";

          keyLink.addEventListener("click", function (event) {
            event.preventDefault();
            copyValueToClipboard(localStorageData[key]);
            keyLink.textContent = "Copied to Clipboard!";
            keyLink.style.color = "orange";
            setTimeout(() => {
              keyLink.textContent = displayedKey;
              keyLink.style.color = "";
            }, 1500);
          });

          listItem.appendChild(keyLink);
          keysList.appendChild(listItem);
        });
        resultDiv.innerHTML = "";
        resultDiv.appendChild(keysList);
      } else {
        resultDiv.textContent = "Local Storage data is unavailable.";
      }
    }
  }
});

chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "addFetchRequest") {
    const fetchName = request.requestName;
    const fetchCode = request.fetchCode;

    const fetchList = document.getElementById("fetchRequestList");
    const newListItem = document.createElement("li");
    const codeButton = document.createElement("a");

    codeButton.textContent = fetchName;
    codeButton.addEventListener("click", () => {
      copyValueToClipboard(fetchCode);
      codeButton.textContent = "Copied to Clipboard!";
      codeButton.style.color = "orange";
      setTimeout(() => {
        codeButton.textContent = fetchName;
        codeButton.style.color = "";
      }, 1500)
    });

    newListItem.appendChild(codeButton);
    fetchList.appendChild(newListItem);
  }
});

chrome.browserAction.setPopup({
  popup: "popup.html",
  focus: true
});

chrome.runtime.sendMessage({ action: "contentScriptReady" });