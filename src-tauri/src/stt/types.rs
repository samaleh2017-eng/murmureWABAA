use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, Hash, Default)]
#[serde(rename_all = "lowercase")]
pub enum STTProvider {
    #[default]
    Parakeet,
    OpenAI,
    #[serde(rename = "google_cloud")]
    GoogleCloud,
    Gemini,
    Groq,
}

impl std::fmt::Display for STTProvider {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            STTProvider::Parakeet => write!(f, "Parakeet (Local)"),
            STTProvider::OpenAI => write!(f, "OpenAI Whisper"),
            STTProvider::GoogleCloud => write!(f, "Google Cloud STT"),
            STTProvider::Gemini => write!(f, "Google Gemini"),
            STTProvider::Groq => write!(f, "Groq Whisper"),
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, Default)]
#[serde(rename_all = "lowercase")]
pub enum STTMode {
    #[default]
    Offline,
    Online,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, Default)]
#[serde(rename_all = "snake_case")]
pub enum GoogleAuthMethod {
    #[default]
    ApiKey,
    ServiceAccount,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(default)]
pub struct STTProviderConfig {
    pub url: String,
    #[serde(skip_serializing_if = "String::is_empty")]
    pub api_key: String,
    #[serde(skip_serializing_if = "String::is_empty")]
    pub model: String,
    pub available_models: Vec<String>,
    pub enabled: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub google_project_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub google_auth_method: Option<GoogleAuthMethod>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub google_service_account_json: Option<String>,
}

impl Default for STTProviderConfig {
    fn default() -> Self {
        Self {
            url: String::new(),
            api_key: String::new(),
            model: String::new(),
            available_models: Vec::new(),
            enabled: true,
            google_project_id: None,
            google_auth_method: None,
            google_service_account_json: None,
        }
    }
}

impl STTProviderConfig {
    pub fn parakeet_default() -> Self {
        Self {
            url: String::new(),
            api_key: String::new(),
            model: String::new(),
            available_models: Vec::new(),
            enabled: true,
            google_project_id: None,
            google_auth_method: None,
            google_service_account_json: None,
        }
    }

    pub fn openai_default() -> Self {
        Self {
            url: "https://api.openai.com/v1".to_string(),
            api_key: String::new(),
            model: "whisper-1".to_string(),
            available_models: vec!["whisper-1".to_string()],
            enabled: true,
            google_project_id: None,
            google_auth_method: None,
            google_service_account_json: None,
        }
    }

    pub fn google_cloud_default() -> Self {
        Self {
            url: "https://speech.googleapis.com/v2".to_string(),
            api_key: String::new(),
            model: "chirp_3".to_string(),
            available_models: vec![
                "chirp_3".to_string(),
                "chirp_2".to_string(),
                "long".to_string(),
                "short".to_string(),
            ],
            enabled: true,
            google_project_id: None,
            google_auth_method: Some(GoogleAuthMethod::ApiKey),
            google_service_account_json: None,
        }
    }

    pub fn gemini_default() -> Self {
        Self {
            url: "https://generativelanguage.googleapis.com/v1beta".to_string(),
            api_key: String::new(),
            model: "gemini-2.5-flash".to_string(),
            available_models: vec![
                "gemini-2.5-flash".to_string(),
                "gemini-2.5-flash-lite".to_string(),
                "gemini-2.0-flash".to_string(),
                "gemini-2.0-flash-lite".to_string(),
            ],
            enabled: true,
            google_project_id: None,
            google_auth_method: None,
            google_service_account_json: None,
        }
    }

