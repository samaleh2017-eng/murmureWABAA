const toggle = document.getElementById('enableToggle');
const status = document.getElementById('status');

browser.storage.local.get(['murmureEnabled']).then((result) => {
    toggle.checked = result.murmureEnabled !== false;
});

toggle.addEventListener('change', () => {
    browser.storage.local.set({ murmureEnabled: toggle.checked });
});

async function checkConnection() {
    try {
        const ws = new WebSocket('ws://127.0.0.1:4800/ws/context');
        
        ws.onopen = () => {
            status.textContent = 'Connecté à Murmure (WebSocket) ✓';
            status.className = 'status connected';
            ws.close();
        };

        ws.onerror = async () => {
            try {
                await fetch('http://127.0.0.1:4800/api/context', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: '', title: '', browser: 'firefox' })
                });
                status.textContent = 'Connecté à Murmure (HTTP) ✓';
                status.className = 'status connected';
            } catch {
                status.textContent = 'Murmure non détecté';
                status.className = 'status disconnected';
            }
        };

        setTimeout(() => {
            if (ws.readyState !== WebSocket.OPEN && ws.readyState !== WebSocket.CLOSED) {
                ws.close();
                status.textContent = 'Murmure non détecté';
                status.className = 'status disconnected';
            }
        }, 3000);

    } catch {
        status.textContent = 'Murmure non détecté';
        status.className = 'status disconnected';
    }
}

checkConnection();
