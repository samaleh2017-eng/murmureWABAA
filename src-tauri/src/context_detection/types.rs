use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrowserContext {
    pub url: String,
    pub title: String,
    pub browser: String,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActiveContext {
    pub app_name: String,
    pub process_name: String,
    pub window_title: String,
    pub detected_url: Option<String>,
}

impl Default for ActiveContext {
    fn default() -> Self {
        Self {
            app_name: String::new(),
            process_name: String::new(),
            window_title: String::new(),
            detected_url: None,
        }
    }
}
