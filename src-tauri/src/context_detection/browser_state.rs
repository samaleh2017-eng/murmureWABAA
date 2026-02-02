use super::types::BrowserContext;
use once_cell::sync::Lazy;
use parking_lot::RwLock;

static BROWSER_CONTEXT: Lazy<RwLock<Option<BrowserContext>>> = Lazy::new(|| RwLock::new(None));

pub fn set_browser_context(context: BrowserContext) {
    *BROWSER_CONTEXT.write() = Some(context);
}

pub fn get_browser_context() -> Option<BrowserContext> {
    BROWSER_CONTEXT.read().clone()
}

pub fn clear_browser_context() {
    *BROWSER_CONTEXT.write() = None;
}
