use super::types::BrowserContext;
use once_cell::sync::Lazy;
use parking_lot::RwLock;
use std::time::{SystemTime, UNIX_EPOCH};

static BROWSER_CONTEXT: Lazy<RwLock<Option<BrowserContext>>> = Lazy::new(|| RwLock::new(None));

const CONTEXT_TTL_MS: u64 = 30000;

pub fn set_browser_context(context: BrowserContext) {
    *BROWSER_CONTEXT.write() = Some(context);
}

pub fn get_browser_context() -> Option<BrowserContext> {
    let ctx = BROWSER_CONTEXT.read().clone()?;

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis() as u64;

    if now - ctx.timestamp > CONTEXT_TTL_MS {
        return None;
    }

    Some(ctx)
}