    pub fn groq_default() -> Self {
        Self {
            url: "https://api.groq.com/openai/v1".to_string(),
            api_key: String::new(),
            model: "whisper-large-v3-turbo".to_string(),
            available_models: vec![
                "whisper-large-v3".to_string(),
                "whisper-large-v3-turbo".to_string(),
                "distil-whisper-large-v3-en".to_string(),
            ],
            enabled: true,
            google_project_id: None,
            google_auth_method: None,
            google_service_account_json: None,
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(default)]
pub struct STTSettings {
    pub mode: STTMode,
    pub active_provider: STTProvider,
    pub provider_configs: HashMap<String, STTProviderConfig>,
    pub language: String,
}

impl Default for STTSettings {
    fn default() -> Self {
        let mut provider_configs = HashMap::new();
        provider_configs.insert("parakeet".to_string(), STTProviderConfig::parakeet_default());
        provider_configs.insert("openai".to_string(), STTProviderConfig::openai_default());
        provider_configs.insert(
            "google_cloud".to_string(),
            STTProviderConfig::google_cloud_default(),
        );
        provider_configs.insert("gemini".to_string(), STTProviderConfig::gemini_default());
        provider_configs.insert("groq".to_string(), STTProviderConfig::groq_default());

        Self {
            mode: STTMode::Offline,
            active_provider: STTProvider::Parakeet,
            provider_configs,
            language: "fr-FR".to_string(),
        }
    }
}

impl STTSettings {
    pub fn get_active_provider_config(&self) -> Option<&STTProviderConfig> {
        let key = provider_to_key(&self.active_provider);
        self.provider_configs.get(&key)
    }

    pub fn get_provider_config(&self, provider: &STTProvider) -> Option<&STTProviderConfig> {
        let key = provider_to_key(provider);
        self.provider_configs.get(&key)
    }

    pub fn get_provider_config_mut(
        &mut self,
        provider: &STTProvider,
    ) -> Option<&mut STTProviderConfig> {
        let key = provider_to_key(provider);
        self.provider_configs.get_mut(&key)
    }

    pub fn ensure_provider_configs(&mut self) {
        if !self.provider_configs.contains_key("parakeet") {
            self.provider_configs
                .insert("parakeet".to_string(), STTProviderConfig::parakeet_default());
        }
        if !self.provider_configs.contains_key("openai") {
            self.provider_configs
                .insert("openai".to_string(), STTProviderConfig::openai_default());
        }
        if !self.provider_configs.contains_key("google_cloud") {
            self.provider_configs.insert(
                "google_cloud".to_string(),
                STTProviderConfig::google_cloud_default(),
            );
        }
        if !self.provider_configs.contains_key("gemini") {
            self.provider_configs
                .insert("gemini".to_string(), STTProviderConfig::gemini_default());
        }
        if !self.provider_configs.contains_key("groq") {
            self.provider_configs
                .insert("groq".to_string(), STTProviderConfig::groq_default());
        }
    }
}

pub fn provider_to_key(provider: &STTProvider) -> String {
    match provider {
        STTProvider::Parakeet => "parakeet".to_string(),
        STTProvider::OpenAI => "openai".to_string(),
        STTProvider::GoogleCloud => "google_cloud".to_string(),
        STTProvider::Gemini => "gemini".to_string(),
        STTProvider::Groq => "groq".to_string(),
    }
}

#[allow(dead_code)]
pub fn key_to_provider(key: &str) -> Option<STTProvider> {
    match key {
        "parakeet" => Some(STTProvider::Parakeet),
        "openai" => Some(STTProvider::OpenAI),
        "google_cloud" => Some(STTProvider::GoogleCloud),
        "gemini" => Some(STTProvider::Gemini),
        "groq" => Some(STTProvider::Groq),
        _ => None,
    }
}

#[derive(Serialize, Deserialize, Debug)]
pub struct OpenAITranscriptionResponse {
    pub text: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GoogleRecognizeRequest {
    pub config: GoogleRecognitionConfig,
    pub content: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GoogleRecognitionConfig {
    pub auto_decoding_config: GoogleAutoDecodingConfig,
    pub language_codes: Vec<String>,
    pub model: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub features: Option<GoogleRecognitionFeatures>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GoogleAutoDecodingConfig {}

#[derive(Serialize, Deserialize, Debug)]
pub struct GoogleRecognitionFeatures {
    pub enable_automatic_punctuation: bool,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GoogleRecognizeResponse {
    pub results: Option<Vec<GoogleSpeechRecognitionResult>>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GoogleSpeechRecognitionResult {
    pub alternatives: Option<Vec<GoogleSpeechRecognitionAlternative>>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GoogleSpeechRecognitionAlternative {
    pub transcript: String,
    pub confidence: Option<f32>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GeminiTranscribeRequest {
    pub contents: Vec<GeminiContent>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub generation_config: Option<GeminiGenerationConfig>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct GeminiContent {
    pub parts: Vec<GeminiPart>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(untagged)]
pub enum GeminiPart {
    Text { text: String },
    InlineData { inline_data: GeminiInlineData },
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct GeminiInlineData {
    pub mime_type: String,
    pub data: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GeminiGenerationConfig {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_output_tokens: Option<u32>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GeminiGenerateResponse {
    pub candidates: Option<Vec<GeminiCandidate>>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GeminiCandidate {
    pub content: GeminiResponseContent,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GeminiResponseContent {
    pub parts: Option<Vec<GeminiTextPart>>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GeminiTextPart {
    pub text: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GeminiModelsResponse {
    pub models: Option<Vec<GeminiModelInfo>>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GeminiModelInfo {
    pub name: String,
    #[serde(rename = "displayName")]
    pub display_name: Option<String>,
    #[serde(rename = "supportedGenerationMethods")]
    pub supported_generation_methods: Option<Vec<String>>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GoogleCloudAccessToken {
    pub access_token: String,
    pub token_type: String,
    pub expires_in: u64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ServiceAccountCredentials {
    pub client_email: String,
    pub private_key: String,
    pub token_uri: String,
}
