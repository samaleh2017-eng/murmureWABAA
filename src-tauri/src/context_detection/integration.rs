use crate::llm::helpers::load_llm_connect_settings;
use crate::llm::types::LLMConnectSettings;
use crate::settings::load_settings;
use log::{debug, info};
use tauri::AppHandle;

use super::context_detection::get_active_context;
use super::mapping::find_matching_mode;

pub fn resolve_mode_index(mode_key: &str, llm_settings: &LLMConnectSettings) -> Option<usize> {
    llm_settings.modes.iter().position(|m| {
        m.key
            .as_ref()
            .map(|k| k.eq_ignore_ascii_case(mode_key))
            .unwrap_or(false)
            || m.name.to_lowercase() == mode_key.to_lowercase()
    })
}

pub fn auto_switch_mode_if_enabled(app: &AppHandle) {
    let settings = load_settings(app);

    if !settings.context_mapping.auto_detection_enabled {
        debug!("Context auto-detection disabled, skipping mode switch");
        return;
    }

    let context = get_active_context();
    info!(
        "Detected context: app={}, process={}, url={:?}",
        context.app_name, context.process_name, context.detected_url
    );

    let target_mode_key = find_matching_mode(&context, &settings.context_mapping);
    debug!("Matched mode key: {}", target_mode_key);

    let llm_settings = load_llm_connect_settings(app);

    let target_index = match resolve_mode_index(&target_mode_key, &llm_settings) {
        Some(idx) => idx,
        None => {
            debug!(
                "Mode key '{}' not found in LLM modes, skipping switch",
                target_mode_key
            );
            return;
        }
    };

    if target_index == llm_settings.active_mode_index {
        debug!(
            "Target mode '{}' (index {}) is already active, skipping switch",
            target_mode_key, target_index
        );
        return;
    }

    if target_index >= llm_settings.modes.len() {
        debug!(
            "Target index {} out of bounds (modes count: {}), skipping switch",
            target_index,
            llm_settings.modes.len()
        );
        return;
    }

    info!(
        "Auto-switching LLM mode from {} to {} (key: '{}', matched context: app={}, process={})",
        llm_settings.active_mode_index,
        target_index,
        target_mode_key,
        context.app_name,
        context.process_name
    );

    crate::llm::switch_active_mode(app, target_index);
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::llm::types::LLMMode;

    fn create_test_settings() -> LLMConnectSettings {
        let mut settings = LLMConnectSettings::default();
        settings.modes = vec![
            LLMMode {
                name: "General".to_string(),
                prompt: String::new(),
                model: "test".to_string(),
                shortcut: String::new(),
                provider: None,
                key: Some("general".to_string()),
            },
            LLMMode {
                name: "Developer".to_string(),
                prompt: String::new(),
                model: "test".to_string(),
                shortcut: String::new(),
                provider: None,
                key: Some("developer".to_string()),
            },
            LLMMode {
                name: "Email".to_string(),
                prompt: String::new(),
                model: "test".to_string(),
                shortcut: String::new(),
                provider: None,
                key: Some("email".to_string()),
            },
        ];
        settings
    }

    #[test]
    fn test_resolve_mode_index_by_key() {
        let settings = create_test_settings();
        assert_eq!(resolve_mode_index("developer", &settings), Some(1));
        assert_eq!(resolve_mode_index("email", &settings), Some(2));
        assert_eq!(resolve_mode_index("general", &settings), Some(0));
    }

    #[test]
    fn test_resolve_mode_index_case_insensitive() {
        let settings = create_test_settings();
        assert_eq!(resolve_mode_index("Developer", &settings), Some(1));
        assert_eq!(resolve_mode_index("DEVELOPER", &settings), Some(1));
    }

    #[test]
    fn test_resolve_mode_index_by_name_fallback() {
        let mut settings = LLMConnectSettings::default();
        settings.modes = vec![LLMMode {
            name: "Custom Mode".to_string(),
            prompt: String::new(),
            model: "test".to_string(),
            shortcut: String::new(),
            provider: None,
            key: None,
        }];
        assert_eq!(resolve_mode_index("custom mode", &settings), Some(0));
    }

    #[test]
    fn test_resolve_mode_index_not_found() {
        let settings = create_test_settings();
        assert_eq!(resolve_mode_index("unknown", &settings), None);
    }
}
