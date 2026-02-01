use crate::llm::{self, LLMConnectSettings, LLMModel, LLMProvider, OllamaModel, ProviderConfig};
use tauri::{command, AppHandle, Emitter};

#[command]
pub fn get_llm_connect_settings(app: AppHandle) -> Result<LLMConnectSettings, String> {
    Ok(llm::load_llm_connect_settings(&app))
}

#[command]
pub fn set_llm_connect_settings(
    app: AppHandle,
    settings: LLMConnectSettings,
) -> Result<(), String> {
    llm::save_llm_connect_settings(&app, &settings)?;
    let _ = app.emit("llm-settings-updated", &settings);
    Ok(())
}

#[command]
pub async fn test_llm_connection(url: String) -> Result<bool, String> {
    llm::test_ollama_connection(url).await
}

#[command]
pub async fn fetch_ollama_models(url: String) -> Result<Vec<OllamaModel>, String> {
    llm::fetch_ollama_models(url).await
}

#[command]
pub async fn test_provider_connection(
    provider: LLMProvider,
    config: ProviderConfig,
) -> Result<bool, String> {
    llm::test_provider_connection(provider, config).await
}

#[command]
pub async fn fetch_provider_models(
    provider: LLMProvider,
    config: ProviderConfig,
) -> Result<Vec<LLMModel>, String> {
    llm::fetch_provider_models(provider, config).await
}

#[command]
pub fn set_active_provider(app: AppHandle, provider: LLMProvider) -> Result<(), String> {
    llm::switch_active_provider(&app, provider);
    Ok(())
}

#[command]
pub fn save_provider_config(
    app: AppHandle,
    provider: LLMProvider,
    config: ProviderConfig,
) -> Result<(), String> {
    let mut settings = llm::load_llm_connect_settings(&app);
    let key = llm::provider_to_key(&provider);
    settings.provider_configs.insert(key, config);
    llm::save_llm_connect_settings(&app, &settings)?;
    let _ = app.emit("llm-settings-updated", &settings);
    Ok(())
}

#[command]
pub fn get_provider_config(
    app: AppHandle,
    provider: LLMProvider,
) -> Result<Option<ProviderConfig>, String> {
    let settings = llm::load_llm_connect_settings(&app);
    Ok(settings.get_provider_config(&provider).cloned())
}

#[command]
pub fn get_available_providers() -> Vec<LLMProvider> {
    vec![
        LLMProvider::Ollama,
        LLMProvider::OpenAI,
        LLMProvider::Anthropic,
        LLMProvider::Google,
        LLMProvider::OpenRouter,
    ]
}
