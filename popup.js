    const checkButton = document.getElementById("checkButton");
    const resultDiv = document.getElementById("result");
    const copiedDiv = document.getElementById("copied");

    const copiedKeys = new Set(); // Set to store copied keys
    let lastClickedKeyLink = null; // Store the last clicked key link

    checkButton.addEventListener("click", function () {
    const buttonText = checkButton.textContent;
    if (buttonText === "Hide Local Storage") {
        checkButton.textContent = "Show Local Storage";
        resultDiv.innerHTML = ""; // Clear the list of keys
    } else {
        checkButton.textContent = "Hide Local Storage";
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        const activeTab = tabs[0];
        chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            function: checkLocalStorage,
        });
        });
    }
    });

    function checkLocalStorage() {
    const isEmpty = Object.keys(localStorage).length === 0;
    const localStorageData = isEmpty ? null : localStorage;
    chrome.runtime.sendMessage({ isEmpty, localStorageData });
    }

    function deleteLocalStorageKey(key) {
        // Remove the key from localStorage
        localStorage.removeItem(key);
      
        // Update the UI to remove the deleted key
        const keysList = document.querySelector("#result ul");
        if (keysList) {
          const keyItem = keysList.querySelector(`a[href="#"][data-key="${key}"]`);
          if (keyItem) {
            keysList.removeChild(keyItem.parentElement);
          }
        }
      }

    function copyValueToClipboard(key, value, keyLink) {
    const tempInput = document.createElement("input");
    document.body.appendChild(tempInput);
    tempInput.value = value;
    tempInput.select();
    document.execCommand("copy");
    document.body.removeChild(tempInput);

    // Enable the previously clicked key link if exists
    if (lastClickedKeyLink) {
        lastClickedKeyLink.classList.remove("disabled");
        lastClickedKeyLink.style.pointerEvents = "";
    }

    // Mark the key as copied
    copiedKeys.add(key);

    // Update the UI to show "Copied" next to the key
    keyLink.classList.add("disabled");
    keyLink.style.pointerEvents = "none"; // Disable pointer events

    // Show "Copied" notification with CSS animation
    copiedDiv.textContent = "Copied!";
    copiedDiv.classList.add("show-copied");
    setTimeout(() => {
        copiedDiv.classList.remove("show-copied");
    }, 1500);

    // Store the last clicked key link
    lastClickedKeyLink = keyLink;
    }



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
      
              const deleteButton = document.createElement("button");
              deleteButton.className = "delete-button";
              deleteButton.innerHTML = "Delete"; // Button text
      
              // Prevent the default behavior of the anchor element
              keyLink.addEventListener("click", function (event) {
                event.preventDefault();
              });
      
              // Handle the click event for the delete button
              deleteButton.addEventListener("click", function (event) {
                event.preventDefault();
                deleteLocalStorageKey(key);
              });
      
              keyLink.appendChild(deleteButton);
      
              // Disable the key if it's in the copiedKeys set
              if (copiedKeys.has(key)) {
                keyLink.classList.add("disabled");
              } else {
                keyLink.addEventListener("click", function (event) {
                  event.preventDefault(); // Prevent the link from navigating
                  copyValueToClipboard(key, localStorageData[key], keyLink);
                });
              }
      
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