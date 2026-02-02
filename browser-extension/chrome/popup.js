const toggle = document.getElementById('enableToggle');
const status = document.getElementById('status');

chrome.storage.local.get(['murmureEnabled'], (result) => {
  toggle.checked = result.murmureEnabled !== false;
});

toggle.addEventListener('change', () => {
  chrome.storage.local.set({ murmureEnabled: toggle.checked });
});

async function checkConnection() {
  try {
    const response = await fetch('http://127.0.0.1:4800/api/context', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: '', title: '', browser: 'chrome' })
    });
    status.textContent = 'Connecté à Murmure ✓';
    status.className = 'status connected';
  } catch (e) {
    status.textContent = 'Murmure non détecté';
    status.className = 'status disconnected';
  }
}

checkConnection();
