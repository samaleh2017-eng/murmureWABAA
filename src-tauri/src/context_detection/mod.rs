pub mod browser_state;
pub mod context_detection;
pub mod integration;
pub mod mapping;
pub mod types;

#[cfg(target_os = "linux")]
mod platform_linux;

#[cfg(target_os = "windows")]
mod platform_windows;

#[cfg(target_os = "macos")]
mod platform_macos;

pub use context_detection::get_active_context;
#[allow(unused_imports)]
pub use integration::{auto_switch_mode_if_enabled, resolve_mode_index};
#[allow(unused_imports)]
pub use mapping::{find_matching_mode, ContextMappingSettings, ContextRule, PatternType};
pub use types::{ActiveContext, BrowserContext};
