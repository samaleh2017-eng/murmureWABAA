use crate::dictionary;
use crate::llm::helpers::load_llm_connect_settings;
use crate::llm::providers::{
    AnthropicClient, GoogleClient, LLMProviderClient, OllamaClient, OpenAIClient, OpenRouterClient,
};
use crate::llm::types::{
    LLMModel, LLMProvider, OllamaGenerateRequest, OllamaModel, OllamaOptions, OllamaPullRequest,
    OllamaPullResponse, OllamaTagsResponse, ProviderConfig,
};
use log::warn;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};

fn create_provider_client(
    provider: &LLMProvider,
    config: &ProviderConfig,
) -> Box<dyn LLMProviderClient> {
    match provider {
        LLMProvider::Ollama => Box::new(OllamaClient::new(config.url.clone())),
        LLMProvider::OpenAI => Box::new(OpenAIClient::new(
            config.url.clone(),
            config.api_key.clone(),
        )),
        LLMProvider::Anthropic => Box::new(AnthropicClient::new(
            config.url.clone(),
            config.api_key.clone(),
        )),
        LLMProvider::Google => Box::new(GoogleClient::new(
            config.url.clone(),
            config.api_key.clone(),
        )),
        LLMProvider::OpenRouter => Box::new(OpenRouterClient::new(
            config.url.clone(),
            config.api_key.clone(),
        )),
    }
}

pub async fn post_process_with_llm(
    app: &AppHandle,
    transcription: String,
    force_bypass: bool,
) -> Result<String, String> {
    if force_bypass {
        return Ok(transcription);
    }

    let settings = load_llm_connect_settings(app);

    let active_mode = settings
        .modes
        .get(settings.active_mode_index)
        .ok_or("No active mode selected")?;

    if active_mode.model.is_empty() {
        return Err("No model selected".to_string());
    }

    let provider = active_mode
        .provider
        .clone()
        .unwrap_or_else(|| settings.active_provider.clone());

    let config = settings
        .get_provider_config(&provider)
        .ok_or_else(|| format!("No configuration found for provider: {}", provider))?;

    let _ = app.emit("llm-processing-start", ());

    let dictionary_words = dictionary::load(app)
        .unwrap_or_default()
        .into_keys()
        .collect::<Vec<String>>()
        .join(", ");

    let prompt = active_mode
        .prompt
        .replace("{{TRANSCRIPT}}", &transcription)
        .replace("{transcript}", &transcription)
        .replace("{{DICTIONARY}}", &dictionary_words)
        .replace("{dictionary}", &dictionary_words);

    let client = create_provider_client(&provider, config);

    let result = client.generate(&prompt, &active_mode.model, 0.0).await;

    let _ = app.emit("llm-processing-end", ());

    match result {
        Ok(response) => Ok(response),
        Err(e) => {
            warn!("LLM processing failed, returning original text: {}", e);
            Ok(transcription)
        }
    }
}

pub async fn process_command_with_llm(app: &AppHandle, prompt: String) -> Result<String, String> {
    let settings = load_llm_connect_settings(app);
    let active_mode = settings
        .modes
        .get(settings.active_mode_index)
        .ok_or("No active mode selected")?;

    if active_mode.model.is_empty() {
        return Err("No model selected".to_string());
    }

    let provider = active_mode
        .provider
        .clone()
        .unwrap_or_else(|| settings.active_provider.clone());

    let config = settings
        .get_provider_config(&provider)
        .ok_or_else(|| format!("No configuration found for provider: {}", provider))?;

    let _ = app.emit("llm-processing-start", ());

    let client = create_provider_client(&provider, config);
    let result = client.generate(&prompt, &active_mode.model, 0.0).await;

    let _ = app.emit("llm-processing-end", ());

    result
}

pub async fn test_provider_connection(
    provider: LLMProvider,
    config: ProviderConfig,
) -> Result<bool, String> {
    let client = create_provider_client(&provider, &config);
    client.test_connection().await
}

pub async fn fetch_provider_models(
    provider: LLMProvider,
    config: ProviderConfig,
) -> Result<Vec<LLMModel>, String> {
    let client = create_provider_client(&provider, &config);
    client.list_models().await
}

pub async fn test_ollama_connection(url: String) -> Result<bool, String> {
    let config = ProviderConfig {
        url,
        api_key: String::new(),
        model: String::new(),
        available_models: Vec::new(),
        enabled: true,
    };
    test_provider_connection(LLMProvider::Ollama, config).await
}

