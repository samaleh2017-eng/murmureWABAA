use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, Hash, Default)]
#[serde(rename_all = "lowercase")]
pub enum LLMProvider {
    #[default]
    Ollama,
    OpenAI,
    Anthropic,
    Google,
    OpenRouter,
}

impl std::fmt::Display for LLMProvider {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            LLMProvider::Ollama => write!(f, "Ollama"),
            LLMProvider::OpenAI => write!(f, "OpenAI"),
            LLMProvider::Anthropic => write!(f, "Anthropic"),
            LLMProvider::Google => write!(f, "Google Gemini"),
            LLMProvider::OpenRouter => write!(f, "OpenRouter"),
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(default)]
pub struct ProviderConfig {
    pub url: String,
    #[serde(skip_serializing_if = "String::is_empty")]
    pub api_key: String,
    #[serde(skip_serializing_if = "String::is_empty")]
    pub model: String,
    pub available_models: Vec<String>,
    pub enabled: bool,
}

impl Default for ProviderConfig {
    fn default() -> Self {
        Self {
            url: String::new(),
            api_key: String::new(),
            model: String::new(),
            available_models: Vec::new(),
            enabled: true,
        }
    }
}

impl ProviderConfig {
    pub fn ollama_default() -> Self {
        Self {
            url: "http://localhost:11434/api".to_string(),
            api_key: String::new(),
            model: String::new(),
            available_models: Vec::new(),
            enabled: true,
        }
    }

    pub fn openai_default() -> Self {
        Self {
            url: "https://api.openai.com/v1".to_string(),
            api_key: String::new(),
            model: String::new(),
            available_models: Vec::new(),
            enabled: true,
        }
    }

    pub fn anthropic_default() -> Self {
        Self {
            url: "https://api.anthropic.com/v1".to_string(),
            api_key: String::new(),
            model: String::new(),
            available_models: vec![
                "claude-3-5-sonnet-20241022".to_string(),
                "claude-3-5-haiku-20241022".to_string(),
                "claude-3-opus-20240229".to_string(),
                "claude-3-sonnet-20240229".to_string(),
                "claude-3-haiku-20240307".to_string(),
            ],
            enabled: true,
        }
    }

    pub fn google_default() -> Self {
        Self {
            url: "https://generativelanguage.googleapis.com/v1beta".to_string(),
            api_key: String::new(),
            model: String::new(),
            available_models: Vec::new(),
            enabled: true,
        }
    }

