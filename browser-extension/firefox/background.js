const MURMURE_WS_URL = 'ws://127.0.0.1:4800/ws/context';
const MURMURE_HTTP_URL = 'http://127.0.0.1:4800/api/context';
const BROWSER_NAME = 'firefox';

let isEnabled = true;
let socket = null;
let reconnectTimer = null;
let lastSentUrl = '';

browser.storage.local.get(['murmureEnabled']).then((result) => {
    isEnabled = result.murmureEnabled !== false;
    if (isEnabled) {
        connectWebSocket();
    }
});

browser.storage.onChanged.addListener((changes) => {
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
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (tab) {
        sendContext(tab);
    }
}

function sendContext(tab) {
    if (!isEnabled || !tab?.url || !tab?.title) return;

    if (tab.url.startsWith('about:') || tab.url.startsWith('moz-extension://')) {
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

browser.tabs.onActivated.addListener(async (activeInfo) => {
    const tab = await browser.tabs.get(activeInfo.tabId);
    sendContext(tab);
});

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url && tab.active) {
        sendContext(tab);
    }
});

browser.windows.onFocusChanged.addListener(async (windowId) => {
    if (windowId === browser.windows.WINDOW_ID_NONE) return;

    const [tab] = await browser.tabs.query({ active: true, windowId });
    if (tab) sendContext(tab);
});
