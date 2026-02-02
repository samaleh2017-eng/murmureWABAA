pub mod context_detection;
pub mod types;

#[cfg(target_os = "linux")]
mod platform_linux;

#[cfg(target_os = "windows")]
mod platform_windows;

#[cfg(target_os = "macos")]
mod platform_macos;

pub use context_detection::get_active_context;
pub use types::ActiveContext;
