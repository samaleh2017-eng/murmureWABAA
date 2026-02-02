const MURMURE_WS_URL = 'ws://127.0.0.1:4800/ws/context';
const MURMURE_HTTP_URL = 'http://127.0.0.1:4800/api/context';
const BROWSER_NAME = 'chrome';

let isEnabled = true;
let socket = null;
let reconnectTimer = null;
let lastSentUrl = '';

chrome.storage.local.get(['murmureEnabled'], (result) => {
    isEnabled = result.murmureEnabled !== false;
    if (isEnabled) {
        connectWebSocket();
    }
});

chrome.storage.onChanged.addListener((changes) => {
    if (changes.murmureEnabled) {
        isEnabled = changes.murmureEnabled.newValue;
        if (isEnabled) {
            connectWebSocket();
        } else {
            disconnectWebSocket();
        }
    }
});

function connectWebSocket() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        return;
    }

    try {
        socket = new WebSocket(MURMURE_WS_URL);

        socket.onopen = () => {
            console.log('Murmure WebSocket connected');
            clearReconnectTimer();
            sendCurrentTabContext();
        };

        socket.onclose = () => {
            console.log('Murmure WebSocket disconnected');
            socket = null;
            scheduleReconnect();
        };

        socket.onerror = (error) => {
            console.debug('Murmure WebSocket error:', error);
        };

        socket.onmessage = (event) => {
            console.debug('Murmure response:', event.data);
        };
    } catch (e) {
        console.debug('Failed to connect WebSocket:', e);
        scheduleReconnect();
    }
}

function disconnectWebSocket() {
    clearReconnectTimer();
    if (socket) {
        socket.close();
        socket = null;
    }
}

function scheduleReconnect() {
    clearReconnectTimer();
    if (isEnabled) {
        reconnectTimer = setTimeout(connectWebSocket, 5000);
    }
}

function clearReconnectTimer() {
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }
}

async function sendCurrentTabContext() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
        sendContext(tab);
    }
}

function sendContext(tab) {
    if (!isEnabled || !tab?.url || !tab?.title) return;

    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') ||
        tab.url.startsWith('edge://') || tab.url.startsWith('extension://')) {
        return;
    }

    if (tab.url === lastSentUrl) return;
    lastSentUrl = tab.url;

    const context = JSON.stringify({
        url: tab.url,
        title: tab.title,
        browser: BROWSER_NAME
    });

    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(context);
    } else {
        fetch(MURMURE_HTTP_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: context
        }).catch(e => console.debug('Murmure HTTP fallback failed:', e.message));
    }
}

chrome.tabs.onActivated.addListener(async (activeInfo) => {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    sendContext(tab);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url && tab.active) {
        sendContext(tab);
    }
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) return;

    const [tab] = await chrome.tabs.query({ active: true, windowId });
    if (tab) sendContext(tab);
});
