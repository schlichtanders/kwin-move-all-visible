///////////////////////
// initialization
///////////////////////

const infoMode = true;
const debugMode = false;
function info(...args) {
    if (infoMode) { console.info("movevisible:", ...args); }
}
function debug(...args) {
    if (debugMode) { console.info("movevisible:", ...args); }
}
info("initializing");


///////////////////////
// pretty print client properties
///////////////////////

// stringify client object
function properties(client) {
    return JSON.stringify(client, undefined, 2);
}

// stringify client caption
function caption(client) {
    return client ? client.caption : client;
}

///////////////////////
// bookkeeping
///////////////////////

// keep track of window order
var clients_by_depth = [];

function ignoreClient(win) {
    return (
        // something on all desktops cannot be moved, ignore
        win.onAllDesktops
        // ignore non-normal windows
        // || !win.normalWindow
        // ignore desktop shell windows
        || ["plasmashell", "krunner"].includes(String(win.resourceName))
        // ignore special windows
        || win.desktopWindow
        || win.dock
        || win.tooltip
        || win.onScreenDisplay
        || win.notification
        || win.criticalNotification
    )
}

// remove other occurrences and add client to top of clients_by_depth
function addTop(client) {
    if (ignoreClient(client)) return;
    remove(client);
    clients_by_depth.unshift(client);
}

// remove client from clients_by_depth
function remove(client) {
    clients_by_depth = clients_by_depth.filter(entry => entry != client);
}

// check whether client is on current desktop
function onCurrentDesktop(win) {
    return win.desktop == workspace.currentDesktop
}

// TODO handle above all and below all clients


///////////////////////
// set up triggers
///////////////////////

// trigger minimize and restore
// when client is initially present, added or activated
workspace.clientList().forEach(onFirstTime);
workspace.clientAdded.connect(onActivated);
workspace.clientActivated.connect(onActivated);

function onFirstTime(client) {
    if (!client) return;
    info("first time", caption(client));
    debug(properties(client));
    addTop(client);
}

function onActivated(client) {
    if (!client) return;
    info("activated", caption(client));
    debug(properties(client));
    addTop(client);
}


///////////////////////
// visibility
///////////////////////

function computeVisible(desktop) {
    // iterate through windows from top to bottom
    var visibility = [workspace.virtualScreenGeometry];
    var clients_visible = [];
    for (let i = 0; i < clients_by_depth.length; i++) {
        let client = clients_by_depth[i];
        if (!onCurrentDesktop(client)) continue;
        let o = computeNewVisibility(client, visibility);
        if (o.visible) {
            clients_visible.push(client);
            visibility = o.visibility_new;
        }
    }
    return clients_visible;
}

function computeNewVisibility(client, visibility) {
    let visible = false;
    let visibility_new = [];
    for (let i = 0; i < visibility.length; i++) {
        let o = computeNewVisibility_rectangle(client, visibility[i]);
        visible = visible || o.visible;
        visibility_new.push(...o.visibility_new);
    }
    return { "visible": visible, "visibility_new": visibility_new };
}

function computeNewVisibility_rectangle(client, visibility) {
    let client_x = Math.max(client.x, visibility.x);
    let client_y = Math.max(client.y, visibility.y);
    let client_xmax = Math.min(client.x + client.width, visibility.x + visibility.width);
    let client_ymax = Math.min(client.y + client.height, visibility.y + visibility.height);

    // if the client is outside the visibility, the visibility wouldn't change
    if ((client_x >= client_xmax) || (client_y >= client_ymax)) {
        return { "visible": false, "visibility_new": [visibility] };
    }
    // x = 0 is left
    // full height by convention
    let left_cut = {
        "x": visibility.x,
        "y": visibility.y,
        "width": client_x - visibility.x,
        "height": visibility.height,
    };
    // full height by convention
    let right_cut = {
        "x": client_xmax,
        "y": visibility.y,
        "width": (visibility.x + visibility.width) - client_xmax,
        "height": visibility.height,
    };
    // client width by convention
    // y = 0 is top
    let top_cut = {
        "x": client_x,
        "y": visibility.y,
        "width": client_xmax - client_x,
        "height": client_y - visibility.y,
    };
    let bottom_cut = {
        "x": client_x,
        "y": client_ymax,
        "width": client_xmax - client_x,
        "height": (visibility.y + visibility.height) - client_ymax,
    };
    // ignore empty rectangles
    let visibility_new = [left_cut, right_cut, top_cut, bottom_cut].filter(r => (r.width > 0) && (r.height > 0));
    return { "visible": true, "visibility_new": visibility_new };
}


