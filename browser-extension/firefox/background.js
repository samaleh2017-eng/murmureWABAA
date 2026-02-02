const MURMURE_API_URL = 'http://127.0.0.1:4800/api/context';
const BROWSER_NAME = 'firefox';

let isEnabled = true;
let lastSentUrl = '';

browser.storage.local.get(['murmureEnabled']).then((result) => {
  isEnabled = result.murmureEnabled !== false;
});

browser.storage.onChanged.addListener((changes) => {
  if (changes.murmureEnabled) {
    isEnabled = changes.murmureEnabled.newValue;
  }
});

async function sendContext(tab) {
  if (!isEnabled || !tab?.url || !tab?.title) return;

  if (tab.url.startsWith('about:') || tab.url.startsWith('moz-extension://')) {
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

  const tabs = await browser.tabs.query({ active: true, windowId });
  if (tabs[0]) sendContext(tabs[0]);
});
