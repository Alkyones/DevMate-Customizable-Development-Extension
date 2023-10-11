const usefulLinks = [
  { text: "Google Console", url: "https://console.cloud.google.com/" },
  { text: "Click Up", url: "https://app.clickup.com/" },
  { text: "BitBucket", url: "https://bitbucket.org/frupro/workspace/projects/" },
  { text: "MongoDB", url: "https://www.mongodb.com" },
  { text: "Xero", url: "https://go.xero.com/" },
  { text: "Finmid", url: "https://platform.finmid.com/" },
];

let localStorageVisible = false; // Track whether the Local Storage list is visible
let linksListVisible = false; // Track whether the Useful Links list is visible
let credentialsVisible = false

const checkButton = document.getElementById("checkButton");
const showLinksButton = document.getElementById("showLinksButton");
const addCredentialsButton = document.getElementById("credentialsButton");


const resultDiv = document.getElementById("result");
const credentialsDiv = document.getElementById("credentials");

const keyInput = document.getElementById("keyInput");
const valueInput = document.getElementById("valueInput");
const saveCookieButton = document.getElementById("saveCookieButton");
const savedCookiesList = document.getElementById("savedCookies");



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

showLinksButton.addEventListener("click", function () {
  // Close the Local Storage list if it's open
  if (localStorageVisible) {
    checkButton.textContent = "Show Local Storage";
    resultDiv.innerHTML = "";
    localStorageVisible = false;
  }

  // Toggle the Useful Links list
  if (linksListVisible) {
    showLinksButton.textContent = "Show Useful Links";
    resultDiv.innerHTML = "";
    linksListVisible = false;
  } else {
    showLinksButton.textContent = "Hide Useful Links";
    resultDiv.innerHTML = "";

    const linksList = document.createElement("ul");

    usefulLinks.forEach((link) => {
      const listItem = document.createElement("li");
      const linkElement = document.createElement("a");
      linkElement.textContent = link.text;
      linkElement.href = link.url;
      linkElement.target = "_blank";
      listItem.appendChild(linkElement);
      linksList.appendChild(listItem);
    });

    resultDiv.appendChild(linksList);
    linksListVisible = true;
  }
});

checkButton.addEventListener("click", function () {
  // Close the Useful Links list if it's open
  if (linksListVisible) {
    showLinksButton.textContent = "Show Useful Links";
    resultDiv.innerHTML = "";
    linksListVisible = false;
  }

  // Toggle the Local Storage list
  if (localStorageVisible) {
    checkButton.textContent = "Show Local Storage";
    resultDiv.innerHTML = "";
    localStorageVisible = false;
  } else {
    checkButton.textContent = "Hide Local Storage";
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const activeTab = tabs[0];
      chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        function: checkLocalStorage,
      });
    });
    localStorageVisible = true;
  }
});

addCredentialsButton.addEventListener("click", function () {
  if(credentialsVisible){
    credentialsDiv.style.display = "none";
    addCredentialsButton.textContent = "Show credentials";
    credentialsVisible = !credentialsVisible
  } else {
    credentialsVisible = !credentialsVisible
    addCredentialsButton.textContent = "Hide Credentials";
    credentialsDiv.style.display = "block"
  }
})

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
