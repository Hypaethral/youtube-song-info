// Description: Handles all the browser level activities (e.g. tab management, etc.)
const actions = {
    scan: "scan",
    stop: "stop",
    select: "select",
    queryStatus: "queryStatus",
    debug: "debug",
    dumpMemory: "dumpMemory",
    log: "log"
}

let memory = {
    windows: [],
    registeredWindow: null,
    registeredTab: null,
    started: false,
    setIntervalHandler: null,
    downloadIds: []
}

function status() {
    return { registeredTab: memory.registeredTab, started: memory.started };
}

function confirmDestructiveAction(additionalMessage = "") {
    return memory.registeredTab != null && confirm(`Are you sure you want to stop the script? ${additionalMessage}`);
}

function scan(windows) {
    console.log("youtube-song-info :: scan");
    const windowsWithCWTabs = windows.filter(w =>
        w.tabs.some(t => t.url.includes("https://www.youtube.com/watch?"))
    );

    windowsWithCWTabs.forEach(w => {
        const trimmedTabs = w.tabs.filter(t => t.url.includes("https://www.youtube.com/watch?"))
            .map(function (t) {
                return { id: t.id, url: t.url, title: t.title, audible: t.audible };
            });

        if (trimmedTabs.length != 0) {
            const index = memory.windows.findIndex(w2 => w.id == w2.id);
            if (index == -1) {
                memory.windows.push({ id: w.id, tabs: trimmedTabs });
            } else {
                memory.windows[index] = { id: w.id, tabs: trimmedTabs };
            }
        }
    });

    return { registeredWindows: memory.windows };
}

function select(windowId, tabId) {
    console.log("youtube-song-info :: select");
    if (memory.registeredTab != null && !clearMemory()) {
        console.log("youtube-song-info :: select :: received a select, but not actioning");
        return;
    }
    memory.registeredTab = tabId;
    memory.registeredWindow = windowId;
    start();
    return { registeredTabs: 1 };
}

function start() {
    console.log(`youtube-song-info :: start`);
    memory.started = true;
    memory.setIntervalHandler = setInterval(function() {
        chrome.tabs.get(memory.registeredTab, tab => {
            if (chrome.runtime.lastError) {
                console.log(`youtube-song-info :: start :: main :: encountered error, auto-cleanup`);
                clearMemory(true);
                return;
            }

            const message = `${tab.audible ? "Playing: " : "Paused: "} ${tab.title.replace("- YouTube", "")}`
            chrome.downloads.download({
                url: window.webkitURL.createObjectURL(makeBlobFromString(message)),
                filename: "youtube-song.txt",
                conflictAction: "overwrite"
            }, id => memory.downloadIds.push(id));
        });
    }, 15000);
}

function makeBlobFromString(str) {
    const arr = new Uint8Array(str.split("").map(char => char.charCodeAt(0)));
    console.log(`youtube-song-info :: makeBlobFromString :: ${str}`, arr);
    try {
        return new Blob([arr], {type: "text/rtf"});
    } catch (e) {
        // The BlobBuilder API has been deprecated in favour of Blob, but older
        // browsers don't know about the Blob constructor
        // IE10 also supports BlobBuilder, but since the `Blob` constructor
        //  also works, there's no need to add `MSBlobBuilder`.
        var BlobBuilder = window.WebKitBlobBuilder || window.MozBlobBuilder;
        var bb = new BlobBuilder();
        bb.append(str);
        return bb.getBlob("text/rtf");
    }
}

function dumpMemory() {
    console.log(`youtube-song-info :: dumpMemory`);
    console.log(memory);
}

function debug() {
    console.log(`youtube-song-info :: debug`);
    memory.registeredTab = {id:"debug"};

    if (clearMemory()) {
        memory.started = true;
        memory.setIntervalHandler = setInterval(function() {
            const thing = Math.random().toString(36).substring(7);
            chrome.downloads.download({
                url: window.webkitURL.createObjectURL(makeBlobFromString(thing)),
                filename: "youtube-song.txt",
                conflictAction: "overwrite"
            }, id => memory.downloadIds.push(id));
        }, 2000);
    }
}

function clearMemory(force = false) {
    console.log("youtube-song-info :: clearMemory");
    if (force || confirmDestructiveAction()) {
        clearInterval(memory.setIntervalHandler);
        memory.started = false;
        memory.setIntervalHandler = null;
        memory.registeredTab = null;
        memory.registeredWindow = null;
        memory.downloadIds.forEach(id => chrome.downloads.erase({id: id}));
        return true;
    }

    return false;
}

function asyncEnumerateWindows(cb) {
    console.log("youtube-song-info :: asyncEnumerateWindows");
    chrome.windows.getAll({
        populate: true
    }, cb);
}

function emptyResponse() {
    console.log("youtube-song-info :: emptyResponse");
    return {
        successful: true
    };
}

function makeResponseFromResult(data) {
    console.log("youtube-song-info :: makeResponseFromResult");
    if (!data.errors || data.errors.length == 0) {
        return {
            successful: true,
            data: data
        }
    } else {
        return {
            successful: false,
            data: data
        }
    }
}

function makeResponseFromException(exception) {
    console.log("youtube-song-info :: makeResponseFromException");
    return makeResponseFromResult({
        errors: [`Message: ${exception.message}\nStack: ${exception.stack}`]
    });
}

function messageHandler(request, sender, sendResponse) {
    try {
        switch (request.action) {
            case actions.scan:
                asyncEnumerateWindows(windows => {
                    const registerResult = scan(windows);
                    sendResponse(makeResponseFromResult(registerResult));
                });
                return true; // https://developer.chrome.com/extensions/runtime#event-onMessage
            case actions.select:
                const selectResult = select(request.windowId, request.tabId);
                sendResponse(makeResponseFromResult(selectResult));
            case actions.queryStatus:
                const statusResult = status();
                sendResponse(makeResponseFromResult(statusResult));
                break;
            case actions.stop:
                clearMemory();
                sendResponse(emptyResponse());
                break;
            case actions.debug:
                debug();
                sendResponse(emptyResponse());
                break;
            case actions.dumpMemory:
                dumpMemory();
                sendResponse(emptyResponse());
                break;
            case actions.log:
                console.log(request.message);
                break;
            default:
                throw new Error(`youtube-song-info :: eventListener did not match ${request.msg}`)
        }
    } catch (e) {
        sendResponse(makeResponseFromException(e));
    }
}

chrome.runtime.onMessage.addListener(messageHandler);