pub async fn fetch_ollama_models(url: String) -> Result<Vec<OllamaModel>, String> {
    let client = reqwest::Client::new();
    let tags_url = format!("{}/tags", url.trim_end_matches('/'));

    let response = client
        .get(&tags_url)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch models: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Server returned error: {}", response.status()));
    }

    let tags_response: OllamaTagsResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(tags_response.models)
}

#[tauri::command]
pub async fn pull_ollama_model(app: AppHandle, url: String, model: String) -> Result<(), String> {
    let client = reqwest::Client::new();
    let pull_url = format!("{}/pull", url.trim_end_matches('/'));

    let request_body = OllamaPullRequest {
        model: model.clone(),
        stream: true,
    };

    let mut response = client
        .post(&pull_url)
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Failed to connect to Ollama: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Ollama API returned error: {}", response.status()));
    }

    let mut buffer = String::new();
    while let Some(chunk) = response.chunk().await.map_err(|e| e.to_string())? {
        buffer.push_str(&String::from_utf8_lossy(&chunk));

        while let Some(pos) = buffer.find('\n') {
            let line: String = buffer.drain(..=pos).collect();
            if let Ok(pull_response) = serde_json::from_str::<OllamaPullResponse>(line.trim()) {
                let _ = app.emit("llm-pull-progress", pull_response);
            }
        }
    }

    Ok(())
}

pub async fn warmup_ollama_model(app: &AppHandle) -> Result<(), String> {
    let settings = load_llm_connect_settings(app);

    let active_mode = match settings.modes.get(settings.active_mode_index) {
        Some(mode) => mode,
        None => return Ok(()),
    };

    if active_mode.model.trim().is_empty() {
        return Ok(());
    }

    let provider = active_mode
        .provider
        .clone()
        .unwrap_or_else(|| settings.active_provider.clone());

    if provider != LLMProvider::Ollama {
        return Ok(());
    }

    let config = match settings.get_provider_config(&provider) {
        Some(c) => c,
        None => return Ok(()),
    };

    if config.url.trim().is_empty() {
        return Ok(());
    }

    let client = reqwest::Client::new();
    let url = format!("{}/generate", config.url.trim_end_matches('/'));

    let request_body = OllamaGenerateRequest {
        model: active_mode.model.clone(),
        prompt: " ".to_string(),
        stream: false,
        options: Some(OllamaOptions { temperature: 0.0 }),
    };

    let response = client
        .post(&url)
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Failed to connect to Ollama for warmup: {}", e))?;

    if !response.status().is_success() {
        return Err(format!(
            "Ollama warmup returned error: {}",
            response.status()
        ));
    }

    Ok(())
}

pub fn warmup_ollama_model_background(app: &AppHandle) {
    let app_handle = app.clone();
    tauri::async_runtime::spawn(async move {
        if let Err(e) = warmup_ollama_model(&app_handle).await {
            warn!("LLM warmup failed: {}", e);
        }
    });
}

pub fn switch_active_mode(app: &AppHandle, index: usize) {
    let mut settings = load_llm_connect_settings(app);

    if index < settings.modes.len() && settings.active_mode_index != index {
        settings.active_mode_index = index;
        let mode_name = settings.modes[index].name.clone();

        if crate::llm::helpers::save_llm_connect_settings(app, &settings).is_ok() {
            let _ = app.emit("llm-settings-updated", &settings);
            let _ = app.emit("overlay-feedback", mode_name);
            crate::overlay::overlay::show_recording_overlay(app);
            let app_handle = app.clone();
            std::thread::spawn(move || {
                std::thread::sleep(Duration::from_millis(1000));
                let current_settings = crate::settings::load_settings(&app_handle);
                if current_settings.overlay_mode.as_str() == "always" {
                    return;
                }
                let is_recording = app_handle
                    .state::<crate::audio::types::AudioState>()
                    .recorder
                    .lock()
                    .is_some();
                if !is_recording {
                    crate::overlay::overlay::hide_recording_overlay(&app_handle);
                }
            });
        }
    }
}

pub fn switch_active_provider(app: &AppHandle, provider: LLMProvider) {
    let mut settings = load_llm_connect_settings(app);

    if settings.active_provider != provider {
        settings.active_provider = provider.clone();

        if crate::llm::helpers::save_llm_connect_settings(app, &settings).is_ok() {
            let _ = app.emit("llm-settings-updated", &settings);
            let _ = app.emit("overlay-feedback", format!("Provider: {}", provider));
        }
    }
}
