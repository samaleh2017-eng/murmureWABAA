use crate::context_detection::{get_active_context, ActiveContext};

#[tauri::command]
pub fn get_current_context() -> ActiveContext {
    get_active_context()
}
