import { getDataFromDB, removeLink } from './db.js';

function checkLocalStorage() {
  const isEmpty = Object.keys(localStorage).length === 0;
  const localStorageData = isEmpty ? null : localStorage;
  chrome.runtime.sendMessage({ action: 'localStorage', isEmpty, localStorageData });
}

const emptyDiv = (div) => {
  div.innerHTML = "";
  return div;
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
    // Render a card-style list item with a main area and inline actions
    return `
      <li class="list-card">
        <div class="item-main">
          <a href="${link}" target="_blank" data-value="${item.value}">${item.key}</a>
          <div class="item-meta">${action === 'usefulLinks' ? (item.value || '') : (item.website || '')}</div>
        </div>
        <div class="actions-inline">
          <button class="remove-button" data-action="${action}" data-key="${item.key}" title="Remove"></button>
        </div>
      </li>`;
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
      await updateTable(action, linksInDB, resultDiv);
    });
  });
}

function generateUsername() {
  const adjectives = ["fast", "cool", "smart", "silent", "brave", "lucky", "happy", "wild"];
  const animals = ["lion", "tiger", "bear", "wolf", "fox", "eagle", "hawk", "owl"];
  const number = Math.floor(Math.random() * 1000);
  return (
    adjectives[Math.floor(Math.random() * adjectives.length)] +
    animals[Math.floor(Math.random() * animals.length)] +
    number
  );
}

function generatePassword() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

function generateEmail() {
  const providers = ["gmail.com", "yahoo.com", "outlook.com", "mail.com"];
  const username = generateUsername();
  return username + "@" + providers[Math.floor(Math.random() * providers.length)];
}

export { checkLocalStorage, emptyDiv, copyValueToClipboard, updateTable, generateUsername, generatePassword, generateEmail };