use serde::{Deserialize, Serialize};

use super::types::ActiveContext;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContextRule {
    pub id: String,
    pub name: String,
    pub pattern: String,
    pub pattern_type: PatternType,
    pub target_mode_index: usize,
    pub priority: u32,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum PatternType {
    AppName,
    ProcessName,
    Url,
    WindowTitle,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContextMappingSettings {
    pub auto_detection_enabled: bool,
    pub rules: Vec<ContextRule>,
    pub default_mode_index: usize,
}

impl Default for ContextMappingSettings {
    fn default() -> Self {
        Self {
            auto_detection_enabled: true,
            rules: default_rules(),
            default_mode_index: 0,
        }
    }
}

fn default_rules() -> Vec<ContextRule> {
    vec![
        ContextRule {
            id: "vscode".to_string(),
            name: "VS Code → Developer".to_string(),
            pattern: "code".to_string(),
            pattern_type: PatternType::ProcessName,
            target_mode_index: 3,
            priority: 100,
            enabled: true,
        },
        ContextRule {
            id: "cursor".to_string(),
            name: "Cursor → Developer".to_string(),
            pattern: "cursor".to_string(),
            pattern_type: PatternType::ProcessName,
            target_mode_index: 3,
            priority: 100,
            enabled: true,
        },
        ContextRule {
            id: "gmail".to_string(),
            name: "Gmail → Email".to_string(),
            pattern: "mail.google".to_string(),
            pattern_type: PatternType::Url,
            target_mode_index: 5,
            priority: 90,
            enabled: true,
        },
        ContextRule {
            id: "outlook".to_string(),
            name: "Outlook → Email".to_string(),
            pattern: "outlook".to_string(),
            pattern_type: PatternType::Url,
            target_mode_index: 5,
            priority: 90,
            enabled: true,
        },
        ContextRule {
            id: "slack".to_string(),
            name: "Slack → Chat".to_string(),
            pattern: "slack".to_string(),
            pattern_type: PatternType::AppName,
            target_mode_index: 6,
            priority: 80,
            enabled: true,
        },
        ContextRule {
            id: "discord".to_string(),
            name: "Discord → Chat".to_string(),
            pattern: "discord".to_string(),
            pattern_type: PatternType::AppName,
            target_mode_index: 6,
            priority: 80,
            enabled: true,
        },
        ContextRule {
            id: "whatsapp".to_string(),
            name: "WhatsApp → Chat".to_string(),
            pattern: "whatsapp".to_string(),
            pattern_type: PatternType::AppName,
            target_mode_index: 6,
            priority: 80,
            enabled: true,
        },
    ]
}

pub fn find_matching_mode(context: &ActiveContext, settings: &ContextMappingSettings) -> usize {
    if !settings.auto_detection_enabled {
        return settings.default_mode_index;
    }

    let mut matched_rules: Vec<&ContextRule> = settings
        .rules
        .iter()
        .filter(|rule| rule.enabled && matches_pattern(context, rule))
        .collect();

    matched_rules.sort_by(|a, b| b.priority.cmp(&a.priority));

    matched_rules
        .first()
        .map(|r| r.target_mode_index)
        .unwrap_or(settings.default_mode_index)
}

fn matches_pattern(context: &ActiveContext, rule: &ContextRule) -> bool {
    let pattern = rule.pattern.to_lowercase();
    match rule.pattern_type {
        PatternType::AppName => context.app_name.to_lowercase().contains(&pattern),
        PatternType::ProcessName => context.process_name.to_lowercase().contains(&pattern),
        PatternType::Url => context
            .detected_url
            .as_ref()
            .map(|u| u.to_lowercase().contains(&pattern))
            .unwrap_or(false),
        PatternType::WindowTitle => context.window_title.to_lowercase().contains(&pattern),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_matches_vscode() {
        let context = ActiveContext {
            app_name: "Visual Studio Code".to_string(),
            process_name: "code".to_string(),
            window_title: "main.rs - project".to_string(),
            detected_url: None,
        };
        let settings = ContextMappingSettings::default();
        let mode = find_matching_mode(&context, &settings);
        assert_eq!(mode, 3);
    }

    #[test]
    fn test_matches_gmail() {
        let context = ActiveContext {
            app_name: "Chrome".to_string(),
            process_name: "chrome".to_string(),
            window_title: "Inbox - Gmail".to_string(),
            detected_url: Some("https://mail.google.com/mail/u/0".to_string()),
        };
        let settings = ContextMappingSettings::default();
        let mode = find_matching_mode(&context, &settings);
        assert_eq!(mode, 5);
    }

    #[test]
    fn test_no_match_returns_default() {
        let context = ActiveContext {
            app_name: "Unknown App".to_string(),
            process_name: "unknown".to_string(),
            window_title: "Some Window".to_string(),
            detected_url: None,
        };
        let settings = ContextMappingSettings::default();
        let mode = find_matching_mode(&context, &settings);
        assert_eq!(mode, 0);
    }

    #[test]
    fn test_disabled_detection_returns_default() {
        let context = ActiveContext {
            app_name: "Visual Studio Code".to_string(),
            process_name: "code".to_string(),
            window_title: "main.rs - project".to_string(),
            detected_url: None,
        };
        let mut settings = ContextMappingSettings::default();
        settings.auto_detection_enabled = false;
        let mode = find_matching_mode(&context, &settings);
        assert_eq!(mode, 0);
    }
}
