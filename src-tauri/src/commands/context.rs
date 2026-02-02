use crate::context_detection::{get_active_context, ActiveContext, ContextMappingSettings};
use tauri::AppHandle;

#[tauri::command]
pub fn get_current_context() -> ActiveContext {
    get_active_context()
}

#[tauri::command]
pub fn get_context_mapping_settings(app: AppHandle) -> ContextMappingSettings {
    let settings = crate::settings::load_settings(&app);
    settings.context_mapping
}

#[tauri::command]
pub fn save_context_mapping_settings(
    app: AppHandle,
    mapping: ContextMappingSettings,
) -> Result<(), String> {
    let mut settings = crate::settings::load_settings(&app);
    settings.context_mapping = mapping;
    crate::settings::save_settings(&app, &settings)
}
