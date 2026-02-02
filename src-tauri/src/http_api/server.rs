use crate::context_detection::browser_state::{remove_browser_context, set_browser_context};
use crate::context_detection::BrowserContext;
use crate::dictionary::{fix_transcription_with_dictionary, get_cc_rules_path, Dictionary};
use anyhow::Result;
use axum::{
    extract::{
        ws::{Message, WebSocket},
        DefaultBodyLimit, Multipart, WebSocketUpgrade,
    },
    http::{Method, StatusCode},
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use futures_util::{SinkExt, StreamExt};
use log::{debug, info, warn};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Manager;
use tower_http::cors::{Any, CorsLayer};

#[derive(Serialize, Deserialize)]
pub struct TranscriptionResponse {
    pub text: String,
}

#[derive(Serialize, Deserialize)]
pub struct ErrorResponse {
    pub error: String,
}

#[derive(Deserialize)]
pub struct ContextRequest {
    pub url: String,
    pub title: String,
    pub browser: String,
}

#[derive(Serialize)]
pub struct ContextResponse {
    pub status: String,
}

pub async fn start_http_api(
    app: tauri::AppHandle,
    port: u16,
    api_state: super::types::HttpApiState,
) -> Result<()> {
    let app = Arc::new(app);

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers(Any);

    let router = Router::new()
        .route("/api/transcribe", post(transcribe_handler))
        .route("/api/context", post(context_handler))
        .route("/ws/context", get(websocket_handler))
        .with_state(app.clone())
        .layer(cors)
        .layer(DefaultBodyLimit::max(100_000_000));

    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    let listener = tokio::net::TcpListener::bind(&addr).await?;

    info!("HTTP API listening on http://{}", addr);
    info!("WebSocket available at ws://{}/ws/context", addr);

    let (shutdown_tx, shutdown_rx) = tokio::sync::oneshot::channel::<()>();
    api_state.set_shutdown_sender(shutdown_tx);

    let server = axum::serve(listener, router);

    tokio::select! {
        _ = server => {
            info!("HTTP API server ended normally");
        }
        _ = shutdown_rx => {
            info!("HTTP API server shutdown signal received");
        }
    }

    Ok(())
}

async fn websocket_handler(ws: WebSocketUpgrade) -> impl IntoResponse {
    ws.on_upgrade(handle_websocket)
}

async fn handle_websocket(socket: WebSocket) {
    let connection_id = uuid::Uuid::new_v4().to_string();
    info!("WebSocket connected: {}", connection_id);

    let (mut sender, mut receiver) = socket.split();

    let conn_id = connection_id.clone();
    while let Some(msg) = receiver.next().await {
        match msg {
            Ok(Message::Text(text)) => {
                match serde_json::from_str::<ContextRequest>(&text) {
                    Ok(context_req) => {
                        let timestamp = SystemTime::now()
                            .duration_since(UNIX_EPOCH)
                            .unwrap()
                            .as_millis() as u64;

                        let context = BrowserContext {
                            url: context_req.url,
                            title: context_req.title,
                            browser: context_req.browser,
                            timestamp,
                        };

                        set_browser_context(&conn_id, context);
                        debug!("WebSocket context updated from {}", conn_id);

                        let response = serde_json::json!({"status": "ok"});
                        if sender
                            .send(Message::Text(response.to_string().into()))
                            .await
                            .is_err()
                        {
                            break;
                        }
                    }
                    Err(e) => {
                        warn!("Invalid WebSocket message: {}", e);
                    }
                }
            }
            Ok(Message::Close(_)) => {
                info!("WebSocket close received: {}", conn_id);
                break;
            }
            Ok(Message::Ping(data)) => {
                if sender.send(Message::Pong(data)).await.is_err() {
                    break;
                }
            }
            Err(e) => {
                warn!("WebSocket error: {}", e);
                break;
            }
            _ => {}
        }
    }

    remove_browser_context(&connection_id);
    info!("WebSocket disconnected: {}", connection_id);
}

async fn transcribe_handler(
    axum::extract::State(app): axum::extract::State<Arc<tauri::AppHandle>>,
    mut multipart: Multipart,
) -> impl IntoResponse {
    loop {
        match multipart.next_field().await {
            Ok(Some(field)) => {
                if field.name() == Some("audio") {
                    let bytes = match field.bytes().await {
                        Ok(b) => b,
                        Err(e) => {
                            return (
                                StatusCode::BAD_REQUEST,
                                Json(ErrorResponse {
                                    error: format!("Failed to read audio file: {}", e),
                                }),
                            )
                                .into_response()
                        }
                    };

                    let temp_path =
                        std::env::temp_dir().join(format!("murmure-{}.wav", uuid::Uuid::new_v4()));

                    if let Err(e) = std::fs::write(&temp_path, bytes) {
                        return (
                            StatusCode::INTERNAL_SERVER_ERROR,
                            Json(ErrorResponse {
                                error: format!("Failed to write audio file: {}", e),
                            }),
                        )
                            .into_response();
                    }

                    let result = match crate::audio::preload_engine(&app) {
                        Ok(_) => match crate::audio::transcribe_audio(&app, &temp_path) {
                            Ok(raw_text) => {
                                let text = match get_cc_rules_path(&app) {
                                    Ok(cc_rules_path) => {
                                        let dictionary = app.state::<Dictionary>().get();
                                        fix_transcription_with_dictionary(
                                            raw_text,
                                            dictionary,
                                            cc_rules_path,
                                        )
                                    }
                                    Err(_) => raw_text,
                                };

                                Ok(text)
                            }
                            Err(e) => Err(format!("Transcription failed: {}", e)),
                        },
                        Err(e) => Err(format!("Model not available: {}", e)),
                    };

                    let _ = std::fs::remove_file(&temp_path);

                    return match result {
                        Ok(text) => {
                            (StatusCode::OK, Json(TranscriptionResponse { text })).into_response()
                        }
                        Err(e) => (
                            StatusCode::INTERNAL_SERVER_ERROR,
                            Json(ErrorResponse { error: e }),
                        )
                            .into_response(),
                    };
                }
            }
            Ok(None) => break,
            Err(e) => {
                return (
                    StatusCode::BAD_REQUEST,
                    Json(ErrorResponse {
                        error: format!("Failed to parse multipart: {}", e),
                    }),
                )
                    .into_response()
            }
        }
    }

    (
        StatusCode::BAD_REQUEST,
        Json(ErrorResponse {
            error: "No 'audio' field in multipart request".to_string(),
        }),
    )
        .into_response()
}

async fn context_handler(Json(payload): Json<ContextRequest>) -> impl IntoResponse {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis() as u64;

    let context = BrowserContext {
        url: payload.url,
        title: payload.title,
        browser: payload.browser,
        timestamp,
    };

    set_browser_context("http-fallback", context);

    (
        StatusCode::OK,
        Json(ContextResponse {
            status: "ok".to_string(),
        }),
    )
}
