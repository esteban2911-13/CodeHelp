const $ = (id) => document.getElementById(id);

const folderView = $("folder-view");
const folderGrid = $("folder-grid");
const fileView = $("file-view");
const editorView = $("editor-view");

const fileList = $("file-list");
const folderTitle = $("folder-title");
const editorTitle = $("editor-title");
const fileContent = $("file-content");
const saveStatus = $("save-status");

const FOLDER_IMAGE = "img/image 5.png";
const FILE_IMAGE = "img/image 14.png";

// Clave nueva: comienza sin las carpetas de prueba anteriores.
const STORAGE_KEY = "codehelp-files-v2";

let folders = loadFolders();
let currentFolderId = null;
let currentFileId = null;
let clickTimer = null;

function createId() {
    return crypto.randomUUID();
}

function loadFolders() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        const data = saved ? JSON.parse(saved) : [];
        return Array.isArray(data) ? data : [];
    } catch {
        return [];
    }
}

function saveFolders() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(folders));
        return true;
    } catch (error) {
        console.error(error);
        alert("Could not save. Check available space.");
        return false;
    }
}

function getFolder() {
    return folders.find(folder => folder.id === currentFolderId);
}

function getFile() {
    const folder = getFolder();
    return folder?.files.find(file => file.id === currentFileId);
}

function makeButton(text, className, action) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = text;
    button.className = className;

    button.addEventListener("click", event => {
        event.stopPropagation();
        action();
    });

    return button;
}

function makeImage(src, alt) {
    const img = document.createElement("img");
    img.src = src;
    img.alt = alt;
    img.onerror = () => {
        img.style.display = "none";
    };
    return img;
}

// Permite renombrar con doble clic sin abrir el elemento.
function enableRename(nameElement, item, refresh) {
    nameElement.title = "Double-click to change the name";

    nameElement.addEventListener("dblclick", event => {
        event.preventDefault();
        event.stopPropagation();

        clearTimeout(clickTimer);

        const newName = prompt("New name:", item.name);
        if (newName === null) return;

        const cleanName = newName.trim();
        if (!cleanName) {
            alert("The name cannot be empty.");
            return;
        }

        const oldName = item.name;
        item.name = cleanName;

        if (saveFolders()) {
            refresh();
        } else {
            item.name = oldName;
        }
    });
}

// -------- CARPETAS --------

function renderFolders() {
    clearTimeout(clickTimer);

    folderView.hidden = false;
    fileView.hidden = true;
    editorView.hidden = true;

    folderGrid.replaceChildren();

    if (folders.length === 0) {
        const empty = document.createElement("p");
        empty.className = "empty-message2";
        empty.textContent =
            "You don't have any folders yet. Click «+ New folder» to get started.";
        folderGrid.appendChild(empty);
        return;
    }

    folders.forEach(folder => {
        const card = document.createElement("div");
        card.className = "folder-card";

        const image = makeImage(FOLDER_IMAGE, "Folder");
        const name = document.createElement("span");
        name.className = "item-name";
        name.textContent = folder.name;

        // Un clic abre la carpeta; doble clic en el nombre la renombra.
        card.addEventListener("click", () => {
            clearTimeout(clickTimer);
            clickTimer = setTimeout(() => openFolder(folder.id), 250);
        });

        enableRename(name, folder, renderFolders);

        const remove = makeButton("Delete", "delete-button", () => {
            if (!confirm(
                `Delete "${folder.name}" and all its files?`
            )) return;

            const index = folders.findIndex(item => item.id === folder.id);
            if (index === -1) return;

            const deleted = folders.splice(index, 1)[0];

            if (saveFolders()) {
                renderFolders();
            } else {
                folders.splice(index, 0, deleted);
            }
        });

        card.append(image, name, remove);
        folderGrid.appendChild(card);
    });
}

