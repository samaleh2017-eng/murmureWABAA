use super::browser_state;
use super::types::ActiveContext;

const BROWSER_NAMES: &[&str] = &[
    "chrome",
    "firefox",
    "safari",
    "edge",
    "brave",
    "arc",
    "opera",
    "vivaldi",
    "chromium",
    "msedge",
    "google chrome",
    "mozilla firefox",
    "microsoft edge",
];

pub fn get_active_context() -> ActiveContext {
    #[cfg(target_os = "windows")]
    let mut context = super::platform_windows::get_active_context_impl();

    #[cfg(target_os = "macos")]
    let mut context = super::platform_macos::get_active_context_impl();

    #[cfg(target_os = "linux")]
    let mut context = super::platform_linux::get_active_context_impl();

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    let mut context = ActiveContext::default();

    if let Some(browser_ctx) = browser_state::get_browser_context() {
        if is_browser(&context.app_name, &context.process_name) {
            context.detected_url = Some(extract_domain(&browser_ctx.url));
            context.window_title = browser_ctx.title;
        }
    }

    context
}

fn extract_domain(url: &str) -> String {
    url.split("://")
        .nth(1)
        .unwrap_or(url)
        .split('/')
        .next()
        .unwrap_or(url)
        .trim_start_matches("www.")
        .to_string()
}

pub fn is_browser(app_name: &str, process_name: &str) -> bool {
    let app_lower = app_name.to_lowercase();
    let process_lower = process_name.to_lowercase();

    BROWSER_NAMES.iter().any(|browser| {
        app_lower.contains(browser)
            || process_lower.contains(browser)
            || process_lower.starts_with(browser)
    })
}

pub fn extract_url_from_title(title: &str, app_name: &str, process_name: &str) -> Option<String> {
    if !is_browser(app_name, process_name) {
        return None;
    }

    if title.is_empty() {
        return None;
    }

    let url_regex = regex::Regex::new(
        r"(?i)(?:https?://)?(?:www\.)?([a-zA-Z0-9][-a-zA-Z0-9]*(?:\.[a-zA-Z0-9][-a-zA-Z0-9]*)+)",
    )
    .ok()?;

    if let Some(captures) = url_regex.captures(title) {
        if let Some(domain) = captures.get(1) {
            return Some(domain.as_str().to_lowercase());
        }
    }

    let known_services: &[(&str, &str)] = &[
        ("gmail", "mail.google.com"),
        ("google mail", "mail.google.com"),
        ("inbox", "mail.google.com"),
        ("youtube", "youtube.com"),
        ("google docs", "docs.google.com"),
        ("google sheets", "sheets.google.com"),
        ("google slides", "slides.google.com"),
        ("google drive", "drive.google.com"),
        ("google calendar", "calendar.google.com"),
        ("google meet", "meet.google.com"),
        ("slack", "slack.com"),
        ("discord", "discord.com"),
        ("twitter", "twitter.com"),
        ("facebook", "facebook.com"),
        ("linkedin", "linkedin.com"),
        ("github", "github.com"),
        ("gitlab", "gitlab.com"),
        ("stackoverflow", "stackoverflow.com"),
        ("reddit", "reddit.com"),
        ("amazon", "amazon.com"),
        ("netflix", "netflix.com"),
        ("spotify", "spotify.com"),
        ("notion", "notion.so"),
        ("figma", "figma.com"),
        ("trello", "trello.com"),
        ("jira", "jira.atlassian.com"),
        ("confluence", "confluence.atlassian.com"),
        ("asana", "asana.com"),
        ("monday", "monday.com"),
        ("outlook", "outlook.live.com"),
        ("teams", "teams.microsoft.com"),
        ("zoom", "zoom.us"),
        ("chatgpt", "chat.openai.com"),
        ("claude", "claude.ai"),
    ];

    let title_lower = title.to_lowercase();
    for (keyword, domain) in known_services {
        if title_lower.contains(keyword) {
            return Some((*domain).to_string());
        }
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_browser_chrome() {
        assert!(is_browser("Google Chrome", "chrome"));
        assert!(is_browser("Chrome", "chrome.exe"));
    }

    #[test]
    fn test_is_browser_firefox() {
        assert!(is_browser("Firefox", "firefox"));
        assert!(is_browser("Mozilla Firefox", "firefox.exe"));
    }

    #[test]
    fn test_is_not_browser() {
        assert!(!is_browser("Visual Studio Code", "code"));
        assert!(!is_browser("Slack", "slack"));
    }

    #[test]
    fn test_extract_url_gmail() {
        let url = extract_url_from_title("Gmail - Inbox - Google Chrome", "Chrome", "chrome");
        assert_eq!(url, Some("mail.google.com".to_string()));
    }

    #[test]
    fn test_extract_url_github() {
        let url = extract_url_from_title(
            "murmure/README.md at main · user/murmure - GitHub - Google Chrome",
            "Chrome",
            "chrome",
        );
        assert_eq!(url, Some("github.com".to_string()));
    }

    #[test]
    fn test_extract_url_domain_in_title() {
        let url = extract_url_from_title(
            "example.com - Welcome - Google Chrome",
            "Chrome",
            "chrome",
        );
        assert_eq!(url, Some("example.com".to_string()));
    }

    #[test]
    fn test_extract_url_non_browser() {
        let url = extract_url_from_title("Document.docx - Microsoft Word", "Word", "WINWORD.EXE");
        assert_eq!(url, None);
    }

    #[test]
    fn test_extract_url_empty_title() {
        let url = extract_url_from_title("", "Chrome", "chrome");
        assert_eq!(url, None);
    }
}
