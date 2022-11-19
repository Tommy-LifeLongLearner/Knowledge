const sqlite3 = require('sqlite3');
const fs = require('fs');
const { ipcRenderer } = require('electron');
let db = null;

// promisify the sqlite db open
function dbOpen(dbPath) {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, function(err) {
      if(err) {
        reject(err);
      }else {
        resolve();
      }
    });
  });
}

async function dbTableCreate(tableName, fields) {
  const keys = Object.keys(fields);
  const values = Object.values(fields);
  const query = `CREATE TABLE ${tableName} (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    ${keys.map((key, index) => {
      return `${key} ${values[index]}`
    }).join(",")}
  );`;
  console.log(query);

  try {
    const result = await dbRun(query);
    console.log(`Successfully created ${tableName} table`); 
    return result;
  }catch(err) {
    console.log(`Error creating ${tableName} table!`);
    return err;
  }
}

function isDatabaseExist(dataPath) {
  return fs.existsSync(`${dataPath}/data/all.db`);
}

async function prepareDB(cb) {
  const result = await ipcRenderer.invoke('get-app-infos');
  const dataPath = result.appDataPath + "//" + result.appName;

  try {
    fs.lstatSync(`${dataPath}/data`).isDirectory();
    console.log("The `data` folder exists");
  }catch(e) {
    fs.mkdirSync(`${dataPath}/data`);
    console.log("Creating the `data` folder");
  }finally {
    if(!isDatabaseExist(dataPath)) {
      try {
        await dbOpen(`${dataPath}/data/all.db`);
        console.log(`Successfully created the database file all.db`);
      }catch(err) {
        console.log(err);
      }

      try {
        const result = await dbTableCreate("Folders", {
          name: "TEXT"
        });
      }catch(err) {
        console.log(err);
      }

      try {
        const result = await dbTableCreate("Categories", {
          name: "TEXT",
          folderID: "INTEGER, FOREIGN KEY (folderID) REFERENCES Folders(id)"
        });
      }catch(err) {
        console.log(err);
      }

      try {
        const result = await dbTableCreate("Topics", {
          name: "TEXT",
          categoryID: "INTEGER, FOREIGN KEY (categoryID) REFERENCES Categories(id)"
        });
      }catch(err) {
        console.log(err);
      }

      try {
        const result = await dbTableCreate("Articles", {
          content: "TEXT",
          topicId: "INTEGER, FOREIGN KEY (topicId) REFERENCES Topics(id)"
        });
      }catch(err) {
        console.log(err);
      }

      try {
        const result = await dbTableCreate("Embeds", {
          content: "BLOB",
          articleID: "INTEGER, FOREIGN KEY (articleID) REFERENCES Articles(id)"
        });
      }catch(err) {
        console.log(err);
      }

    }else {
      db = new sqlite3.Database(`${dataPath}/data/all.db`);
      console.log(`The database file 'all.db' exists`);
    }
  }
}

// promisify sqlite .all and .run they're all we need
async function dbQuery(type, query) {
  return new Promise((resolve, reject) => {
    db[type](query, function(err, res) {
      if(err) {
        reject(err);
      }else {
        resolve(type === "run" ? this : res);
      }
      // type === "run" && db.finalize();
    });
  });
}

const dbAll = query => dbQuery("all", query);
const dbRun = query => dbQuery("run", query);

async function dbInsert(tableName, data) {
  const values = Object.values(data).map(val => {
    let error = "", value = val;
    switch(typeof val) {
      case "number": value = Number(val); break;
      case "string": value = `"${val}"`; break;
      case "object": value = val === null ? null : error = "An object can't be inserted as a value"; break;
      case "undefined": value = null; break;
      case "function": error = "A function can't be inserted as a value"; break;
      default: value = val;
    }
    if(error) {
      throw new Error(error);
    }
    return value;
  });
  const query = `INSERT INTO ${tableName}(${Object.keys(data)}) VALUES(${values});`
  try {
    const result = await dbRun(query);
    // console.log(`Successfully inserted into '${tableName}' table`, data);
    return result;
  }catch(err) {
    // console.log(`Error inserting into '${tableName}' table!`, data);
    return err;
  }
}

async function dbUpdate(tableName, rowID, data) {
  const keys = Object.keys(data);
  const values = Object.values(data).map((val, index) => {
    let error = "", value = val;
    switch(typeof val) {
      case "number": value = Number(val); break;
      case "string": value = `"${val}"`; break;
      case "object": value = val === null ? null : error = "An object can't be inserted as a value"; break;
      case "undefined": value = null; break;
      case "function": error = "A function can't be inserted as a value"; break;
      default: value = val;
    }
    if(error) {
      throw new Error(error);
    }
    return `${keys[index]} = ${value}`;
  });
  const query = `UPDATE ${tableName} SET ${values.join(",")} WHERE id = ${rowID};`
  try {
    const result = await dbRun(query);
    // console.log(`Successfully inserted into '${tableName}' table`, data);
    return result;
  }catch(err) {
    // console.log(`Error inserting into '${tableName}' table!`, data);
    return err;
  }
}

async function dbDelete(tableName, rowID) {
  const query = `DELETE FROM ${tableName} WHERE id = ${rowID};`
  try {
    const result = await dbRun(query);
    // console.log(`Successfully inserted into '${tableName}' table`, data);
    return result;
  }catch(err) {
    // console.log(`Error inserting into '${tableName}' table!`, data);
    return err;
  }
}

function createFolderElement(folder) {
  const newFolderElement = document.createElement("DIV");
  newFolderElement.dataset.id = folder.id;
  newFolderElement.className = "folder";
  newFolderElement.innerHTML = `
    <h2 class="folder-title">${folder.name}</h2>
  `;
  document.querySelector("#folders").appendChild(newFolderElement);
}

function createFolderElements(folders) {
  folders.forEach(folder => {
    createFolderElement(folder);
  });
}

document.querySelector("#folders .add-button").onclick = async function() {
  const folderName = document.querySelector("#folders [name=folder-name]").value;
  try {
    const result = await dbInsert("Folders", {
      name: folderName
    });
    createFolderElement({
      id: result.lastID,
      name: folderName
    });
    console.log(result);
  }catch(err) {
    console.log(err);
  }
};

window.onload = async function() {
  await prepareDB();
  // try {
  //   const result = await dbAll(`SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name;`);
  //   console.log(result);
  // }catch(err) {
  //   console.log(err);
  // }
  try {
    const result = await dbAll(`SELECT * FROM Folders ORDER BY name;`);
    createFolderElements(result);
    console.log(result);
  }catch(err) {
    console.log(err);
  }
}