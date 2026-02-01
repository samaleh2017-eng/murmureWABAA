use serde::{Deserialize, Serialize};

#[derive(Clone, Serialize, Deserialize)]
pub struct DownloadProgress {
    pub percent: f32,
    pub downloaded_mb: f32,
    pub total_mb: f32,
    pub speed_mb_s: f32,
    pub is_downloading: bool,
    pub is_complete: bool,
    pub error: Option<String>,
}

impl Default for DownloadProgress {
    fn default() -> Self {
        Self {
            percent: 0.0,
            downloaded_mb: 0.0,
            total_mb: 350.0,
            speed_mb_s: 0.0,
            is_downloading: false,
            is_complete: false,
            error: None,
        }
    }
}
