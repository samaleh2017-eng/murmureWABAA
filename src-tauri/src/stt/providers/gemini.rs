use crate::stt::providers::traits::STTProviderClient;
use crate::stt::types::{
    GeminiContent, GeminiGenerateResponse, GeminiGenerationConfig, GeminiInlineData,
    GeminiModelsResponse, GeminiPart, GeminiTranscribeRequest,
};
use async_trait::async_trait;
use base64::Engine;

pub struct GeminiSTTClient {
    url: String,
    api_key: String,
    model: String,
}

impl GeminiSTTClient {
    pub fn new(url: String, api_key: String, model: String) -> Self {
        Self {
            url: url.trim_end_matches('/').to_string(),
            api_key,
            model: if model.is_empty() {
                "gemini-2.5-flash".to_string()
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
impl STTProviderClient for GeminiSTTClient {
    async fn transcribe(
        &self,
        audio_data: Vec<u8>,
        language: Option<&str>,
    ) -> Result<String, String> {
        let client = reqwest::Client::new();
        let url = format!(
            "{}/models/{}:generateContent?key={}",
            self.base_url(),
            self.model,
            self.api_key
        );

        let audio_base64 = base64::engine::general_purpose::STANDARD.encode(&audio_data);

        let transcription_prompt = match language {
            Some(lang) => format!(
                "Transcribe the following audio to text. The language is {}. \
                 Return ONLY the transcription, no explanations or formatting.",
                lang
            ),
            None => "Transcribe the following audio to text. \
                     Return ONLY the transcription, no explanations or formatting."
                .to_string(),
        };

        let request_body = GeminiTranscribeRequest {
            contents: vec![GeminiContent {
                parts: vec![
                    GeminiPart::Text {
                        text: transcription_prompt,
                    },
                    GeminiPart::InlineData {
                        inline_data: GeminiInlineData {
                            mime_type: "audio/wav".to_string(),
                            data: audio_base64,
                        },
                    },
                ],
            }],
            generation_config: Some(GeminiGenerationConfig {
                temperature: Some(0.0),
                max_output_tokens: Some(8192),
            }),
        };

        let response = client
            .post(&url)
            .header("Content-Type", "application/json")
            .json(&request_body)
            .send()
            .await
            .map_err(|e| format!("Failed to connect to Gemini: {}", e))?;

        if !response.status().is_success() {
            let status = response.status();
            let error_body = response.text().await.unwrap_or_default();
            return Err(format!("Gemini API error ({}): {}", status, error_body));
        }

        let generate_response: GeminiGenerateResponse = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse Gemini response: {}", e))?;

        generate_response
            .candidates
            .as_ref()
            .and_then(|c| c.first())
            .and_then(|c| c.content.parts.as_ref())
            .and_then(|p| p.first())
            .map(|p| p.text.trim().to_string())
            .ok_or_else(|| "No transcription from Gemini".to_string())
    }

    async fn list_models(&self) -> Result<Vec<String>, String> {
        let client = reqwest::Client::new();
        let url = format!("{}/models?key={}", self.base_url(), self.api_key);

        let response = client
            .get(&url)
            .send()
            .await
            .map_err(|e| format!("Failed to fetch models: {}", e))?;

        if !response.status().is_success() {
            let status = response.status();
            let error_body = response.text().await.unwrap_or_default();
            return Err(format!("Gemini API error ({}): {}", status, error_body));
        }

        let models_response: GeminiModelsResponse = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;

        let filtered_models: Vec<String> = models_response
            .models
            .unwrap_or_default()
            .into_iter()
            .filter(|m| {
                m.supported_generation_methods
                    .as_ref()
                    .is_some_and(|methods| methods.contains(&"generateContent".to_string()))
            })
            .filter(|m| {
                let name = m.name.trim_start_matches("models/");
                name.starts_with("gemini-2") || name.starts_with("gemini-3")
            })
            .map(|m| m.name.trim_start_matches("models/").to_string())
            .collect();

        Ok(filtered_models)
    }

    async fn test_connection(&self) -> Result<bool, String> {
        match self.list_models().await {
            Ok(models) => Ok(!models.is_empty()),
            Err(e) => Err(e),
        }
    }

    fn provider_name(&self) -> &'static str {
        "Google Gemini"
    }
}
