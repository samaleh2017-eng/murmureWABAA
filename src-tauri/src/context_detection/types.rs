use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrowserContext {
    pub url: String,
    pub title: String,
    pub browser: String,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ActiveContext {
    #[serde(default)]
    pub app_name: String,
    #[serde(default)]
    pub process_name: String,
    #[serde(default)]
    pub window_title: String,
    #[serde(default)]
    pub detected_url: Option<String>,
}