    pub fn openrouter_default() -> Self {
        Self {
            url: "https://openrouter.ai/api/v1".to_string(),
            api_key: String::new(),
            model: String::new(),
            available_models: Vec::new(),
            enabled: true,
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(default)]
pub struct LLMConnectSettings {
    #[serde(skip_serializing_if = "String::is_empty")]
    pub url: String,
    #[serde(skip_serializing_if = "String::is_empty")]
    pub model: String,
    #[serde(skip_serializing_if = "String::is_empty")]
    pub prompt: String,
    pub modes: Vec<LLMMode>,
    pub active_mode_index: usize,
    pub onboarding_completed: bool,
    pub active_provider: LLMProvider,
    pub provider_configs: HashMap<String, ProviderConfig>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct LLMMode {
    pub name: String,
    pub prompt: String,
    pub model: String,
    pub shortcut: String,
    #[serde(default)]
    pub provider: Option<LLMProvider>,
    #[serde(default)]
    pub key: Option<String>,
}

impl Default for LLMConnectSettings {
    fn default() -> Self {
        let mut provider_configs = HashMap::new();
        provider_configs.insert("ollama".to_string(), ProviderConfig::ollama_default());
        provider_configs.insert("openai".to_string(), ProviderConfig::openai_default());
        provider_configs.insert("anthropic".to_string(), ProviderConfig::anthropic_default());
        provider_configs.insert("google".to_string(), ProviderConfig::google_default());
        provider_configs.insert(
            "openrouter".to_string(),
            ProviderConfig::openrouter_default(),
        );

        Self {
            url: "http://localhost:11434/api".to_string(),
            model: String::new(),
            prompt: String::new(),
            modes: Vec::new(),
            active_mode_index: 0,
            onboarding_completed: false,
            active_provider: LLMProvider::Ollama,
            provider_configs,
        }
    }
}

#[allow(dead_code)]
impl LLMConnectSettings {
    pub fn get_active_provider_config(&self) -> Option<&ProviderConfig> {
        let key = provider_to_key(&self.active_provider);
        self.provider_configs.get(&key)
    }

    pub fn get_provider_config(&self, provider: &LLMProvider) -> Option<&ProviderConfig> {
        let key = provider_to_key(provider);
        self.provider_configs.get(&key)
    }

    pub fn get_provider_config_mut(
        &mut self,
        provider: &LLMProvider,
    ) -> Option<&mut ProviderConfig> {
        let key = provider_to_key(provider);
        self.provider_configs.get_mut(&key)
    }

    pub fn ensure_provider_configs(&mut self) {
        if !self.provider_configs.contains_key("ollama") {
            self.provider_configs
                .insert("ollama".to_string(), ProviderConfig::ollama_default());
        }
        if !self.provider_configs.contains_key("openai") {
            self.provider_configs
                .insert("openai".to_string(), ProviderConfig::openai_default());
        }
        if !self.provider_configs.contains_key("anthropic") {
            self.provider_configs
                .insert("anthropic".to_string(), ProviderConfig::anthropic_default());
        }
        if !self.provider_configs.contains_key("google") {
            self.provider_configs
                .insert("google".to_string(), ProviderConfig::google_default());
        }
        if !self.provider_configs.contains_key("openrouter") {
            self.provider_configs.insert(
                "openrouter".to_string(),
                ProviderConfig::openrouter_default(),
            );
        }

        if self.provider_configs.contains_key("ollama") && !self.url.is_empty() {
            if let Some(config) = self.provider_configs.get_mut("ollama") {
                if config.url.is_empty() || config.url == "http://localhost:11434/api" {
                    config.url = self.url.clone();
                }
            }
        }
    }
}

pub fn provider_to_key(provider: &LLMProvider) -> String {
    match provider {
        LLMProvider::Ollama => "ollama".to_string(),
        LLMProvider::OpenAI => "openai".to_string(),
        LLMProvider::Anthropic => "anthropic".to_string(),
        LLMProvider::Google => "google".to_string(),
        LLMProvider::OpenRouter => "openrouter".to_string(),
    }
}

#[allow(dead_code)]
pub fn key_to_provider(key: &str) -> Option<LLMProvider> {
    match key {
        "ollama" => Some(LLMProvider::Ollama),
        "openai" => Some(LLMProvider::OpenAI),
        "anthropic" => Some(LLMProvider::Anthropic),
        "google" => Some(LLMProvider::Google),
        "openrouter" => Some(LLMProvider::OpenRouter),
        _ => None,
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct LLMModel {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct OllamaGenerateRequest {
    pub model: String,
    pub prompt: String,
    pub stream: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub options: Option<OllamaOptions>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct OllamaOptions {
    pub temperature: f32,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct OllamaGenerateResponse {
    pub response: String,
    pub done: bool,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct OllamaTagsResponse {
    pub models: Vec<OllamaModel>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct OllamaModel {
    pub name: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct OllamaPullRequest {
    pub model: String,
    pub stream: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct OllamaPullResponse {
    pub status: String,
    pub digest: Option<String>,
    pub total: Option<u64>,
    pub completed: Option<u64>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct OpenAIChatRequest {
    pub model: String,
    pub messages: Vec<OpenAIChatMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_tokens: Option<u32>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct OpenAIChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct OpenAIChatResponse {
    pub choices: Vec<OpenAIChatChoice>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct OpenAIChatChoice {
    pub message: OpenAIChatMessage,
    pub finish_reason: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct OpenAIModelsResponse {
    pub data: Vec<OpenAIModelInfo>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct OpenAIModelInfo {
    pub id: String,
    #[serde(default)]
    pub owned_by: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct AnthropicMessagesRequest {
    pub model: String,
    pub messages: Vec<AnthropicMessage>,
    pub max_tokens: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f32>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AnthropicMessage {
    pub role: String,
    pub content: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct AnthropicMessagesResponse {
    pub content: Vec<AnthropicContent>,
    pub stop_reason: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct AnthropicContent {
    #[serde(rename = "type")]
    pub content_type: String,
    pub text: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GoogleGenerateRequest {
    pub contents: Vec<GoogleContent>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub generation_config: Option<GoogleGenerationConfig>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct GoogleContent {
    pub parts: Vec<GooglePart>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub role: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct GooglePart {
    pub text: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GoogleGenerationConfig {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_output_tokens: Option<u32>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GoogleGenerateResponse {
    pub candidates: Vec<GoogleCandidate>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GoogleCandidate {
    pub content: GoogleContent,
    #[serde(rename = "finishReason")]
    pub finish_reason: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GoogleModelsResponse {
    pub models: Vec<GoogleModelInfo>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GoogleModelInfo {
    pub name: String,
    #[serde(rename = "displayName")]
    pub display_name: Option<String>,
    #[serde(rename = "supportedGenerationMethods")]
    pub supported_generation_methods: Option<Vec<String>>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct OpenRouterModelsResponse {
    pub data: Vec<OpenRouterModelInfo>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct OpenRouterModelInfo {
    pub id: String,
    pub name: Option<String>,
}
