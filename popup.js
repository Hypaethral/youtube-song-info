// Handles your popup UI logic.

const failureIcon = `<span class="bad">&#9888;</span>`
const successIcon = `<span class="good">&#10003;</span>`

const actions = {
    scan: "scan",
    stop: "stop",
    select: "select",
    queryStatus: "queryStatus",
    debug: "debug",
    dumpMemory: "dumpMemory",
    log: "log"
}

function log(logMessage) {
    chrome.runtime.sendMessage({ action: actions.log, message: logMessage });
}

function queryStatus() {
    chrome.runtime.sendMessage({ action: actions.queryStatus }, handleMessageResponse.bind(this, actions.queryStatus));
}

function setStatus(statusMessage) {
    const status = document.getElementById("status-container");

    if (Array.isArray(statusMessage)) {
        status.innerHTML = "";
        statusMessage.forEach(e => {
            status.appendChild(e);
        });
    } else {
        status.innerHTML = statusMessage;
    }
}

function htmlifyErrors(errors) {
    let body = "";
    let count = 1;

    errors.forEach(e => {
        body += `${failureIcon} Error ${count}: ${e}\n`;
        count++;
    });

    return `<pre>${body}</pre>`
}

function select(data) {
    data.action = "select";
    chrome.runtime.sendMessage(data, handleMessageResponse.bind(this, "select"));
}

function htmlifyTabOptions(windows) {
    let divs = [];
    windows.forEach(w => w.tabs.forEach(t => {
        const linkText = document.createTextNode("Choose");
        const choose = document.createElement("a");
        choose.appendChild(linkText);
        choose.href = "#";
        choose.onclick = select.bind(this, {windowId: w.id, tabId: t.id});
        const descriptorText = document.createTextNode(t.title);
        const hr = document.createElement("hr");
        const div = document.createElement("div");
        div.appendChild(choose);
        div.appendChild(descriptorText);
        div.appendChild(hr);
        divs.push(div);
    }));

    return divs;
}

function handleMessageResponse(action, response) {
    log(`youtube-song-info :: received a response for action "${action}": ${JSON.stringify(response)}`);
    if (response.successful) {
        switch (action) {
            case actions.scan:
                if (response.data.registeredWindows != 0) {
                    setStatus(htmlifyTabOptions(response.data.registeredWindows));
                } else {
                    setStatus(`${failureIcon} No tabs found.  Open a youtube video.`);
                }
                break;
            case actions.queryStatus:
                if (response.data.registeredWindows != 0) {
                    setStatus(`${response.data.started ? `${successIcon} Running!` : `${failureIcon} Not Running.`}`);
                } else {
                    setStatus(`${failureIcon} Not Running.`);
                }
                break;
            default:
                queryStatus();
        }
    } else {
        if (response.data && response.data.restoredWindows) {
            // partial success
            setStatus(`${successIcon} Restored ${response.data.restoredTabs} Tabs!<br /><br />${failureIcon} Failed to ${action}<br />${htmlifyErrors(response.data.errors)}`)
        } else {
            setStatus(`${failureIcon} Failed to ${action}<br />${htmlifyErrors(response.data.errors)}`)
        }
    }
}

function addMessagingClickHandler(elem, action) {
    elem.addEventListener("click", () => chrome.runtime.sendMessage({ action: action }, handleMessageResponse.bind(this, action)), false);
}


// DOMContentLoaded event is the start of the UI scriptrunning
document.addEventListener("DOMContentLoaded", () => {
    setStatus(`NOTHING IS WORKING...`);
    queryStatus();

    const scan = document.getElementById("scan");
    // const select = document.getElementById("select");
    const stop = document.getElementById("stop");
    const debug = document.getElementById("debug");
    // const stop = document.getElementById("stop");
    const dump = document.getElementById("dump");

    addMessagingClickHandler(scan, actions.scan);
    addMessagingClickHandler(stop, actions.stop);
    addMessagingClickHandler(debug, actions.debug);
    addMessagingClickHandler(dump, actions.dumpMemory);
    log("youtube-song-info :: initialized UI, loaded click handlers");
});