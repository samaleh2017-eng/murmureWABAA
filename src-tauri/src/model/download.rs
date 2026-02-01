use super::types::DownloadProgress;
use futures_util::StreamExt;
use log::{debug, error, info};
use parking_lot::Mutex;
use std::io::{Read, Write};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Instant;
use tauri::{AppHandle, Emitter, Manager};

const MODEL_URL: &str =
    "https://github.com/Kieirra/murmure-model/releases/download/1.0.0/parakeet-tdt-0.6b-v3-int8.zip";
const MODEL_FILENAME: &str = "parakeet-tdt-0.6b-v3-int8";
const MODEL_SIZE_BYTES: u64 = 350_000_000;

pub struct DownloadState {
    pub progress: Mutex<DownloadProgress>,
    pub cancel_flag: AtomicBool,
}

impl Default for DownloadState {
    fn default() -> Self {
        Self {
            progress: Mutex::new(DownloadProgress::default()),
            cancel_flag: AtomicBool::new(false),
        }
    }
}

fn get_model_download_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    let resources_dir = app_data_dir.join("resources");
    std::fs::create_dir_all(&resources_dir)
        .map_err(|e| format!("Failed to create resources dir: {}", e))?;

    Ok(resources_dir)
}

fn extract_zip(zip_path: &PathBuf, extract_to: &PathBuf) -> Result<(), String> {
    let file =
        std::fs::File::open(zip_path).map_err(|e| format!("Failed to open zip file: {}", e))?;

    let mut archive =
        zip::ZipArchive::new(file).map_err(|e| format!("Failed to read zip archive: {}", e))?;

    for i in 0..archive.len() {
        let mut file = archive
            .by_index(i)
            .map_err(|e| format!("Failed to read file from archive: {}", e))?;

        let outpath = match file.enclosed_name() {
            Some(path) => extract_to.join(path),
            None => continue,
        };

        if file.name().ends_with('/') {
            std::fs::create_dir_all(&outpath)
                .map_err(|e| format!("Failed to create directory: {}", e))?;
        } else {
            if let Some(p) = outpath.parent() {
                if !p.exists() {
                    std::fs::create_dir_all(p)
                        .map_err(|e| format!("Failed to create parent directory: {}", e))?;
                }
            }
            let mut outfile = std::fs::File::create(&outpath)
                .map_err(|e| format!("Failed to create output file: {}", e))?;
            let mut buffer = Vec::new();
            file.read_to_end(&mut buffer)
                .map_err(|e| format!("Failed to read from archive: {}", e))?;
            outfile
                .write_all(&buffer)
                .map_err(|e| format!("Failed to write to output file: {}", e))?;
        }

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            if let Some(mode) = file.unix_mode() {
                std::fs::set_permissions(&outpath, std::fs::Permissions::from_mode(mode)).ok();
            }
        }
    }

    Ok(())
}

pub async fn download_model(app: AppHandle, state: Arc<DownloadState>) -> Result<(), String> {
    state.cancel_flag.store(false, Ordering::SeqCst);

    {
        let mut progress = state.progress.lock();
        *progress = DownloadProgress {
            is_downloading: true,
            ..Default::default()
        };
    }

    let resources_dir = get_model_download_path(&app)?;
    let zip_path = resources_dir.join(format!("{}.zip", MODEL_FILENAME));
    let model_path = resources_dir.join(MODEL_FILENAME);

    info!("Starting model download to: {:?}", zip_path);

    let client = reqwest::Client::new();
    let response = client
        .get(MODEL_URL)
        .send()
        .await
        .map_err(|e| format!("Failed to start download: {}", e))?;

    if !response.status().is_success() {
        let err = format!("Download failed with status: {}", response.status());
        error!("{}", err);
        let mut progress = state.progress.lock();
        progress.is_downloading = false;
        progress.error = Some(err.clone());
        app.emit("download-error", err.clone()).ok();
        return Err(err);
    }

    let total_size = response.content_length().unwrap_or(MODEL_SIZE_BYTES);
    let total_mb = total_size as f32 / (1024.0 * 1024.0);

    {
        let mut progress = state.progress.lock();
        progress.total_mb = total_mb;
    }

    let mut file = std::fs::File::create(&zip_path)
        .map_err(|e| format!("Failed to create download file: {}", e))?;

    let mut stream = response.bytes_stream();
    let mut downloaded: u64 = 0;
    let mut last_emit = Instant::now();
    let mut last_downloaded: u64 = 0;
    let start_time = Instant::now();

    while let Some(chunk_result) = stream.next().await {
        if state.cancel_flag.load(Ordering::SeqCst) {
            info!("Download cancelled by user");
            drop(file);
            std::fs::remove_file(&zip_path).ok();

            let mut progress = state.progress.lock();
            *progress = DownloadProgress::default();

            app.emit("download-cancelled", ()).ok();
            return Err("Download cancelled".to_string());
        }

        let chunk = chunk_result.map_err(|e| format!("Failed to download chunk: {}", e))?;
        file.write_all(&chunk)
            .map_err(|e| format!("Failed to write chunk: {}", e))?;

        downloaded += chunk.len() as u64;

        let now = Instant::now();
        if now.duration_since(last_emit).as_millis() >= 100 {
            let elapsed_secs = now.duration_since(start_time).as_secs_f32();
            let speed_mb_s = if elapsed_secs > 0.0 {
                (downloaded - last_downloaded) as f32 / (1024.0 * 1024.0)
                    / now.duration_since(last_emit).as_secs_f32()
            } else {
                0.0
            };

            let downloaded_mb = downloaded as f32 / (1024.0 * 1024.0);
            let percent = (downloaded as f32 / total_size as f32) * 100.0;

            {
                let mut progress = state.progress.lock();
                progress.percent = percent;
                progress.downloaded_mb = downloaded_mb;
                progress.speed_mb_s = speed_mb_s;
            }

            let progress_data = DownloadProgress {
                percent,
                downloaded_mb,
                total_mb,
                speed_mb_s,
                is_downloading: true,
                is_complete: false,
                error: None,
            };

            app.emit("download-progress", progress_data).ok();

            last_emit = now;
            last_downloaded = downloaded;
        }
    }

    drop(file);
    debug!("Download complete, extracting zip...");

    app.emit(
        "download-progress",
        DownloadProgress {
            percent: 100.0,
            downloaded_mb: total_mb,
            total_mb,
            speed_mb_s: 0.0,
            is_downloading: true,
            is_complete: false,
            error: None,
        },
    )
    .ok();

    extract_zip(&zip_path, &resources_dir)?;

    std::fs::remove_file(&zip_path).ok();

    if model_path.exists() {
        info!("Model extracted successfully to: {:?}", model_path);

        {
            let mut progress = state.progress.lock();
            progress.percent = 100.0;
            progress.downloaded_mb = total_mb;
            progress.is_downloading = false;
            progress.is_complete = true;
        }

        app.emit("download-complete", ()).ok();
        Ok(())
    } else {
        let err = "Model extraction failed: model folder not found after extraction".to_string();
        error!("{}", err);

        let mut progress = state.progress.lock();
        progress.is_downloading = false;
        progress.error = Some(err.clone());

        app.emit("download-error", err.clone()).ok();
        Err(err)
    }
}

pub fn cancel_download(state: &DownloadState) {
    state.cancel_flag.store(true, Ordering::SeqCst);
}

pub fn get_progress(state: &DownloadState) -> DownloadProgress {
    state.progress.lock().clone()
}
