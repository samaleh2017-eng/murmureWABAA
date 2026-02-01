use crate::llm::providers::traits::LLMProviderClient;
use crate::llm::types::{
    LLMModel, OpenAIChatMessage, OpenAIChatRequest, OpenAIChatResponse, OpenRouterModelsResponse,
};
use async_trait::async_trait;

pub struct OpenRouterClient {
    url: String,
    api_key: String,
}

impl OpenRouterClient {
    pub fn new(url: String, api_key: String) -> Self {
        Self { url, api_key }
    }

    fn base_url(&self) -> String {
        self.url.trim_end_matches('/').to_string()
    }
}

#[async_trait]
impl LLMProviderClient for OpenRouterClient {
    async fn generate(
        &self,
        prompt: &str,
        model: &str,
        temperature: f32,
    ) -> Result<String, String> {
        let client = reqwest::Client::new();
        let url = format!("{}/chat/completions", self.base_url());

        let request_body = OpenAIChatRequest {
            model: model.to_string(),
            messages: vec![OpenAIChatMessage {
                role: "user".to_string(),
                content: prompt.to_string(),
            }],
            temperature: Some(temperature),
            max_tokens: None,
        };

        let response = client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .header("HTTP-Referer", "https://murmure.ai")
            .header("X-Title", "Murmure")
            .json(&request_body)
            .send()
            .await
            .map_err(|e| format!("Failed to connect to OpenRouter: {}", e))?;

        if !response.status().is_success() {
            let status = response.status();
            let error_body = response.text().await.unwrap_or_default();
            return Err(format!("OpenRouter API error ({}): {}", status, error_body));
        }

        let chat_response: OpenAIChatResponse = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse OpenRouter response: {}", e))?;

        chat_response
            .choices
            .first()
            .map(|c| c.message.content.trim().to_string())
            .ok_or_else(|| "No response from OpenRouter".to_string())
    }

    async fn list_models(&self) -> Result<Vec<LLMModel>, String> {
        let client = reqwest::Client::new();
        let url = format!("{}/models", self.base_url());

        let response = client
            .get(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .send()
            .await
            .map_err(|e| format!("Failed to fetch models: {}", e))?;

        if !response.status().is_success() {
            let status = response.status();
            let error_body = response.text().await.unwrap_or_default();
            return Err(format!("OpenRouter API error ({}): {}", status, error_body));
        }

        let models_response: OpenRouterModelsResponse = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;

        let models: Vec<LLMModel> = models_response
            .data
            .into_iter()
            .map(|m| LLMModel {
                name: m.id,
                description: m.name,
            })
            .collect();

        Ok(models)
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
        "OpenRouter"
    }
}
