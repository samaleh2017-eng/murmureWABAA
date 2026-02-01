use crate::llm::providers::traits::LLMProviderClient;
use crate::llm::types::{
    LLMModel, OllamaGenerateRequest, OllamaGenerateResponse, OllamaOptions, OllamaTagsResponse,
};
use async_trait::async_trait;

pub struct OllamaClient {
    url: String,
}

impl OllamaClient {
    pub fn new(url: String) -> Self {
        Self { url }
    }

    fn base_url(&self) -> String {
        self.url.trim_end_matches('/').to_string()
    }
}

#[async_trait]
impl LLMProviderClient for OllamaClient {
    async fn generate(
        &self,
        prompt: &str,
        model: &str,
        temperature: f32,
    ) -> Result<String, String> {
        let client = reqwest::Client::new();
        let url = format!("{}/generate", self.base_url());

        let request_body = OllamaGenerateRequest {
            model: model.to_string(),
            prompt: prompt.to_string(),
            stream: false,
            options: Some(OllamaOptions { temperature }),
        };

        let response = client
            .post(&url)
            .json(&request_body)
            .send()
            .await
            .map_err(|e| format!("Failed to connect to Ollama: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("Ollama API returned error: {}", response.status()));
        }

        let ollama_response: OllamaGenerateResponse = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse Ollama response: {}", e))?;

        Ok(ollama_response.response.trim().to_string())
    }

    async fn list_models(&self) -> Result<Vec<LLMModel>, String> {
        let client = reqwest::Client::new();
        let url = format!("{}/tags", self.base_url());

        let response = client
            .get(&url)
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

        Ok(tags_response
            .models
            .into_iter()
            .map(|m| LLMModel {
                name: m.name,
                description: None,
            })
            .collect())
    }

    async fn test_connection(&self) -> Result<bool, String> {
        let client = reqwest::Client::new();
        let url = format!("{}/tags", self.base_url());

        let response = client
            .get(&url)
            .send()
            .await
            .map_err(|e| format!("Connection failed: {}", e))?;

        if response.status().is_success() {
            Ok(true)
        } else {
            Err(format!("Server returned error: {}", response.status()))
        }
    }

    fn provider_name(&self) -> &'static str {
        "Ollama"
    }
}
