document.querySelector("#folders-container").onclick = (e) => {
  console.log(e.target)
  const folderCard = e.target.closest(".folder-card");
  const action = e.target.dataset.action;
  const id = folderCard?.dataset.id;

  switch(action) {
    case "toggle-menu": {
      console.log("menu toggle")
      folderCard.querySelector(".buttons-menu").classList.toggle("hidden");
      break;
    }
    case "add-folder": {
      console.log("add folder");
      showAddFolderForm();
      break;
    }
    case "edit-folder": {
      console.log("edit folder id: " + id)
      folderCard.querySelector(".buttons-menu").classList.add("hidden");
      break;
    }
    case "delete-folder": {
      console.log("delete folder id: " + id)
      folderCard.querySelector(".buttons-menu").classList.add("hidden");
      break;
    }
    default: {
      if(folderCard) {
        // show the clicked folder
        console.log("show folder id: " + id)
        folderCard.querySelector(".buttons-menu").classList.add("hidden");
      }
    }
  }
}

document.querySelector("#add-folder-form #folder-image-input").onchange = function() {
  this.closest(".picture").querySelector("img").src = this.files?.[0]?.path;
  console.log(this.files)
}

function showAddFolderForm() {
  document.querySelector("#overlay").classList.remove("hidden");
  document.querySelector("#add-folder-form").classList.remove("hidden");
}