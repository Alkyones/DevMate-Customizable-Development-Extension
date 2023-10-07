document.addEventListener("DOMContentLoaded", function () {
    const storageButton = document.getElementById("storageButton");
    const LocalStorageDiv = document.getElementById("LocalStorageDiv");

    function displayLocalStorageData() {
        const localStorageDataC = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const value = localStorage.getItem(key) || "Not declared";
            localStorageDataC[key] = value;
        }
        return localStorageDataC;
    }

    storageButton.addEventListener("click", function () {
        const tabs = chrome.tabs.query({ active: true, currentWindow: true });
        const activeTab = tabs[0];


        const localStorageData = chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            function: displayLocalStorageData
        })



    });
});
