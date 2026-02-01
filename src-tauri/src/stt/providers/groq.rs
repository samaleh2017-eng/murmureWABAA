use crate::stt::providers::traits::STTProviderClient;
use crate::stt::types::OpenAITranscriptionResponse;
use async_trait::async_trait;
use reqwest::multipart::{Form, Part};

pub struct GroqSTTClient {
    url: String,
    api_key: String,
    model: String,
}

impl GroqSTTClient {
    pub fn new(url: String, api_key: String, model: String) -> Self {
        Self {
            url: url.trim_end_matches('/').to_string(),
            api_key,
            model: if model.is_empty() {
                "whisper-large-v3-turbo".to_string()
            } else {
                model
            },
        }
    }

    fn base_url(&self) -> &str {
        &self.url
    }
}

#[async_trait]
impl STTProviderClient for GroqSTTClient {
    async fn transcribe(
        &self,
        audio_data: Vec<u8>,
        language: Option<&str>,
    ) -> Result<String, String> {
        let client = reqwest::Client::new();
        let url = format!("{}/audio/transcriptions", self.base_url());

        let audio_part = Part::bytes(audio_data)
            .file_name("audio.wav")
            .mime_str("audio/wav")
            .map_err(|e| format!("Failed to create audio part: {}", e))?;

        let mut form = Form::new()
            .part("file", audio_part)
            .text("model", self.model.clone())
            .text("response_format", "json");

        if let Some(lang) = language {
            let lang_code = lang.split('-').next().unwrap_or(lang);
            form = form.text("language", lang_code.to_string());
        }

        let response = client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .multipart(form)
            .send()
            .await
            .map_err(|e| format!("Failed to connect to Groq: {}", e))?;

        if !response.status().is_success() {
            let status = response.status();
            let error_body = response.text().await.unwrap_or_default();
            return Err(format!("Groq API error ({}): {}", status, error_body));
        }

        let transcription_response: OpenAITranscriptionResponse = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse Groq response: {}", e))?;

        Ok(transcription_response.text.trim().to_string())
    }

    async fn list_models(&self) -> Result<Vec<String>, String> {
        Ok(vec![
            "whisper-large-v3".to_string(),
            "whisper-large-v3-turbo".to_string(),
            "distil-whisper-large-v3-en".to_string(),
        ])
    }

    async fn test_connection(&self) -> Result<bool, String> {
        let client = reqwest::Client::new();
        let url = format!("{}/models", self.base_url());

        let response = client
            .get(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .send()
            .await
            .map_err(|e| format!("Connection failed: {}", e))?;

        if response.status().is_success() {
            Ok(true)
        } else if response.status().as_u16() == 401 {
            Err("Invalid API key".to_string())
        } else {
            Err(format!("Server returned error: {}", response.status()))
        }
    }

    fn provider_name(&self) -> &'static str {
        "Groq Whisper"
    }
}
