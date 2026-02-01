use crate::llm::providers::traits::LLMProviderClient;
use crate::llm::types::{
    GoogleContent, GoogleGenerateRequest, GoogleGenerateResponse, GoogleGenerationConfig,
    GoogleModelsResponse, GooglePart, LLMModel,
};
use async_trait::async_trait;

pub struct GoogleClient {
    url: String,
    api_key: String,
}

impl GoogleClient {
    pub fn new(url: String, api_key: String) -> Self {
        Self { url, api_key }
    }

    fn base_url(&self) -> String {
        self.url.trim_end_matches('/').to_string()
    }
}

#[async_trait]
impl LLMProviderClient for GoogleClient {
    async fn generate(
        &self,
        prompt: &str,
        model: &str,
        temperature: f32,
    ) -> Result<String, String> {
        let client = reqwest::Client::new();
        let url = format!(
            "{}/models/{}:generateContent?key={}",
            self.base_url(),
            model,
            self.api_key
        );

        let request_body = GoogleGenerateRequest {
            contents: vec![GoogleContent {
                parts: vec![GooglePart {
                    text: prompt.to_string(),
                }],
                role: Some("user".to_string()),
            }],
            generation_config: Some(GoogleGenerationConfig {
                temperature: Some(temperature),
                max_output_tokens: Some(4096),
            }),
        };

        let response = client
            .post(&url)
            .header("Content-Type", "application/json")
            .json(&request_body)
            .send()
            .await
            .map_err(|e| format!("Failed to connect to Google Gemini: {}", e))?;

        if !response.status().is_success() {
            let status = response.status();
            let error_body = response.text().await.unwrap_or_default();
            return Err(format!(
                "Google Gemini API error ({}): {}",
                status, error_body
            ));
        }

        let generate_response: GoogleGenerateResponse = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse Google Gemini response: {}", e))?;

        generate_response
            .candidates
            .first()
            .and_then(|c| c.content.parts.first())
            .map(|p| p.text.trim().to_string())
            .ok_or_else(|| "No response from Google Gemini".to_string())
    }

    async fn list_models(&self) -> Result<Vec<LLMModel>, String> {
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
            return Err(format!(
                "Google Gemini API error ({}): {}",
                status, error_body
            ));
        }

        let models_response: GoogleModelsResponse = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;

        let filtered_models: Vec<LLMModel> = models_response
            .models
            .into_iter()
            .filter(|m| {
                m.supported_generation_methods
                    .as_ref()
                    .is_some_and(|methods| methods.contains(&"generateContent".to_string()))
            })
            .map(|m| {
                let name = m.name.trim_start_matches("models/").to_string();
                LLMModel {
                    name,
                    description: m.display_name,
                }
            })
            .collect();

        Ok(filtered_models)
    }

    async fn test_connection(&self) -> Result<bool, String> {
        let client = reqwest::Client::new();
        let url = format!("{}/models?key={}", self.base_url(), self.api_key);

        let response = client
            .get(&url)
            .send()
            .await
            .map_err(|e| format!("Connection failed: {}", e))?;

        if response.status().is_success() {
            Ok(true)
        } else if response.status().as_u16() == 400 || response.status().as_u16() == 401 {
            Err("Invalid API key".to_string())
        } else {
            Err(format!("Server returned error: {}", response.status()))
        }
    }

    fn provider_name(&self) -> &'static str {
        "Google Gemini"
    }
}
