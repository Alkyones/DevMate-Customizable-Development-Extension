document.addEventListener("DOMContentLoaded", function () {
    const readLocalStorageButton = document.getElementById("readLocalStorageButton");

    readLocalStorageButton.addEventListener("click", function () {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            const activeTab = tabs[0];
            chrome.scripting.executeScript(
                {
                    target: { tabId: activeTab.id },
                    function: readLocalStorage,
                },
                function (result) {
                    const localStorageData = result[0].result;
                    console.log("Local Storage Data:", localStorageData);
                    alert("Local Storage Data:\n" + JSON.stringify(localStorageData, null, 2));
                }
            );
        });
    });
});

function readLocalStorage() {
    const localStorageData = { ...localStorage };
    return localStorageData;
}
