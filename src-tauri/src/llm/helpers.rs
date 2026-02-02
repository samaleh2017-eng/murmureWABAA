use crate::llm::types::LLMConnectSettings;
use std::{fs, path::PathBuf};
use tauri::{AppHandle, Manager};

fn llm_connect_settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    if let Err(e) = fs::create_dir_all(&dir) {
        return Err(format!("create_dir_all failed: {}", e));
    }
    Ok(dir.join("llm_connect.json"))
}

fn create_default_modes(base_prompt: &str, base_model: &str) -> Vec<crate::llm::types::LLMMode> {
    vec![
        crate::llm::types::LLMMode {
            name: "Général".to_string(),
            prompt: base_prompt.to_string(),
            model: base_model.to_string(),
            shortcut: "Ctrl+Shift+1".to_string(),
            provider: None,
            key: Some("general".to_string()),
        },
        crate::llm::types::LLMMode {
            name: "Developer".to_string(),
            prompt: base_prompt.to_string(),
            model: base_model.to_string(),
            shortcut: "Ctrl+Shift+2".to_string(),
            provider: None,
            key: Some("developer".to_string()),
        },
        crate::llm::types::LLMMode {
            name: "Email".to_string(),
            prompt: base_prompt.to_string(),
            model: base_model.to_string(),
            shortcut: "Ctrl+Shift+3".to_string(),
            provider: None,
            key: Some("email".to_string()),
        },
        crate::llm::types::LLMMode {
            name: "Chat".to_string(),
            prompt: base_prompt.to_string(),
            model: base_model.to_string(),
            shortcut: "Ctrl+Shift+4".to_string(),
            provider: None,
            key: Some("chat".to_string()),
        },
    ]
}

pub fn load_llm_connect_settings(app: &AppHandle) -> LLMConnectSettings {
    let path = match llm_connect_settings_path(app) {
        Ok(p) => p,
        Err(_) => return LLMConnectSettings::default(),
    };

    let mut settings = match fs::read_to_string(&path) {
        Ok(content) => serde_json::from_str::<LLMConnectSettings>(&content).unwrap_or_default(),
        Err(_) => {
            let defaults = LLMConnectSettings::default();
            let _ = save_llm_connect_settings(app, &defaults);
            defaults
        }
    };

    settings.ensure_provider_configs();

    if settings.modes.is_empty() {
        settings.modes = create_default_modes(&settings.prompt, &settings.model);
        settings.active_mode_index = 0;
        settings.prompt = String::new();
        let _ = save_llm_connect_settings(app, &settings);
    }

    settings
}

pub fn save_llm_connect_settings(
    app: &AppHandle,
    settings: &LLMConnectSettings,
) -> Result<(), String> {
    let path = llm_connect_settings_path(app)?;
    let content = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    fs::write(path, content).map_err(|e| e.to_string())
}
