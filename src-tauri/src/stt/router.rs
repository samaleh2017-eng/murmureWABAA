use crate::audio::helpers::read_wav_samples;
use crate::audio::types::AudioState;
use crate::engine::transcription_engine::TranscriptionEngine;
use crate::engine::ParakeetModelParams;
use crate::model::Model;
use crate::stt::providers::{
    GeminiSTTClient, GoogleCloudSTTClient, GroqSTTClient, OpenAISTTClient, STTProviderClient,
};
use crate::stt::settings::load_stt_settings;
use crate::stt::types::{STTMode, STTProvider, STTProviderConfig};
use log::info;
use std::path::Path;
use std::sync::Arc;
use tauri::{AppHandle, Manager};

pub async fn transcribe_audio_with_router(
    app: &AppHandle,
    audio_path: &Path,
) -> Result<String, String> {
    let stt_settings = load_stt_settings(app);

    match stt_settings.mode {
        STTMode::Offline => transcribe_with_parakeet(app, audio_path),
        STTMode::Online => {
            let wav_bytes =
                std::fs::read(audio_path).map_err(|e| format!("Failed to read audio file: {}", e))?;

            let config = stt_settings
                .get_active_provider_config()
                .cloned()
                .unwrap_or_default();

            transcribe_with_cloud(
                &stt_settings.active_provider,
                &config,
                wav_bytes,
                &stt_settings.language,
            )
            .await
        }
    }
}

fn transcribe_with_parakeet(app: &AppHandle, audio_path: &Path) -> Result<String, String> {
    let state = app.state::<AudioState>();

    {
        let mut engine_guard = state.engine.lock();
        if engine_guard.is_none() {
            let model = app.state::<Arc<Model>>();
            let model_path = model
                .get_model_path()
                .map_err(|e| format!("Failed to get model path: {}", e))?;

            let mut new_engine = crate::engine::ParakeetEngine::new();
            new_engine
                .load_model_with_params(&model_path, ParakeetModelParams::int8())
                .map_err(|e| format!("Failed to load model: {}", e))?;

            *engine_guard = Some(new_engine);
            info!("Parakeet model loaded and cached in memory");
        }
    }

    let samples =
        read_wav_samples(audio_path).map_err(|e| format!("Failed to read audio samples: {}", e))?;

    let mut engine_guard = state.engine.lock();
    let engine = engine_guard
        .as_mut()
        .ok_or_else(|| "Engine not loaded".to_string())?;

    let result = engine
        .transcribe_samples(samples, None)
        .map_err(|e| format!("Transcription failed: {}", e))?;

    Ok(result.text)
}

async fn transcribe_with_cloud(
    provider: &STTProvider,
    config: &STTProviderConfig,
    audio_bytes: Vec<u8>,
    language: &str,
) -> Result<String, String> {
    match provider {
        STTProvider::OpenAI => {
            let client =
                OpenAISTTClient::new(config.url.clone(), config.api_key.clone(), config.model.clone());
            client.transcribe(audio_bytes, Some(language)).await
        }
        STTProvider::GoogleCloud => {
            let client = GoogleCloudSTTClient::new(config);
            client.transcribe(audio_bytes, Some(language)).await
        }
        STTProvider::Gemini => {
            let client =
                GeminiSTTClient::new(config.url.clone(), config.api_key.clone(), config.model.clone());
            client.transcribe(audio_bytes, Some(language)).await
        }
        STTProvider::Groq => {
            let client =
                GroqSTTClient::new(config.url.clone(), config.api_key.clone(), config.model.clone());
            client.transcribe(audio_bytes, Some(language)).await
        }
        STTProvider::Parakeet => Err("Parakeet should use offline mode".to_string()),
    }
}

pub async fn test_stt_provider(
    provider: STTProvider,
    config: STTProviderConfig,
) -> Result<bool, String> {
    match provider {
        STTProvider::Parakeet => Ok(true),
        STTProvider::OpenAI => {
            let client =
                OpenAISTTClient::new(config.url.clone(), config.api_key.clone(), config.model.clone());
            client.test_connection().await
        }
        STTProvider::GoogleCloud => {
            let client = GoogleCloudSTTClient::new(&config);
            client.test_connection().await
        }
        STTProvider::Gemini => {
            let client =
                GeminiSTTClient::new(config.url.clone(), config.api_key.clone(), config.model.clone());
            client.test_connection().await
        }
        STTProvider::Groq => {
            let client =
                GroqSTTClient::new(config.url.clone(), config.api_key.clone(), config.model.clone());
            client.test_connection().await
        }
    }
}

pub async fn fetch_stt_models(
    provider: STTProvider,
    config: STTProviderConfig,
) -> Result<Vec<String>, String> {
    match provider {
        STTProvider::Parakeet => Ok(vec!["parakeet-ctc-1.1b".to_string()]),
        STTProvider::OpenAI => {
            let client =
                OpenAISTTClient::new(config.url.clone(), config.api_key.clone(), config.model.clone());
            client.list_models().await
        }
        STTProvider::GoogleCloud => {
            let client = GoogleCloudSTTClient::new(&config);
            client.list_models().await
        }
        STTProvider::Gemini => {
            let client =
                GeminiSTTClient::new(config.url.clone(), config.api_key.clone(), config.model.clone());
            client.list_models().await
        }
        STTProvider::Groq => {
            let client =
                GroqSTTClient::new(config.url.clone(), config.api_key.clone(), config.model.clone());
            client.list_models().await
        }
    }
}

pub fn switch_active_stt_provider(app: &AppHandle, provider: STTProvider) {
    let mut settings = load_stt_settings(app);
    settings.active_provider = provider;
    let _ = crate::stt::settings::save_stt_settings(app, &settings);
}

pub fn switch_stt_mode(app: &AppHandle, mode: STTMode) {
    let mut settings = load_stt_settings(app);
    settings.mode = mode;
    let _ = crate::stt::settings::save_stt_settings(app, &settings);
}

pub fn get_all_stt_providers() -> Vec<STTProvider> {
    vec![
        STTProvider::Parakeet,
        STTProvider::OpenAI,
        STTProvider::GoogleCloud,
        STTProvider::Gemini,
        STTProvider::Groq,
    ]
}
