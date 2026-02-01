use async_trait::async_trait;

#[async_trait]
pub trait STTProviderClient: Send + Sync {
    async fn transcribe(&self, audio_data: Vec<u8>, language: Option<&str>)
        -> Result<String, String>;

    async fn list_models(&self) -> Result<Vec<String>, String>;

    async fn test_connection(&self) -> Result<bool, String>;

    fn provider_name(&self) -> &'static str;
}
