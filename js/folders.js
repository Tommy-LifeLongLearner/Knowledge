const selectedFolders = [];
const scrolls = [];

document.querySelector("#folders-container").onclick = (e) => {
  const folderCard = e.target.closest(".folder-card");
  // get the action from the span element if it was clicked and in case it's father element (button) was clicked
  const action = e.target.dataset.action || e.target.querySelector("span")?.dataset.action;
  const id = folderCard?.dataset.id;

  switch(action) {
    case "toggle-menu": {
      console.log("menu toggle")
      folderCard.querySelector(".buttons-menu").classList.toggle("hidden");
      break;
    }
    case "add-folder": {
      showFolderForm();
      break;
    }
    case "edit-folder": {
      showFolderForm("update", folderCard);
      folderCard.querySelector(".buttons-menu").classList.add("hidden");
      break;
    }
    case "delete-folder": {
      deleteFolderData(id);
      folderCard.querySelector(".buttons-menu").classList.add("hidden");
      break;
    }
    case "delete-folders": {
      deleteFoldersData(selectedFolders);
      break;
    }
    case "select-all-folders": {
      selectAllFolders();
      break;
    }
    case "deselect-all-folders": {
      deselectAllFolders();
      break;
    }
    case "select-folder": {
      const isSelected = e.target.checked;
      if(isSelected) {
        const len = selectedFolders.push(id);
        len === 1 && document.querySelector("#folders-container").classList.add("selecting");
      }else {
        selectedFolders.splice(selectedFolders.indexOf(id), 1);
        selectedFolders.length === 0 && document.querySelector("#folders-container").classList.remove("selecting");
      }
      console.log(selectedFolders);
      break;
    }
    default: {
      if(folderCard) {
        // access the clicked folder
        console.log("access folder id: " + id)
        selectedFolders.splice(selectAllFolders.length);
        deselectAllFolders();
        folderCard.querySelector(".buttons-menu").classList.add("hidden");
      }
    }
  }
}

document.querySelector("#add-folder-form [name=folder-image]").onchange = function() {
  document.querySelector("#folder-form-image img").src = this.files?.[0]?.path ?? "./imgs/no-image.png";
}

document.querySelector("#add-folder-form [name=folder-title]").oninput = function() {
  this.classList.remove("invalid");
}

function showFolderForm(action, folderCard) {
  if(action === "update") {
    // const data = {
    //   image: folderCard.querySelector(".picture img").src,
    //   title: folderCard.querySelector(".title").textContent.trim(),
    //   description: folderCard.querySelector(".description").textContent.trim()
    // };
    // const folderID = folderCard.dataset.id;
    // updateFolderData(folderID, data);
    document.querySelector("#add-folder-form").dataset.folderId = folderCard.dataset.id;
    document.querySelector("#folder-form-image img").src = folderCard.querySelector(".picture img").src;
    document.querySelector("#add-folder-form [name=folder-title]").value = folderCard.querySelector(".title").textContent.trim();
    document.querySelector("#add-folder-form [name=folder-description]").value = folderCard.querySelector(".description").textContent.trim();
  }
  document.querySelector("#overlay").classList.remove("hidden");
  document.querySelector("#add-folder-form").classList.remove("hidden");
}

document.querySelector("#add-folder-form").onclick = function(e) {
  const action = e.target.closest("button")?.dataset.action;

  switch(action) {
    case "save-add-folder-form": {
      handleFolderForm("save");
      break;
    }
    case "close-add-folder-form": {
      handleFolderForm("close");
      break;
    }
  }
}

function handleFolderForm(action) {
  switch(action) {
    case "close": {
      console.log("close folder form")
      document.querySelector("#folder-form-image img").src = "./imgs/no-image.png";
      document.querySelector("#add-folder-form [name=folder-title]").value = "";
      document.querySelector("#add-folder-form [name=folder-title]").classList.remove("invalid");
      document.querySelector("#add-folder-form [name=folder-description]").value = "";
      break;
    }
    case "save": {
      const data = {
        image: document.querySelector("#add-folder-form [name=folder-image]").files?.[0]?.path ?? document.querySelector("#folder-form-image img").src.split("file:///")[1],
        title: document.querySelector("#add-folder-form [name=folder-title]").value,
        description: document.querySelector("#add-folder-form [name=folder-description]").value
      }
      if(!data.title) {
        document.querySelector("#add-folder-form [name=folder-title]").classList.add("invalid");
        return;
      }
      const folderID = document.querySelector("#add-folder-form").dataset?.folderId;
      handleFolderData(data, folderID);
    }
  }
  
  document.querySelector("#add-folder-form").removeAttribute("data-folder-id");
  document.querySelector("#overlay").classList.add("hidden");
  document.querySelector("#add-folder-form").classList.add("hidden");
}

function handleFolderData(data, id) {
  if(id) {
    updateFolderData(id, data);
  }else {
    saveFolderData(data);
  }
}

function selectAllFolders() {
  document.querySelectorAll("#folders-list .folder-card input[type=checkbox]").forEach(folderCard => {
    !folderCard.checked && folderCard.click();
  });
}

function deselectAllFolders() {
  document.querySelectorAll("#folders-list .folder-card input[type=checkbox]").forEach(folderCard => {
    folderCard.checked && folderCard.click();
  });
}

function saveFolderData(data) {
  console.log("save created folder data: ", data);
  document.querySelector("#add-folder-form [data-action=close-add-folder-form]").click();
}

function deleteFolderData(id) {
  console.log("delete folder with id: " + id)
}

function deleteFoldersData(ids) {
  console.log("delete folders with ids: " + ids)
}

function updateFolderData(id, data) {
  console.log(`save updated folder data with id: ${id}, data: `, data);
  document.querySelector("#add-folder-form [data-action=close-add-folder-form]").click();
}

// a handler for the scrolling horizontal bar of folders
document.querySelector(".folders-menu-container").onclick = (e) => {
  const action = e.target.dataset.action;
  const foldersMenuElement = document.querySelector(".folders-menu");
  const foldersMenuElements = Array.from(foldersMenuElement.querySelectorAll("li"));
  let isScrolling = false;

  switch(action) {
    case "scroll-folders-menu-left": {
      foldersMenuElement.scrollTo(scrolls.pop(), 0);
      break;
    }
    case "scroll-folders-menu-right": {
      for(let li of foldersMenuElements) {
        if(
          li.offsetLeft <= foldersMenuElement.scrollLeft + foldersMenuElement.clientWidth && 
          li.offsetLeft + li.offsetWidth >= foldersMenuElement.scrollLeft + foldersMenuElement.clientWidth
        ) {
          // add the scrolls so when we go back we use them as a stack (LIFO)
          if(scrolls[scrolls.length - 1] === foldersMenuElement.scrollLeft) {
            return;
          }
          scrolls.push(foldersMenuElement.scrollLeft);
          foldersMenuElement.scrollTo(li.offsetLeft - 4, 0);
          isScrolling = true;
          break;
        }
      }
      if(!isScrolling) {
        if(scrolls[scrolls.length - 1] === foldersMenuElement.scrollLeft + foldersMenuElement.clientWidth - 4) {
          return;
        }
        scrolls.push(foldersMenuElement.scrollLeft + foldersMenuElement.clientWidth - 4);
        foldersMenuElement.scrollBy(foldersMenuElement.clientWidth - 4, 0);
      }
      break;
    }
  }
}