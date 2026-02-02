import { invoke } from '@tauri-apps/api/core';
import { useState, useEffect, useCallback } from 'react';
import {
    ContextMappingSettings,
    ContextRule,
} from '../context-detection.types';

interface RawContextRule {
    id: string;
    name: string;
    pattern: string;
    pattern_type: string;
    target_mode_index: number;
    priority: number;
    enabled: boolean;
}

interface RawContextMappingSettings {
    auto_detection_enabled: boolean;
    rules: RawContextRule[];
    default_mode_index: number;
}

const convertFromRaw = (
    raw: RawContextMappingSettings
): ContextMappingSettings => ({
    autoDetectionEnabled: raw.auto_detection_enabled,
    defaultModeIndex: raw.default_mode_index,
    rules: raw.rules.map((rule) => ({
        id: rule.id,
        name: rule.name,
        pattern: rule.pattern,
        patternType: rule.pattern_type as ContextRule['patternType'],
        targetModeIndex: rule.target_mode_index,
        priority: rule.priority,
        enabled: rule.enabled,
    })),
});

const convertToRaw = (
    settings: ContextMappingSettings
): RawContextMappingSettings => ({
    auto_detection_enabled: settings.autoDetectionEnabled,
    default_mode_index: settings.defaultModeIndex,
    rules: settings.rules.map((rule) => ({
        id: rule.id,
        name: rule.name,
        pattern: rule.pattern,
        pattern_type: rule.patternType,
        target_mode_index: rule.targetModeIndex,
        priority: rule.priority,
        enabled: rule.enabled,
    })),
});

export const useContextMappingSettings = () => {
    const [settings, setSettings] = useState<ContextMappingSettings | null>(
        null
    );
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const loadSettings = useCallback(async () => {
        try {
            setLoading(true);
            const raw = await invoke<RawContextMappingSettings>(
                'get_context_mapping_settings'
            );
            setSettings(convertFromRaw(raw));
        } catch (error) {
            console.error('Failed to load context mapping settings:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    const saveSettings = useCallback(
        async (newSettings: ContextMappingSettings) => {
            try {
                setSaving(true);
                await invoke('save_context_mapping_settings', {
                    mapping: convertToRaw(newSettings),
                });
                setSettings(newSettings);
            } catch (error) {
                console.error(
                    'Failed to save context mapping settings:',
                    error
                );
                throw error;
            } finally {
                setSaving(false);
            }
        },
        []
    );

    const setAutoDetectionEnabled = useCallback(
        async (enabled: boolean) => {
            if (settings == null) {
                return;
            }
            const newSettings = { ...settings, autoDetectionEnabled: enabled };
            await saveSettings(newSettings);
        },
        [settings, saveSettings]
    );

    const setDefaultModeIndex = useCallback(
        async (index: number) => {
            if (settings == null) {
                return;
            }
            const newSettings = { ...settings, defaultModeIndex: index };
            await saveSettings(newSettings);
        },
        [settings, saveSettings]
    );

    const addRule = useCallback(
        async (rule: Omit<ContextRule, 'id'>) => {
            if (settings == null) {
                return;
            }
            const newRule: ContextRule = {
                ...rule,
                id: crypto.randomUUID(),
            };
            const newSettings = {
                ...settings,
                rules: [...settings.rules, newRule],
            };
            await saveSettings(newSettings);
        },
        [settings, saveSettings]
    );

    const updateRule = useCallback(
        async (id: string, updates: Partial<ContextRule>) => {
            if (settings == null) {
                return;
            }
            const newSettings = {
                ...settings,
                rules: settings.rules.map((rule) =>
                    rule.id === id ? { ...rule, ...updates } : rule
                ),
            };
            await saveSettings(newSettings);
        },
        [settings, saveSettings]
    );

    const deleteRule = useCallback(
        async (id: string) => {
            if (settings == null) {
                return;
            }
            const newSettings = {
                ...settings,
                rules: settings.rules.filter((rule) => rule.id !== id),
            };
            await saveSettings(newSettings);
        },
        [settings, saveSettings]
    );

    const toggleRuleEnabled = useCallback(
        async (id: string) => {
            if (settings == null) {
                return;
            }
            const rule = settings.rules.find((r) => r.id === id);
            if (rule != null) {
                await updateRule(id, { enabled: !rule.enabled });
            }
        },
        [settings, updateRule]
    );

    return {
        settings,
        loading,
        saving,
        setAutoDetectionEnabled,
        setDefaultModeIndex,
        addRule,
        updateRule,
        deleteRule,
        toggleRuleEnabled,
        reload: loadSettings,
    };
};
