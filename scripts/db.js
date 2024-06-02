let db;

const request = window.indexedDB.open("DevToolsDB", 3);

request.onerror = (event) => {
  alert("Database open failed. Be aware most of the functions will not work.");
};

request.onsuccess = (event) => {
  db = event.target.result;
  console.log("Database opened successfully");
};

request.onupgradeneeded = (event) => {
  db = event.target.result;
  console.log("Object Store creation");
  // Create an objectStore for this database
  const usefulLinksObject = db.createObjectStore("usefulLinks", { keyPath: 'key' });
  const credentialsObject = db.createObjectStore("credentials", { keyPath: 'key' });

  // Create indexes
  usefulLinksObject.createIndex("value", "value", { unique: false });
  credentialsObject.createIndex("value", "value", { unique: false });
};

async function addLink(key, value) {
  db.transaction("usefulLinks", "readwrite")
   .objectStore("usefulLinks")
   .add({ key: key, value: value });
}

async function addCredential(website, key, value) {
  db.transaction("credentials", "readwrite")
   .objectStore("credentials")
   .add({ website, key, value });
}

async function getDataFromDB(collection) {
  return new Promise((resolve, reject) => {
    const request = db.transaction(collection)
     .objectStore(collection)
     .getAll();

    request.onsuccess = () => {
      const data = request.result;
      resolve(data);
    }

    request.onerror = (err) => {
      console.error(`Error to get all data: ${err}`);
      resolve(null);
    }
  });
}

async function removeLink(action, key) {
  switch (action) {
    case 'usefulLinks':
      db.transaction("usefulLinks", "readwrite")
       .objectStore("usefulLinks")
       .delete(key)
       .onsuccess = async function (event) {
          console.log(`Link with key ${key} removed successfully`);
          return true;
        };
      break;
    case 'credentials':
      db.transaction("credentials", "readwrite")
       .objectStore("credentials")
       .delete(key)
       .onsuccess = async function (event) {
          console.log(`credential with key ${key} removed successfully`);
          return true;
        };
      break;
    default:
      return true;
  }
}

export { addLink, addCredential, getDataFromDB, removeLink };