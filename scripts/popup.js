//VARIABLES
const resultDiv = document.getElementById("result");
const credentialsDiv = document.getElementById("credentials");

const visibleState = {
  localStorageVisible: false,
  linksListVisible: false,
  credentialsVisible: false
}

const checkButton = document.getElementById("checkButton");
const addCredentialsButton = document.getElementById("credentialsButton");

const showLinksButton = document.getElementById("showLinksButton");
const addLinksDiv = document.getElementById("links");

const linkKeyInput = document.getElementById("linkKeyInput");
const linkValueInput = document.getElementById("linkValueInput");
const saveLinkButton = document.getElementById("saveLinkButton");
const usefulLinks = [
];


const keyInput = document.getElementById("keyInput");
const valueInput = document.getElementById("valueInput");
const saveCookieButton = document.getElementById("saveCookieButton");
const savedCookiesList = document.getElementById("savedCookies");


//Toggle functions

const emptyResultDiv = (div) => {
  div.innerHTML = "";
  return div
}

const toggleDisplay = async (changeStateButton, visibleState) => {
  let { localStorageVisible, linksListVisible, credentialsVisible } = visibleState;
  
  emptyResultDiv(resultDiv);
  emptyResultDiv(credentialsDiv);

  switch (changeStateButton) {
      case checkButton: {
          localStorageVisible = !localStorageVisible;

          visibleState.localStorageVisible = localStorageVisible;
          visibleState.linksListVisible = false;
          visibleState.credentialsVisible = false;
          break;
      }
      case showLinksButton: {
          linksListVisible = !linksListVisible;

          visibleState.linksListVisible = linksListVisible;
          visibleState.credentialsVisible = false;
          visibleState.localStorageVisible = false;
          break;
      }
      case addCredentialsButton: {
          credentialsVisible = !credentialsVisible;

          visibleState.credentialsVisible = credentialsVisible;
          visibleState.linksListVisible = false;
          visibleState.localStorageVisible = false;
          break;
      }
  }
  checkButton.textContent = visibleState.localStorageVisible == true ? "Hide Local Storage" : "Show Local Storage";
  showLinksButton.textContent = visibleState.linksListVisible == true ? "Hide Useful Links" : "Show Useful Links";
  addLinksDiv.hidden = visibleState.linksListVisible == false ? true : false;
  addCredentialsButton.textContent = visibleState.credentialsVisible == true ? "Hide Credentials" : "Show Credentials"


  return visibleState;
};

//

//DB functions
let db;
const request = window.indexedDB.open("DevToolsDB", 3);
request.onerror = (event) => {
  console.error("Why didn't you allow my web app to use IndexedDB?!");
};
request.onsuccess = (event) => {
  db = event.target.result;
  console.log("Database opened successfully");

};

request.onupgradeneeded = (event) => {
  db = event.target.result;
  console.log("Object Store creation");
  // Create an objectStore for this database
  const usefulLinksObject = db.createObjectStore("usefulLinks", { keyPath: "key" });
  const credentialsObject = db.createObjectStore("credentials", { keyPath: "key" });

  // Create indexes
  usefulLinksObject.createIndex("value", "value", { unique: false });
  credentialsObject.createIndex("key", "key", { unique: false });



  usefulLinksObject.transaction.oncomplete = (event) => {
    const usefulLinksObjectStore = db
    .transaction("usefulLinks", "readwrite")
    .objectStore("usefulLinks");

    usefulLinks.forEach((usefulLink) => {
      console.log(usefulLink);
      usefulLinksObjectStore.add({ key: usefulLink.key, value: usefulLink.value});
    });
  };
};


saveCookieButton.addEventListener("click", function () {
  const key = keyInput.value.trim();
  const value = valueInput.value;

  if (!key || !value) {
    alert("Please enter both a key and a value.");
    return;
  }

  // Set the cookie with an expiration date 365 days in the future (adjust as needed)
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + 365); // 365 days from now
  const expires = `expires=${expirationDate.toUTCString()}`;
  document.cookie = `${key}=${value}; ${expires}; path=/`;

  // Display the saved cookie in the list
  const listItem = document.createElement("li");
  listItem.textContent = `${key}: ${value}`;
  savedCookiesList.appendChild(listItem);

  // Clear the input fields
  keyInput.value = "";
  valueInput.value = "";
});

saveLinkButton.addEventListener("click", function () {
  const key = linkKeyInput.value.trim();
  const value = linkValueInput.value;
  if(key.length > 2 && value.length > 2){
    db.transaction("usefulLinks", "readwrite")
      .objectStore("usefulLinks")
      .add({ key, value } );

  }
});








function checkLocalStorage() {
  const isEmpty = Object.keys(localStorage).length === 0;
  const localStorageData = isEmpty ? null : localStorage;
  chrome.runtime.sendMessage({ isEmpty, localStorageData });
}

function copyValueToClipboard(value) {
  const tempInput = document.createElement("input");
  document.body.appendChild(tempInput);
  tempInput.value = value;
  tempInput.select();
  document.execCommand("copy");
  document.body.removeChild(tempInput);
}

//MAIN MENU
showLinksButton.addEventListener("click", async function () {
    await toggleDisplay(showLinksButton, visibleState);
    if(visibleState.linksListVisible == true) {
      const linksList = document.createElement("ul");
      const linksInDB = await window.indexedDB.databases('DevToolsDB')
    
      console.log(linksInDB);
      usefulLinks.forEach((link) => {
        const listItem = document.createElement("li");
        const linkElement = document.createElement("a");
        linkElement.textContent = link.text;
        linkElement.href = link.value;
        linkElement.target = "_blank";
        listItem.appendChild(linkElement);
        linksList.appendChild(listItem);
      });
  
      resultDiv.appendChild(linksList);
      return true;
    }
});

checkButton.addEventListener("click", async function () {
  await toggleDisplay(checkButton, visibleState);
 
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

addCredentialsButton.addEventListener("click",async function () {
  await toggleDisplay(addCredentialsButton, visibleState);  
});
//



//EXECUTION
chrome.runtime.onMessage.addListener(function (message) {
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
});