$("create-folder").addEventListener("click", () => {
    const name = prompt("Name of the new folder:");
    if (name === null) return;

    const cleanName = name.trim();
    if (!cleanName) {
        alert("Please enter a name.");
        return;
    }

    const folder = {
        id: createId(),
        name: cleanName,
        files: []
    };

    folders.push(folder);

    if (saveFolders()) {
        renderFolders();
    } else {
        folders.pop();
    }
});

function openFolder(folderId) {
    clearTimeout(clickTimer);

    currentFolderId = folderId;
    currentFileId = null;

    renderFiles();

    folderView.hidden = true;
    fileView.hidden = false;
    editorView.hidden = true;
}

// -------- ARCHIVOS --------

function renderFiles() {
    const folder = getFolder();

    if (!folder) {
        currentFolderId = null;
        renderFolders();
        return;
    }

    folderTitle.textContent = folder.name;
    fileList.replaceChildren();

    if (folder.files.length === 0) {
        const empty = document.createElement("p");
        empty.className = "empty-message";
        empty.textContent =
            "This folder is empty. Click «+ New file» to get started.";
        fileList.appendChild(empty);
        return;
    }

    folder.files.forEach(file => {
        const row = document.createElement("div");
        row.className = "file-row";

        const image = makeImage(FILE_IMAGE, "File");
        const name = document.createElement("span");
        name.className = "item-name";
        name.textContent = file.name;

        row.addEventListener("click", () => {
            clearTimeout(clickTimer);
            clickTimer = setTimeout(() => openFile(file.id), 250);
        });

        enableRename(name, file, renderFiles);

        const remove = makeButton("Delete", "delete-button", () => {
            if (!confirm(`Delete the file "${file.name}"?`)) return;

            const index = folder.files.findIndex(item => item.id === file.id);
            if (index === -1) return;

            const deleted = folder.files.splice(index, 1)[0];

            if (saveFolders()) {
                renderFiles();
            } else {
                folder.files.splice(index, 0, deleted);
            }
        });

        row.append(image, name, remove);
        fileList.appendChild(row);
    });
}

$("create-file").addEventListener("click", () => {
    const folder = getFolder();
    if (!folder) {
        alert("First, open a folder.");
        return;
    }

    const name = prompt(
        "Name of the new file (e.g., notes.txt):",
        "NewFile.txt"
    );

    if (name === null) return;

    const cleanName = name.trim();
    if (!cleanName) {
        alert("Please enter a name.");
        return;
    }

    const file = {
        id: createId(),
        name: cleanName,
        content: ""
    };

    folder.files.push(file);

    if (saveFolders()) {
        renderFiles();
    } else {
        folder.files.pop();
    }
});

// -------- EDITOR --------

function openFile(fileId) {
    clearTimeout(clickTimer);

    const folder = getFolder();
    const file = folder?.files.find(item => item.id === fileId);
    if (!file) return;

    currentFileId = fileId;

    folderView.hidden = true;
    fileView.hidden = true;
    editorView.hidden = false;

    editorTitle.textContent = file.name;
    fileContent.value = file.content;
    saveStatus.textContent = "";
}

$("save-button").addEventListener("click", () => {
    const file = getFile();
    if (!file) return;

    const previous = file.content;
    file.content = fileContent.value;

    if (saveFolders()) {
        saveStatus.textContent = "File saved!";
    } else {
        file.content = previous;
        saveStatus.textContent = "Failed to save changes.";
    }
});

$("back-button").addEventListener("click", () => {
    currentFolderId = null;
    currentFileId = null;
    renderFolders();
});

$("back-to-files").addEventListener("click", () => {
    currentFileId = null;

    folderView.hidden = true;
    fileView.hidden = false;
    editorView.hidden = true;

    renderFiles();
});

$("download-button").addEventListener("click", () => {
    const file = getFile();
    if (!file) return;

    const blob = new Blob([fileContent.value], {
        type: "text/plain;charset=utf-8"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = file.name;
    link.click();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
});

renderFolders();


