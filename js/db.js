const sqlite3 = require('sqlite3');
const fs = require('fs');
const { ipcRenderer } = require('electron');
const showdown  = require('showdown');
const converter = new showdown.Converter({
  backslashEscapesHTMLTags: true,
  completeHTMLDocument: true,
  disableForced4SpacesIndentedSublists: true,
  ellipsis: true,
  emoji: true,
  encodeEmails: true,
  excludeTrailingPunctuationFromURLs: true,
  ghCodeBlocks: true,
  ghCompatibleHeaderId: true,
  ghMentions: true,
  ghMentionsLink: true,
  headerLevelStart: true,
  literalMidWordAsterisks: true,
  literalMidWordUnderscores: true,
  metadata: true,
  noHeaderId: true,
  omitExtraWLInCodeBlocks: true,
  openLinksInNewWindow: true,
  parseImgDimensions: true,
  prefixHeaderId: true,
  rawHeaderId: true,
  rawPrefixHeaderId: true,
  requireSpaceBeforeHeadingText: true,
  simpleLineBreaks: true,
  simplifiedAutoLink: true,
  smartIndentationFix: true,
  smoothLivePreview: true,
  splitAdjacentBlockquotes: true,
  strikethrough: true,
  tables: true,
  tablesHeaderId: true,
  tasklists: true,
  underline: true
});

const hljs = require('highlight.js');

let db = null;

const currentState = {
  folderID: null,
  topicID: null
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

function createTopicsHTML(topics) {
  const topicsHTML = topics.map(topic => `<li data-id=${topic.id} class="topic-title">${topic.name}</li>`);
  return topicsHTML.join("");
}

async function createCategoryElement(category, topics) {
  const newCategoryElement = document.createElement("SECTION");
  newCategoryElement.dataset.id = category.id;
  newCategoryElement.className = "category";
  newCategoryElement.innerHTML = `
    <h2 class="category-title"><span>${category.name}</span><button class="fa fa-plus-circle"></button><button class="fa fa-trash-o"></button></h2>
    <ul class="topics">
      ${topics ? createTopicsHTML(topics) : ""}
    </ul>
  `;
  document.querySelector("#topics").appendChild(newCategoryElement);
}

function createCategoryElements(categories) {
  categories.forEach(async category => {
    try {
      const result = await dbAll(`SELECT * FROM Topics WHERE categoryID = ${category.id} ORDER BY name;`);
      createCategoryElement(category, result);
      console.log({topics: result});
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
    console.log({folderInsertion: result});
  }catch(err) {
    console.log(err);
  }
};

document.querySelector("#folders").onclick = async function(e) {
  let folderElement = e.target.closest(".folder");
  if(folderElement) {
    const folderID = folderElement.dataset.id;
    if(currentState.folderID !== folderID) {
      console.log("Loading categories and topics...");
      document.querySelectorAll("#topics .category").forEach(category => category.remove());
      const result = await dbAll(`SELECT * FROM Categories WHERE folderID = ${folderID} ORDER BY NAME;`);
      createCategoryElements(result);
      currentState.folderID = folderID;
      console.log({categories: result});
    }

    this.classList.add("hidden");
    document.querySelector("aside").classList.remove("hidden");
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

function createArticleElement(article) {
  const newArticleElement = document.createElement("ARTICLE");
  newArticleElement.dataset.id = article.id;
  // convert the markdown into html
  newArticleElement.innerHTML = `
    <button class="fa fa-trash-o delete-button"></button>
    ${converter.makeHtml(article.content)}
  `;
  // highlight the html code elements
  newArticleElement.querySelectorAll("code").forEach(code => hljs.highlightElement(code));
  document.querySelector("#articles").appendChild(newArticleElement);
}

function createArticleElements(articles) {
  articles.forEach(article => {
    createArticleElement(article);
  });
}

document.querySelector("#topics").onclick = async function(e) {
  const categoryTitleElement = e.target.closest(".category-title");
  const categoryElement = categoryTitleElement?.closest(".category");
  const topicTitleElement = e.target.closest(".topic-title");
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
        topicName.value = "";
        console.log({topicInsertion: result});
      }catch(err) {
        console.log(err);
      }
    }
  }else if(topicTitleElement) {
    const topicID = topicTitleElement.dataset.id;
    if(currentState.topicID !== topicID) {
      document.querySelector("#articles").innerHTML = "";
      try {
        const result = await dbAll(`SELECT * FROM Articles WHERE topicID = ${topicID}`);
        createArticleElements(result);
        currentState.topicID = topicID;
        document.querySelector("main").classList.remove("hidden");
        console.log({articles: result});
      }catch(err) {
        console.log(err);
      }
    }
  }
};

document.querySelector("#topics .return-button").onclick = function() {
  document.querySelector("#folders").classList.remove("hidden");
  document.querySelector("aside").classList.add("hidden");
  document.querySelector("main").classList.add("hidden");
}

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
    console.log({categoryInsertion: result});
  }catch(err) {
    console.log(err);
  }
};

document.querySelector("main [name=article-content]").onkeydown = async function(e) {
  if(e.key === "Enter" && e.shiftKey) {
    this.rows += 1;
  }else if(e.key === "Enter") {
    e.preventDefault();
    const articleContent = document.querySelector("main [name=article-content]");
    try {
      const result = await dbInsert("Articles", {
        content: articleContent.value,
        topicID: currentState.topicID
      });
      console.log({articleInsertion: result});
      createArticleElement({
        id: result.lastID,
        content: articleContent.value
      });
      articleContent.value = "";
    }catch(err) {
      console.log(err);
    }
  }
};

document.querySelector("main [name=article-content]").onkeyup = async function(e) {
  if(e.key === "Backspace" || e.key === "Delete") {
    this.rows = this.value.split("\n").length;
  }
};

document.querySelector("#articles").onclick = async function(e) {
  const articleElement = e.target.closest("article");
  if(e.target.className.match("delete-button")) {
    console.log("delete click");
    try {
      const articleID = articleElement.dataset.id;
      const result = await dbDelete("Articles", articleID);
      console.log({articleDeletion: result});
      articleElement.remove();
    }catch(err) {
      console.log(err);
    }
  }
};

window.onload = async function() {
  await prepareDB();
  try {
    const result = await dbAll(`SELECT * FROM Folders ORDER BY name;`);
    createFolderElements(result);
    console.log({folders: result});
  }catch(err) {
    console.log(err);
  }
}