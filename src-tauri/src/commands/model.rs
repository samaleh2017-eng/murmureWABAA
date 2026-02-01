use crate::model::{
    download::{cancel_download, download_model, get_progress, DownloadState},
    types::DownloadProgress,
    Model,
};
use std::sync::Arc;
use tauri::{command, AppHandle, State};

#[command]
pub fn is_model_available(model: State<Arc<Model>>) -> bool {
    model.is_available()
}

#[command]
pub fn get_model_path(model: State<Arc<Model>>) -> Result<String, String> {
    let path = model.get_model_path().map_err(|e| format!("{:#}", e))?;

    Ok(path.to_string_lossy().to_string())
}

#[command]
pub async fn start_model_download(
    app: AppHandle,
    state: State<'_, Arc<DownloadState>>,
) -> Result<(), String> {
    let state_clone = state.inner().clone();
    tokio::spawn(async move {
        if let Err(e) = download_model(app, state_clone).await {
            log::error!("Download error: {}", e);
        }
    });
    Ok(())
}

#[command]
pub fn cancel_model_download(state: State<Arc<DownloadState>>) -> Result<(), String> {
    cancel_download(state.inner());
    Ok(())
}

#[command]
pub fn get_download_progress(state: State<Arc<DownloadState>>) -> DownloadProgress {
    get_progress(state.inner())
}
