const sqlite3 = require('sqlite3');
const fs = require('fs');
const { ipcRenderer } = require('electron');
let db = null;

const currentState = {
  folderID: null
};

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

function createTopicElement(topic, categoryElement) {
  const newTopicElement = document.createElement("LI");
  newTopicElement.dataset.id = topic.id;
  newTopicElement.className = "topic-title";
  newTopicElement.textContent = topic.name;
  categoryElement.querySelector(".topics").appendChild(newTopicElement);
}

function createTopicElements(topics) {
  const topicsHTML = topics.map(topic => {
    const newTopicElement = document.createElement("LI");
    newTopicElement.dataset.id = topic.id;
    newTopicElement.className = "topic-title";
    newTopicElement.textContent = topic.name;
  });

  return topicsHTML.join("");
}

async function createCategoryElement(category, topics) {
  const newCategoryElement = document.createElement("SECTION");
  newCategoryElement.dataset.id = category.id;
  newCategoryElement.className = "category";
  newCategoryElement.innerHTML = `
    <h2 class="category-title"><span>${category.name}</span><button class="fa fa-plus-circle"></button><button class="fa fa-trash-o"></button></h2>
    <ul class="topics">
      ${topics ? createTopicElements(topics) : ""}
    </ul>
  `;
  document.querySelector("#topics").appendChild(newCategoryElement);
}

function createCategoryElements(categories) {
  categories.forEach(async category => {
    try {
      const result = await dbAll(`SELECT * FROM Topics WHERE categoryID = ${category.id};`);
      console.log(result);
      createCategoryElement(category, result);
    }catch(err) {
      console.log(err);
    }
  });
}

document.querySelector("#folders .add-button").onclick = async function() {
  const folderNameElement = document.querySelector("#folders [name=folder-name]");
  try {
    const result = await dbInsert("Folders", {
      name: folderNameElement.value
    });
    createFolderElement({
      id: result.lastID,
      name: folderNameElement.value
    });
    folderNameElement.value = "";
    console.log(result);
  }catch(err) {
    console.log(err);
  }
};

document.querySelector("#folders").onclick = async function(e) {
  let folderElement = e.target.closest(".folder");
  if(folderElement) {
    const folderID = folderElement.dataset.id;
    const result = await dbAll(`SELECT * FROM Categories WHERE folderID = ${folderID};`);
    createCategoryElements(result);
    this.classList.add("hidden");
    currentState.folderID = folderID;
    console.log(result);
  }
};

async function showConfirmDialog(msg) {
  const result = await ipcRenderer.invoke('show-confirm-dialog', msg);
  return Boolean(result.response);
}

async function deleteCategory(categoryID) {
  const isYes = await showConfirmDialog("Are you sure you want to delete this category?");
  if(isYes) {
    try {
      const result = await dbDelete("Categories", categoryID);
      return result.changes === 1;
    }catch(err) {
      console.log(err);
      return false;
    }
  }
}

document.querySelector("#topics").onclick = async function(e) {
  const categoryTitleElement = e.target.closest(".category-title");
  const categoryElement = categoryTitleElement?.closest(".category");
  if(categoryTitleElement) {
    const isDelete = e.target.className.match("fa-trash");
    const isAdd = e.target.className.match("fa-plus");
    if(isDelete) {
      const categoryID = categoryElement.dataset.id;
      const wasDeleted = await deleteCategory(categoryID);
      wasDeleted && categoryElement.remove();
    }else if(isAdd) {
      const topicName = document.querySelector("#topics [name=category-name]");
      try {
        const result = await dbInsert("Topics", {
          name: topicName.value,
          categoryID: categoryElement.dataset.id
        });
        createTopicElement({
          id: result.lastID,
          name: topicName.value
        }, categoryElement);
        console.log(result);
      }catch(err) {
        console.log(err);
      }
    }
  }
};

document.querySelector("#topics .add-button").onclick = async function() {
  const categoryNameElement = document.querySelector("#topics [name=category-name]");
  try {
    const result = await dbInsert("Categories", {
      name: categoryNameElement.value,
      folderID: currentState.folderID
    });
    createCategoryElement({
      id: result.lastID,
      name: categoryNameElement.value
    });
    categoryNameElement.value = "";
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

  // try {
  //   const result = await dbRun("DELETE FROM Categories;");
  //   console.log(result);
  // }catch(err) {
  //   console.log(err);
  // }

  // try {
  //   const result = await dbInsert("Categories", {
  //     name: "HTML Tutorial",
  //     folderID: 1
  //   });
  //   console.log(result);
  // }catch(err) {
  //   console.log(err);
  // }
  // try {
  //   const result = await dbInsert("Categories", {
  //     name: "HTML Forms",
  //     folderID: 1
  //   });
  //   console.log(result);
  // }catch(err) {
  //   console.log(err);
  // }
  // try {
  //   const result = await dbInsert("Categories", {
  //     name: "HTML Graphics",
  //     folderID: 1
  //   });
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