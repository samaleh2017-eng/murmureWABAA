use super::types::BrowserContext;
use once_cell::sync::Lazy;
use parking_lot::RwLock;
use std::collections::HashMap;

#[derive(Clone)]
struct ContextEntry {
    context: BrowserContext,
    is_websocket: bool,
}

static BROWSER_CONTEXTS: Lazy<RwLock<HashMap<String, ContextEntry>>> =
    Lazy::new(|| RwLock::new(HashMap::new()));

pub fn set_browser_context_ws(connection_id: &str, context: BrowserContext) {
    BROWSER_CONTEXTS.write().insert(
        connection_id.to_string(),
        ContextEntry {
            context,
            is_websocket: true,
        },
    );
}

pub fn set_browser_context_http(context: BrowserContext) {
    let mut contexts = BROWSER_CONTEXTS.write();
    let has_websocket = contexts.values().any(|e| e.is_websocket);
    if !has_websocket {
        contexts.insert(
            "http-fallback".to_string(),
            ContextEntry {
                context,
                is_websocket: false,
            },
        );
    }
}

pub fn remove_browser_context(connection_id: &str) {
    BROWSER_CONTEXTS.write().remove(connection_id);
}

pub fn get_browser_context() -> Option<BrowserContext> {
    let contexts = BROWSER_CONTEXTS.read();
    
    if let Some(entry) = contexts.values().find(|e| e.is_websocket) {
        return Some(entry.context.clone());
    }
    
    contexts
        .values()
        .max_by_key(|e| e.context.timestamp)
        .map(|e| e.context.clone())
}

pub fn get_active_connections_count() -> usize {
    BROWSER_CONTEXTS.read().len()
}

pub fn get_websocket_connections_count() -> usize {
    BROWSER_CONTEXTS
        .read()
        .values()
        .filter(|e| e.is_websocket)
        .count()
}
