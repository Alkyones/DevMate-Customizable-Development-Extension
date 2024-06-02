import {getDataFromDB, removeLink } from './db.js';

const checkLocalStorage = () => {
    const isEmpty = Object.keys(localStorage).length === 0;
    const localStorageData = isEmpty ? null : localStorage;
    chrome.runtime.sendMessage({ action: 'localStorage', isEmpty, localStorageData });
  }

const emptyDiv = (div) => {
    div.innerHTML = "";
    return div
  }

const copyValueToClipboard = (value) => {
    const tempInput = document.createElement("input");
    document.body.appendChild(tempInput);
    tempInput.value = value;
    tempInput.select();
    document.execCommand("copy");
    document.body.removeChild(tempInput);
  }

const createListItems = (data, action) => {
    return data.map((item) => {
      let link = '';
      if (action === 'usefulLinks') {
        link = item.value.startsWith("http") ? item.value : `https://${item.value}`;
      } else {
        link = item.website.startsWith("http") ? item.website : `https://${item.website}`;
      }
      return `<li><a href="${link}" target="_blank">${item.key}</a> <button class="remove-button" data-action="${action}" data-key="${item.key}"></button></li>`;
    });
  }

const updateTable = async (action, data, resultDiv) => {
    emptyDiv(resultDiv);
    if (!data) {
      resultDiv.innerText = "No available data please try again later.";
      return;
    }
  
    const listItems = createListItems(data, action);
    resultDiv.innerHTML = listItems.join("");
  
    const removeButtons = resultDiv.querySelectorAll('.remove-button');
    removeButtons.forEach((button) => {
      button.addEventListener('click', async () => {
        removeLink(button.getAttribute('data-action'), button.getAttribute('data-key'));
        const linksInDB = await getDataFromDB(action);
        await updateTable(action, linksInDB, resultDiv)
      });
    });
  }

export { checkLocalStorage, emptyDiv, copyValueToClipboard, updateTable};