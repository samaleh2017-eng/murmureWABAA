use crate::llm::providers::traits::LLMProviderClient;
use crate::llm::types::{
    AnthropicMessage, AnthropicMessagesRequest, AnthropicMessagesResponse, LLMModel,
};
use async_trait::async_trait;

pub struct AnthropicClient {
    url: String,
    api_key: String,
}

impl AnthropicClient {
    pub fn new(url: String, api_key: String) -> Self {
        Self { url, api_key }
    }

    fn base_url(&self) -> String {
        self.url.trim_end_matches('/').to_string()
    }

    fn hardcoded_models() -> Vec<LLMModel> {
        vec![
            LLMModel {
                name: "claude-3-5-sonnet-20241022".to_string(),
                description: Some("Claude 3.5 Sonnet - Most intelligent".to_string()),
            },
            LLMModel {
                name: "claude-3-5-haiku-20241022".to_string(),
                description: Some("Claude 3.5 Haiku - Fast and efficient".to_string()),
            },
            LLMModel {
                name: "claude-3-opus-20240229".to_string(),
                description: Some("Claude 3 Opus - Powerful for complex tasks".to_string()),
            },
            LLMModel {
                name: "claude-3-sonnet-20240229".to_string(),
                description: Some("Claude 3 Sonnet - Balanced performance".to_string()),
            },
            LLMModel {
                name: "claude-3-haiku-20240307".to_string(),
                description: Some("Claude 3 Haiku - Fastest".to_string()),
            },
        ]
    }
}

#[async_trait]
impl LLMProviderClient for AnthropicClient {
    async fn generate(
        &self,
        prompt: &str,
        model: &str,
        temperature: f32,
    ) -> Result<String, String> {
        let client = reqwest::Client::new();
        let url = format!("{}/messages", self.base_url());

        let request_body = AnthropicMessagesRequest {
            model: model.to_string(),
            messages: vec![AnthropicMessage {
                role: "user".to_string(),
                content: prompt.to_string(),
            }],
            max_tokens: 4096,
            temperature: Some(temperature),
        };

        let response = client
            .post(&url)
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("Content-Type", "application/json")
            .json(&request_body)
            .send()
            .await
            .map_err(|e| format!("Failed to connect to Anthropic: {}", e))?;

        if !response.status().is_success() {
            let status = response.status();
            let error_body = response.text().await.unwrap_or_default();
            return Err(format!("Anthropic API error ({}): {}", status, error_body));
        }

        let messages_response: AnthropicMessagesResponse = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse Anthropic response: {}", e))?;

        messages_response
            .content
            .first()
            .map(|c| c.text.trim().to_string())
            .ok_or_else(|| "No response from Anthropic".to_string())
    }

    async fn list_models(&self) -> Result<Vec<LLMModel>, String> {
        Ok(Self::hardcoded_models())
    }

    async fn test_connection(&self) -> Result<bool, String> {
        let client = reqwest::Client::new();
        let url = format!("{}/messages", self.base_url());

        let request_body = AnthropicMessagesRequest {
            model: "claude-3-haiku-20240307".to_string(),
            messages: vec![AnthropicMessage {
                role: "user".to_string(),
                content: "Hi".to_string(),
            }],
            max_tokens: 1,
            temperature: Some(0.0),
        };

        let response = client
            .post(&url)
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("Content-Type", "application/json")
            .json(&request_body)
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
        "Anthropic"
    }
}
