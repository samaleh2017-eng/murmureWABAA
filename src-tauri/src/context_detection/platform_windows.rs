use super::context_detection::{extract_url_from_title, is_browser};
use super::types::ActiveContext;
use log::debug;
use std::ffi::OsString;
use std::os::windows::ffi::OsStringExt;
use windows_sys::Win32::Foundation::{CloseHandle, HANDLE, HWND};

const MAX_PATH: usize = 260;
use windows_sys::Win32::System::Threading::{
    OpenProcess, QueryFullProcessImageNameW, PROCESS_QUERY_LIMITED_INFORMATION,
};
use windows_sys::Win32::UI::WindowsAndMessaging::{
    GetForegroundWindow, GetWindowTextW, GetWindowThreadProcessId,
};

pub fn get_active_context_impl() -> ActiveContext {
    let mut context = ActiveContext::default();

    let hwnd: HWND = unsafe { GetForegroundWindow() };
    if hwnd == 0 {
        debug!("No foreground window found");
        return context;
    }

    context.window_title = get_window_title(hwnd);

    let mut process_id: u32 = 0;
    unsafe {
        GetWindowThreadProcessId(hwnd, &mut process_id);
    }

    if process_id != 0 {
        if let Some((process_name, app_name)) = get_process_info(process_id) {
            context.process_name = process_name;
            context.app_name = app_name;
        }
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

fn get_window_title(hwnd: HWND) -> String {
    let mut title: [u16; 512] = [0; 512];
    let len = unsafe { GetWindowTextW(hwnd, title.as_mut_ptr(), title.len() as i32) };

    if len > 0 {
        let title_slice = &title[..len as usize];
        OsString::from_wide(title_slice)
            .to_string_lossy()
            .to_string()
    } else {
        String::new()
    }
}

fn get_process_info(process_id: u32) -> Option<(String, String)> {
    let handle: HANDLE =
        unsafe { OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, process_id) };

    if handle == 0 {
        return None;
    }

    let mut path: [u16; MAX_PATH] = [0; MAX_PATH];
    let mut size: u32 = MAX_PATH as u32;

    let result = unsafe { QueryFullProcessImageNameW(handle, 0, path.as_mut_ptr(), &mut size) };

    unsafe { CloseHandle(handle) };

    if result == 0 {
        return None;
    }

    let path_str = OsString::from_wide(&path[..size as usize])
        .to_string_lossy()
        .to_string();

    let process_name = std::path::Path::new(&path_str)
        .file_name()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_default();

    let app_name = process_name
        .strip_suffix(".exe")
        .or_else(|| process_name.strip_suffix(".EXE"))
        .unwrap_or(&process_name)
        .to_string();

    let app_name = format_app_name(&app_name);

    Some((process_name, app_name))
}

fn format_app_name(name: &str) -> String {
    let known_apps: &[(&str, &str)] = &[
        ("code", "Visual Studio Code"),
        ("msedge", "Microsoft Edge"),
        ("chrome", "Google Chrome"),
        ("firefox", "Mozilla Firefox"),
        ("brave", "Brave Browser"),
        ("opera", "Opera"),
        ("vivaldi", "Vivaldi"),
        ("slack", "Slack"),
        ("discord", "Discord"),
        ("teams", "Microsoft Teams"),
        ("outlook", "Microsoft Outlook"),
        ("explorer", "File Explorer"),
        ("notepad", "Notepad"),
        ("cmd", "Command Prompt"),
        ("powershell", "PowerShell"),
        ("windowsterminal", "Windows Terminal"),
        ("spotify", "Spotify"),
        ("notion", "Notion"),
    ];

    let name_lower = name.to_lowercase();
    for (key, display_name) in known_apps {
        if name_lower == *key {
            return (*display_name).to_string();
        }
    }

    let mut chars = name.chars();
    match chars.next() {
        Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
        None => String::new(),
    }
}
