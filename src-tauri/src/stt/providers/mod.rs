pub mod gemini;
pub mod google_cloud;
pub mod groq;
pub mod openai;
pub mod traits;

pub use gemini::GeminiSTTClient;
pub use google_cloud::GoogleCloudSTTClient;
pub use groq::GroqSTTClient;
pub use openai::OpenAISTTClient;
pub use traits::STTProviderClient;
