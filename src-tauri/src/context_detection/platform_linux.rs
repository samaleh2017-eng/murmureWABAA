use super::context_detection::{extract_url_from_title, is_browser};
use super::types::ActiveContext;
use log::{debug, warn};
use std::fs;
use std::process::Command;

pub fn get_active_context_impl() -> ActiveContext {
    let mut context = ActiveContext::default();

    if let Some((window_id, title)) = get_active_window_x11() {
        context.window_title = title;

        if let Some(pid) = get_window_pid_x11(window_id) {
            if let Some(process_name) = get_process_name(pid) {
                context.process_name = process_name.clone();
                context.app_name = format_app_name(&process_name);
            }
        }
    } else if let Some(info) = get_active_window_gnome() {
        context.window_title = info.title;
        context.process_name = info.process_name.clone();
        context.app_name = format_app_name(&info.process_name);
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

fn get_active_window_x11() -> Option<(u64, String)> {
    let output = Command::new("xdotool")
        .args(["getactivewindow"])
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let window_id_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let window_id: u64 = window_id_str.parse().ok()?;

    let title_output = Command::new("xdotool")
        .args(["getwindowname", &window_id_str])
        .output()
        .ok()?;

    let title = if title_output.status.success() {
        String::from_utf8_lossy(&title_output.stdout)
            .trim()
            .to_string()
    } else {
        String::new()
    };

    Some((window_id, title))
}

fn get_window_pid_x11(window_id: u64) -> Option<u32> {
    let output = Command::new("xdotool")
        .args(["getwindowpid", &window_id.to_string()])
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let pid_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
    pid_str.parse().ok()
}

fn get_process_name(pid: u32) -> Option<String> {
    let comm_path = format!("/proc/{}/comm", pid);
    match fs::read_to_string(&comm_path) {
        Ok(name) => Some(name.trim().to_string()),
        Err(e) => {
            warn!("Failed to read process name from {}: {}", comm_path, e);
            None
        }
    }
}

struct GnomeWindowInfo {
    title: String,
    process_name: String,
}

fn get_active_window_gnome() -> Option<GnomeWindowInfo> {
    let script = r#"
        global.get_window_actors()
            .map(w => w.meta_window)
            .find(w => w.has_focus())
    "#;

    let output = Command::new("gdbus")
        .args([
            "call",
            "--session",
            "--dest",
            "org.gnome.Shell",
            "--object-path",
            "/org/gnome/Shell",
            "--method",
            "org.gnome.Shell.Eval",
            script,
        ])
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let result = String::from_utf8_lossy(&output.stdout);
    debug!("GNOME Shell eval result: {}", result);

    let title = extract_gnome_property(&result, "title").unwrap_or_default();
    let wm_class = extract_gnome_property(&result, "wm_class").unwrap_or_default();

    if title.is_empty() && wm_class.is_empty() {
        return None;
    }

    Some(GnomeWindowInfo {
        title,
        process_name: wm_class,
    })
}

fn extract_gnome_property(output: &str, property: &str) -> Option<String> {
    let pattern = format!(r#""{}"\s*:\s*"([^"]*)""#, property);
    let re = regex::Regex::new(&pattern).ok()?;
    re.captures(output)
        .and_then(|c| c.get(1))
        .map(|m| m.as_str().to_string())
}

fn format_app_name(process_name: &str) -> String {
    let known_apps: &[(&str, &str)] = &[
        ("code", "Visual Studio Code"),
        ("code-oss", "VS Code OSS"),
        ("codium", "VSCodium"),
        ("chrome", "Google Chrome"),
        ("google-chrome", "Google Chrome"),
        ("google-chrome-stable", "Google Chrome"),
        ("chromium", "Chromium"),
        ("chromium-browser", "Chromium"),
        ("firefox", "Mozilla Firefox"),
        ("firefox-esr", "Mozilla Firefox ESR"),
        ("brave", "Brave Browser"),
        ("brave-browser", "Brave Browser"),
        ("opera", "Opera"),
        ("vivaldi", "Vivaldi"),
        ("vivaldi-stable", "Vivaldi"),
        ("slack", "Slack"),
        ("discord", "Discord"),
        ("spotify", "Spotify"),
        ("nautilus", "Files"),
        ("gnome-terminal", "Terminal"),
        ("konsole", "Konsole"),
        ("alacritty", "Alacritty"),
        ("kitty", "Kitty"),
        ("wezterm", "WezTerm"),
        ("thunderbird", "Thunderbird"),
        ("gedit", "Text Editor"),
        ("gnome-text-editor", "Text Editor"),
        ("evince", "Document Viewer"),
        ("eog", "Image Viewer"),
        ("vlc", "VLC Media Player"),
        ("gimp", "GIMP"),
        ("inkscape", "Inkscape"),
        ("libreoffice", "LibreOffice"),
        ("notion-app", "Notion"),
        ("obsidian", "Obsidian"),
    ];

    let name_lower = process_name.to_lowercase();
    for (key, display_name) in known_apps {
        if name_lower == *key {
            return (*display_name).to_string();
        }
    }

    let mut chars = process_name.chars();
    match chars.next() {
        Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
        None => String::new(),
    }
}
