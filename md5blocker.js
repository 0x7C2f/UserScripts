// ==UserScript==
// @name         md5blocker
// @namespace    http://tampermonkey.net/
// @updateURL    https://github.com/MaresOnMyFace/md5blocker/raw/main/md5blocker.user.js
// @downloadURL  https://github.com/MaresOnMyFace/md5blocker/raw/main/md5blocker.user.js
// @version      1.3
// @description  Filters images on image boards by their data-md5 tag
// @author       (You)
// @match        *://boards.4channel.org/*
// @match        *://boards.4chan.org/*
// @match        *://*.vichan.net/*
// @match        *://*.tinyboard.org/*
// @run-at       document-start
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @grant        GM.xmlHttpRequest
// ==/UserScript==
/* globals $ */

var $ = window.jQuery;

window.md5blocker = {};
window.md5blocker.constant = {};
window.md5blocker.constant.DB_NAME = "filterDb";
window.md5blocker.constant.DB_VERSION = 69;
window.md5blocker.constant.DB_STORE_NAME = "evilMd5s";

window.md5blocker.dbOpenConnection = async function() {
    function openDb() {
        return new Promise(function(resolve, reject) {
            var req = indexedDB.open(window.md5blocker.constant.DB_NAME, window.md5blocker.constant.DB_VERSION);
            req.onsuccess = function(evt) {
                resolve(req.result);
            };
            req.onerror = function(evt) {
                reject(Error("[FILTERDB] OPEN ERROR: " + evt.target.errorCode));
            };
            req.onupgradeneeded = function(evt) {
                console.log("[FILTERDB] OPEN - UPGRADE NEEDED");
                var store = evt.currentTarget.result.createObjectStore(window.md5blocker.constant.DB_STORE_NAME, { keyPath: 'md5' });
                store.createIndex('md5', 'md5', { unique: true });
                resolve(openDb());
            };
        });
    }
    return await openDb();
};

window.md5blocker.dbCreateUtils = function(dbConnection) {
    function getObjectStore(store_name, mode) {
        var tx = dbConnection.transaction(store_name, mode);
        return tx.objectStore(store_name);
    }

    function getAll() {
        var store = getObjectStore(window.md5blocker.constant.DB_STORE_NAME, "readonly");
        return store.getAll();
    }

    function count() {
        var store = getObjectStore(window.md5blocker.constant.DB_STORE_NAME, "readonly");
        return new Promise(function(resolve, reject) {
            var req = store.count();
            req.onsuccess = function(evt) {
                resolve(req.result);
            };
            req.onerror = function(evt) {
                reject(Error("[FILTERDB] COUNT ERROR: " + evt.target.errorCode));
            };
        });
    }

    function get(md5) {
        var store = getObjectStore(window.md5blocker.constant.DB_STORE_NAME, "readonly");
        return new Promise(function(resolve, reject) {
            var req = store.get(md5);
            req.onsuccess = function(evt) {
                resolve(req.result);
            };
            req.onerror = function(evt) {
                reject(Error("[FILTERDB] GET ERROR: " + evt.target.errorCode));
            };
        });
    }

    function set(md5) {
        var store = getObjectStore(window.md5blocker.constant.DB_STORE_NAME, "readwrite");
        return new Promise(function(resolve, reject) {
            var req = store.add({ md5: md5 });
            req.onsuccess = function(evt) {
                resolve(1);
            };
            req.onerror = function(evt) {
                resolve(0);
            };
        });
    }

    function unset(md5) {
        var store = getObjectStore(window.md5blocker.constant.DB_STORE_NAME, "readwrite");
        return new Promise(function(resolve, reject) {
            var req = store.delete(md5);
            req.onsuccess = function(evt) {
                resolve();
            };
            req.onerror = function(evt) {
                reject(Error("[FILTERDB] DELETE ERROR: " + evt.target.errorCode));
            };
        });
    }

    return {
        count: count,
        getAllEvilMd5s: getAll,
        getEvilMd5: get,
        setEvilMd5: set,
        clearEvilMd5: unset
    };
};

