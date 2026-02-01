use crate::llm::types::LLMModel;
use async_trait::async_trait;

#[async_trait]
#[allow(dead_code)]
pub trait LLMProviderClient: Send + Sync {
    async fn generate(&self, prompt: &str, model: &str, temperature: f32)
        -> Result<String, String>;

    async fn list_models(&self) -> Result<Vec<LLMModel>, String>;

    async fn test_connection(&self) -> Result<bool, String>;

    fn provider_name(&self) -> &'static str;
}
