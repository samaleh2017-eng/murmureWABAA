use super::context_detection::{extract_url_from_title, is_browser};
use super::types::ActiveContext;
use log::debug;
use std::process::Command;

pub fn get_active_context_impl() -> ActiveContext {
    let mut context = ActiveContext::default();

    if let Some(info) = get_frontmost_app_applescript() {
        context.app_name = info.app_name;
        context.process_name = info.process_name;
        context.window_title = info.window_title;
    }

    if is_browser(&context.app_name, &context.process_name) {
        context.detected_url = extract_url_from_title(
            &context.window_title,
            &context.app_name,
            &context.process_name,
        );
    }

    debug!(
        "Active context: app={}, process={}, title={}",
        context.app_name, context.process_name, context.window_title
    );

    context
}

struct AppInfo {
    app_name: String,
    process_name: String,
    window_title: String,
}

fn get_frontmost_app_applescript() -> Option<AppInfo> {
    let script = r#"
        tell application "System Events"
            set frontApp to first application process whose frontmost is true
            set appName to name of frontApp
            set bundleId to bundle identifier of frontApp
            set windowTitle to ""
            try
                set windowTitle to name of front window of frontApp
            end try
            return appName & "|||" & bundleId & "|||" & windowTitle
        end tell
    "#;

    let output = Command::new("osascript")
        .args(["-e", script])
        .output()
        .ok()?;

    if !output.status.success() {
        debug!(
            "AppleScript failed: {}",
            String::from_utf8_lossy(&output.stderr)
        );
        return None;
    }

    let result = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let parts: Vec<&str> = result.split("|||").collect();

    if parts.len() >= 3 {
        Some(AppInfo {
            app_name: parts[0].to_string(),
            process_name: parts[1].to_string(),
            window_title: parts[2].to_string(),
        })
    } else if parts.len() >= 2 {
        Some(AppInfo {
            app_name: parts[0].to_string(),
            process_name: parts[1].to_string(),
            window_title: String::new(),
        })
    } else {
        None
    }
}