///////////////////////
// move windows
///////////////////////

function moveToDesktop(desktop_new) {
    info("========== moving visible start ==========")
    if (desktop_new <= 0 || desktop_new > workspace.desktops) return;
    let clients_visible = computeVisible(workspace.currentDesktop);
    debug(properties(clients_visible))
    for (let i = 0; i < clients_visible.length; i++) {
        let client = clients_visible[i];
        info("visible", caption(client));
        client.desktop = desktop_new
    }
    // switch to new desktop
    workspace.currentDesktop = desktop_new;
    info("========== moving visible stop ==========")
}


///////////////////////
// shortcuts
///////////////////////

// Check if the register function actually exists
if (registerShortcut) {

    registerShortcut("Move visible windows to next",
        "MOVE VISIBLE: Move visible windows to the next desktop.",
        "Meta+Shift+Alt+Ctrl+Right",
        function () { moveToDesktop(workspace.currentDesktop + 1); });

    registerShortcut("Move visible windows to previous",
        "MOVE VISIBLE: Move visible windows to the previous desktop.",
        "Meta+Shift+Alt+Ctrl+Left",
        function () { moveToDesktop(workspace.currentDesktop - 1); });

    registerShortcut("Move visible windows up",
        "MOVE VISIBLE: Move visible windows to above desktop.",
        "Meta+Shift+Alt+Ctrl+Up",
        function () { moveToDesktop(workspace.currentDesktop - workspace.desktopGridWidth); });

    registerShortcut("Move visible windows down",
        "MOVE VISIBLE: Move visible windows to below desktop.",
        "Meta+Shift+Alt+Ctrl+Down",
        function () { moveToDesktop(workspace.currentDesktop + workspace.desktopGridWidth); });

    registerShortcut("Move visible windows to desktop 1",
        "MOVE VISIBLE: Move visible windows to desktop 1.",
        "Meta+Alt+Ctrl+!",
        function () { moveToDesktop(1); });

    registerShortcut("Move visible windows to desktop 2",
        "MOVE VISIBLE: Move visible windows to desktop 2.",
        "Meta+Alt+Ctrl+\"",
        function () { moveToDesktop(2); });

    registerShortcut("Move visible windows to desktop 3",
        "MOVE VISIBLE: Move visible windows to desktop 3.",
        "Meta+Alt+Ctrl+§",
        function () { moveToDesktop(3); });

    registerShortcut("Move visible windows to desktop 4",
        "MOVE VISIBLE: Move visible windows to desktop 4.",
        "Meta+Alt+Ctrl+$",
        function () { moveToDesktop(4); });

    registerShortcut("Move visible windows to desktop 5",
        "MOVE VISIBLE: Move visible windows to desktop 5.",
        "Meta+Alt+Ctrl+%",
        function () { moveToDesktop(5); });

    registerShortcut("Move visible windows to desktop 6",
        "MOVE VISIBLE: Move visible windows to desktop 6.",
        "Meta+Alt+Ctrl+&",
        function () { moveToDesktop(6); });

    registerShortcut("Move visible windows to desktop 7",
        "MOVE VISIBLE: Move visible windows to desktop 7.",
        "Meta+Alt+Ctrl+/",
        function () { moveToDesktop(7); });

    registerShortcut("Move visible windows to desktop 8",
        "MOVE VISIBLE: Move visible windows to desktop 8.",
        "Meta+Alt+Ctrl+(",
        function () { moveToDesktop(8); });

    registerShortcut("Move visible windows to desktop 9",
        "MOVE VISIBLE: Move visible windows to desktop 9.",
        "Meta+Alt+Ctrl+)",
        function () { moveToDesktop(9); });
}