window.md5blocker.setEvilMd5inPersistence = async function(dbUtilsProm, md5) {
    await dbUtilsProm.then(function(utils) {
        utils.setEvilMd5(md5);
    });
};

window.md5blocker.setMany = async function(dbUtilsProm, arr, progress) {
    var utils = await dbUtilsProm;
    var ct = 0;
    var i = 0;
    for (const md5 of arr) {
        progress(i);
        ct += await utils.setEvilMd5(md5);
        i += 1;
    }
    progress(arr.length);
    return ct;
};

window.md5blocker.removeEvilMd5fromPersistence = async function(dbUtilsProm, md5) {
    var utils = await dbUtilsProm;
    await utils.clearEvilMd5(md5);
};

window.md5blocker.countDbEntries = async function(dbUtilsProm) {
    var utils = await dbUtilsProm;
    return await utils.count();
};

window.md5blocker.getEvilMd5sfromPersistence = async function(dbUtilsProm) {
    var utils = await dbUtilsProm;
    return new Promise(function(resolve, reject) {
        var req = utils.getAllEvilMd5s();
        req.onsuccess = function(e) {
            var arr = e.target.result.map(o => o.md5);
            resolve(arr);
        };
        req.onerror = function(evt) {
            console.error("[FILTERDB] GETALL: ", evt.target.errorCode);
            reject(Error("[FILTERDB] GETALL: " + evt.target.errorCode));
        };
    });
};

window.md5blocker.evilMd5ExistsInPersistence = async function(dbUtilsProm, md5) {
    var utils = await dbUtilsProm;
    var got = await utils.getEvilMd5(md5);
    return got ? 1 : 0;
};

function handleImageDomNode(dbUtilsProm, n) {
    if (!n.getAttribute("checkedByFilter")) {
        let md5 = n.getAttribute("data-md5");
        if (md5) {
            n.setAttribute("checkedByFilter", "yes");
            var succ = n.nextSibling;
            var parent = n.parentNode;
            var empty = document.createTextNode("🐴");
            parent.replaceChild(empty, n);
            var clearEvilMd5 = function(e) {
                window.md5blocker.removeEvilMd5fromPersistence(dbUtilsProm, md5);
                e.preventDefault();
                e.stopPropagation();
                showImgAndAddHideButton();
            };
            var addEvilMd5 = function(e) {
                window.md5blocker.setEvilMd5inPersistence(dbUtilsProm, md5);
                e.preventDefault();
                e.stopPropagation();
                keepImgHiddenAndAddUnhideButton();
            };
            var keepImgHiddenAndAddUnhideButton = function() {
                var b = document.createElement("BUTTON");
                b.innerHTML = "clear";
                b.onclick = clearEvilMd5;
                parent.insertBefore(b, succ);
            };
            var showImgAndAddHideButton = function() {
                parent.replaceChild(n, empty);
                var b = document.createElement("BUTTON");
                b.innerHTML = "HIDE";
                b.onclick = function(e) {
                    addEvilMd5(e);
                    parent.replaceChild(empty, n);
                    var b2 = document.createElement("BUTTON");
                    b2.innerHTML = "clear";
                    b2.onclick = clearEvilMd5;
                    parent.insertBefore(b2, succ);
                    b.remove();
                };
                parent.insertBefore(b, succ);
            };
            window.md5blocker.evilMd5ExistsInPersistence(dbUtilsProm, md5).then(function(exists) {
                if (exists) {
                    keepImgHiddenAndAddUnhideButton();
                } else {
                    showImgAndAddHideButton();
                }
            });
        }
    }
}

function installStupidMutationObserver(dbUtilsProm, root) {
    if (!("MutationObserver" in window)) {
        window.MutationObserver = window.WebKitMutationObserver || window.MozMutationObserver;
    }
    var observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(m) {
            m.addedNodes.forEach(function(n) {
                if (n.tagName == "DIV") {
                    $(n).find("img").each(function(idx, node) {
                        handleImageDomNode(dbUtilsProm, node);
                    });
                }
            });
        });
    });
    observer.observe(root, { childList: true, subtree: true });
}

