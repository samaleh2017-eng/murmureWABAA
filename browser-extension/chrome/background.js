const MURMURE_API_URL = 'http://127.0.0.1:4800/api/context';
const BROWSER_NAME = 'chrome';

let isEnabled = true;
let lastSentUrl = '';

chrome.storage.local.get(['murmureEnabled'], (result) => {
  isEnabled = result.murmureEnabled !== false;
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.murmureEnabled) {
    isEnabled = changes.murmureEnabled.newValue;
  }
});

async function sendContext(tab) {
  if (!isEnabled || !tab?.url || !tab?.title) return;

  if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
    return;
  }

  if (tab.url === lastSentUrl) return;
  lastSentUrl = tab.url;

  try {
    await fetch(MURMURE_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: tab.url,
        title: tab.title,
        browser: BROWSER_NAME
      })
    });
  } catch (e) {
    console.debug('Murmure not available:', e.message);
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
