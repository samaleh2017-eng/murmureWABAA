use crate::stt::{self, STTMode, STTProvider, STTProviderConfig, STTSettings};
use tauri::{command, AppHandle, Emitter};

#[command]
pub fn get_stt_settings(app: AppHandle) -> Result<STTSettings, String> {
    Ok(stt::load_stt_settings(&app))
}

#[command]
pub fn set_stt_settings(app: AppHandle, settings: STTSettings) -> Result<(), String> {
    stt::save_stt_settings(&app, &settings)?;
    let _ = app.emit("stt-settings-updated", &settings);
    Ok(())
}

#[command]
pub fn get_stt_mode(app: AppHandle) -> Result<STTMode, String> {
    let settings = stt::load_stt_settings(&app);
    Ok(settings.mode)
}

#[command]
pub fn set_stt_mode(app: AppHandle, mode: STTMode) -> Result<(), String> {
    stt::switch_stt_mode(&app, mode);
    let settings = stt::load_stt_settings(&app);
    let _ = app.emit("stt-settings-updated", &settings);
    Ok(())
}

#[command]
pub fn get_active_stt_provider(app: AppHandle) -> Result<STTProvider, String> {
    let settings = stt::load_stt_settings(&app);
    Ok(settings.active_provider)
}

#[command]
pub fn set_active_stt_provider(app: AppHandle, provider: STTProvider) -> Result<(), String> {
    stt::switch_active_stt_provider(&app, provider);
    let settings = stt::load_stt_settings(&app);
    let _ = app.emit("stt-settings-updated", &settings);
    Ok(())
}

#[command]
pub async fn test_stt_provider_connection(
    provider: STTProvider,
    config: STTProviderConfig,
) -> Result<bool, String> {
    stt::test_stt_provider(provider, config).await
}

#[command]
pub async fn fetch_stt_provider_models(
    provider: STTProvider,
    config: STTProviderConfig,
) -> Result<Vec<String>, String> {
    stt::fetch_stt_models(provider, config).await
}

#[command]
pub fn save_stt_provider_config(
    app: AppHandle,
    provider: STTProvider,
    config: STTProviderConfig,
) -> Result<(), String> {
    let mut settings = stt::load_stt_settings(&app);
    let key = stt::provider_to_key(&provider);
    settings.provider_configs.insert(key, config);
    stt::save_stt_settings(&app, &settings)?;
    let _ = app.emit("stt-settings-updated", &settings);
    Ok(())
}

#[command]
pub fn get_stt_provider_config(
    app: AppHandle,
    provider: STTProvider,
) -> Result<Option<STTProviderConfig>, String> {
    let settings = stt::load_stt_settings(&app);
    Ok(settings.get_provider_config(&provider).cloned())
}

#[command]
pub fn get_available_stt_providers() -> Vec<STTProvider> {
    stt::get_all_stt_providers()
}