function installSubtreeMutationObserver(dbUtilsProm, root, options) {
    if (!("MutationObserver" in window)) {
        window.MutationObserver = window.WebKitMutationObserver || window.MozMutationObserver;
    }
    var observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(m) {
            m.addedNodes.forEach(function(n) {
                if (n.nodeType === Node.ELEMENT_NODE) {
                    $(n).find("img").each(function(idx, node) {
                        handleImageDomNode(dbUtilsProm, node);
                    });
                }
            });
        });
    });
    observer.observe(root, options);
}

function installAttributeMutationObserver(dbUtilsProm, root, options) {
    if (!("MutationObserver" in window)) {
        window.MutationObserver = window.WebKitMutationObserver || window.MozMutationObserver;
    }
    var observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(m) {
            if (m.type == "attributes" && m.attributeName == "data-md5") {
                handleImageDomNode(dbUtilsProm, m.target);
            }
        });
    });
    observer.observe(root, options);
}

function setupMenu(dbUtilsProm) {
    console.log("Setting up menu...");

    const menuButton = document.createElement("button");
    menuButton.textContent = "md5blocker";
    menuButton.style.position = "fixed";
    menuButton.style.top = "10px";
    menuButton.style.right = "10px";
    menuButton.style.zIndex = "9999";
    menuButton.style.backgroundColor = "white";
    menuButton.style.border = "1px solid black";

    const menuContainer = document.createElement("div");
    menuContainer.id = "md5blocker-menu";
    menuContainer.style.position = "fixed";
    menuContainer.style.top = "50px";
    menuContainer.style.right = "10px";
    menuContainer.style.padding = "10px";
    menuContainer.style.backgroundColor = "white";
    menuContainer.style.border = "1px solid black";
    menuContainer.style.display = "none";
    menuContainer.style.zIndex = "9999";

    const fileInputLabel = document.createElement("label");
    fileInputLabel.textContent = "Import MD5 List:";
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".txt";
    fileInputLabel.appendChild(fileInput);

    const exportButton = document.createElement("button");
    exportButton.textContent = "Export MD5 List";
    exportButton.onclick = async function() {
        const utils = await dbUtilsProm;
        const allMd5s = await utils.getAllEvilMd5s();
        const md5List = allMd5s.map(item => item.md5).join("\n");
        const blob = new Blob([md5List], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "md5blocker_md5_list.txt";
        a.click();
        URL.revokeObjectURL(url);
    };

    menuContainer.appendChild(fileInputLabel);
    menuContainer.appendChild(exportButton);
    document.body.appendChild(menuButton);
    document.body.appendChild(menuContainer);

    console.log("Menu elements appended to the body.");

    menuButton.addEventListener("click", () => {
        menuContainer.style.display = menuContainer.style.display === "none" ? "block" : "none";
    });

    fileInput.addEventListener("change", async function() {
        const file = fileInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async function(e) {
                const md5Array = e.target.result.split(/\r?\n/).filter(Boolean);
                await window.md5blocker.setMany(dbUtilsProm, md5Array, function(progress) {
                    console.log(`Progress: ${progress}/${md5Array.length}`);
                });
            };
            reader.readAsText(file);
        }
    });

    console.log("Menu setup complete.");
}

function initializemd5blocker() {
    console.log("Initializing md5blocker...");

    var dbConnection = window.md5blocker.dbOpenConnection();
    var dbUtils = window.md5blocker.dbCreateUtils(dbConnection);
    var dbUtilsProm = Promise.resolve(dbUtils);

    setupMenu(dbUtilsProm);

    $(document).ready(function() {
        console.log("Document ready, setting up mutation observers...");

        installStupidMutationObserver(dbUtilsProm, document.body);
        installSubtreeMutationObserver(dbUtilsProm, document.body, { childList: true, subtree: true });
        installAttributeMutationObserver(dbUtilsProm, document.body, { attributes: true, subtree: true });

        $('img').each(function(idx, node) {
            handleImageDomNode(dbUtilsProm, node);
        });

        console.log("md5blocker initialization complete.");
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializemd5blocker);
} else {
    initializemd5blocker();
}
