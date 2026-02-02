use super::types::BrowserContext;
use once_cell::sync::Lazy;
use parking_lot::RwLock;
use std::collections::HashMap;

static BROWSER_CONTEXTS: Lazy<RwLock<HashMap<String, BrowserContext>>> =
    Lazy::new(|| RwLock::new(HashMap::new()));

pub fn set_browser_context(connection_id: &str, context: BrowserContext) {
    BROWSER_CONTEXTS
        .write()
        .insert(connection_id.to_string(), context);
}

pub fn remove_browser_context(connection_id: &str) {
    BROWSER_CONTEXTS.write().remove(connection_id);
}

pub fn get_browser_context() -> Option<BrowserContext> {
    let contexts = BROWSER_CONTEXTS.read();
    contexts.values().next().cloned()
}

pub fn get_active_connections_count() -> usize {
    BROWSER_CONTEXTS.read().len()
}
