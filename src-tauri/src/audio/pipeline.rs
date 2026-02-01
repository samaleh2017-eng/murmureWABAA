use crate::audio::types::{AudioState, RecordingMode};
use crate::dictionary::{fix_transcription_with_dictionary, get_cc_rules_path, Dictionary};
use crate::formatting_rules;
use crate::history;
use crate::stats;
use anyhow::{Context, Result};
use log::{debug, error, warn};
use std::path::Path;
use tauri::{AppHandle, Emitter, Manager};

pub fn process_recording(app: &AppHandle, file_path: &Path) -> Result<String> {
    // 1. Transcribe
    let raw_text = transcribe_audio(app, file_path)?;
    debug!("Raw transcription: {}", raw_text);

    if raw_text.trim().is_empty() {
        debug!("Transcription is empty, skipping further processing.");
        return Ok(raw_text);
    }

    // 2. Dictionary & CC Rules
    let text = apply_dictionary_and_rules(app, raw_text)?;
    debug!("Transcription fixed with dictionary: {}", text);

    // 3. LLM Post-processing
    let llm_text = apply_llm_processing(app, text)?;

    // 4. Apply formatting rules
    let final_text = apply_formatting_rules(app, llm_text);
    debug!("Transcription with formatting rules: {}", final_text);

    // 5. Save Stats & History
    save_stats_and_history(app, file_path, &final_text)?;

    Ok(final_text)
}

pub fn transcribe_audio(app: &AppHandle, audio_path: &Path) -> Result<String> {
    let _ = app.emit("llm-processing-start", ());

    let rt = tokio::runtime::Runtime::new().context("Failed to create tokio runtime")?;

    let result = rt
        .block_on(crate::stt::transcribe_audio_with_router(app, audio_path))
        .map_err(|e| {
            let _ = app.emit("llm-processing-end", ());
            anyhow::anyhow!("Transcription failed: {}", e)
        })?;

    let _ = app.emit("llm-processing-end", ());

    Ok(result)
}

fn apply_dictionary_and_rules(app: &AppHandle, text: String) -> Result<String> {
    let cc_rules_path = get_cc_rules_path(app).context("Failed to get CC rules path")?;
    let dictionary = app.state::<Dictionary>().get();

    Ok(fix_transcription_with_dictionary(
        text,
        dictionary,
        cc_rules_path,
    ))
}

fn apply_llm_processing(app: &AppHandle, text: String) -> Result<String> {
    let state = app.state::<AudioState>();
    let recording_mode = state.get_recording_mode();

    let rt = tokio::runtime::Runtime::new().context("Failed to create tokio runtime")?;

    match recording_mode {
        RecordingMode::Command => {
            debug!("Processing audio in Command mode");
            let mut prompt = text.clone();

            match crate::clipboard::get_selected_text(app) {
                Ok(selected_text) => {
                    if !selected_text.trim().is_empty() {
                        debug!("Captured selected text for command mode successfully");
                        prompt = format!(
                            r#"<role>
You are a text transformation tool, not a conversational assistant.
Your ONLY job: apply the user instruction to the input text and return the result.
DO NOT explain, comment, or add any text beyond the transformation output.
</role>

<meta_instruction>
- Return ONLY the transformed text
- NO explanations, NO commentary, NO markdown formatting
- If the instruction is unclear or cannot be applied: return the input text UNCHANGED
- Never wrap the output in quotes, code blocks, or additional formatting
</meta_instruction>

<user_instruction>
{}
</user_instruction>

<input_text>
{}
</input_text>"#,
                            text, selected_text
                        );
                    } else {
                        warn!("Selected text was empty in command mode");
                    }
                }
                Err(e) => {
                    error!("Failed to capture selected text in command mode: {}", e);
                }
            }

            // Call direct LLM function
            match rt.block_on(crate::llm::process_command_with_llm(app, prompt)) {
                Ok(response) => {
                    debug!("Command processed with LLM: {}", response);
                    Ok(response)
                }
                Err(e) => {
                    warn!(
                        "Command LLM processing failed: {}. Using original transcription.",
                        e
                    );
                    let _ = app.emit("llm-error", e.to_string());
                    Ok(text)
                }
            }
        }
        RecordingMode::Llm => {
            match rt.block_on(crate::llm::post_process_with_llm(
                app,
                text.clone(),
                false, // force_bypass
            )) {
                Ok(llm_text) => {
                    debug!("Transcription post-processed with LLM: {}", llm_text);
                    Ok(llm_text)
                }
                Err(e) => {
                    warn!(
                        "LLM post-processing failed: {}. Using original transcription.",
                        e
                    );
                    let _ = app.emit("llm-error", e.to_string());
                    Ok(text)
                }
            }
        }
        RecordingMode::Standard => {
            // Standard mode bypasses LLM processing
            Ok(text)
        }
    }
}

fn apply_formatting_rules(app: &AppHandle, text: String) -> String {
    match formatting_rules::load(app) {
        Ok(settings) => formatting_rules::apply_formatting(text, &settings),
        Err(e) => {
            warn!("Failed to load formatting rules: {}. Skipping.", e);
            text
        }
    }
}

fn save_stats_and_history(app: &AppHandle, file_path: &Path, text: &str) -> Result<()> {
    // Calculate duration and size
    let (duration_seconds, wav_size_bytes) = match hound::WavReader::open(file_path) {
        Ok(reader) => {
            let spec = reader.spec();
            let total_samples = reader.duration() as f64;
            let seconds = if spec.sample_rate > 0 {
                total_samples / (spec.sample_rate as f64)
            } else {
                0.0
            };
            let size = std::fs::metadata(file_path).map(|m| m.len()).unwrap_or(0);
            (seconds, size)
        }
        Err(_) => (0.0, 0),
    };

    let word_count: u64 = text.split_whitespace().filter(|s| !s.is_empty()).count() as u64;

    if let Err(e) = history::add_transcription(app, text.to_string()) {
        error!("Failed to save to history: {}", e);
    }

    if let Err(e) =
        stats::add_transcription_session(app, word_count, duration_seconds, wav_size_bytes)
    {
        error!("Failed to save stats session: {}", e);
    }

    Ok(())
}
