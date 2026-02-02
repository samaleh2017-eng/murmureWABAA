export type PatternType = 'app_name' | 'process_name' | 'url' | 'window_title';

export interface ContextRule {
    id: string;
    name: string;
    pattern: string;
    patternType: PatternType;
    targetModeKey: string;
    priority: number;
    enabled: boolean;
}

export interface ContextMappingSettings {
    autoDetectionEnabled: boolean;
    rules: ContextRule[];
    defaultModeKey: string;
}

export interface ContextRuleFormData {
    name: string;
    pattern: string;
    patternType: PatternType;
    targetModeKey: string;
    priority: number;
    enabled: boolean;
}
