import { invoke } from '@tauri-apps/api/core';
import { useState, useEffect, useCallback } from 'react';

export type STTProvider =
    | 'parakeet'
    | 'openai'
    | 'google_cloud'
    | 'gemini'
    | 'groq';
export type STTMode = 'offline' | 'online';
export type GoogleAuthMethod = 'api_key' | 'service_account';
export type ConnectionStatus =
    | 'disconnected'
    | 'connected'
    | 'testing'
    | 'error';

export interface STTProviderConfig {
    url: string;
    api_key: string;
    model: string;
    available_models: string[];
    enabled: boolean;
    google_project_id?: string;
    google_auth_method?: GoogleAuthMethod;
    google_service_account_json?: string;
}

export interface STTSettings {
    mode: STTMode;
    active_provider: STTProvider;
    provider_configs: Record<string, STTProviderConfig>;
    language: string;
}

export const STT_PROVIDER_LABELS: Record<STTProvider, string> = {
    parakeet: 'Parakeet (Local)',
    openai: 'OpenAI Whisper',
    google_cloud: 'Google Cloud STT (Chirp 3)',
    gemini: 'Google Gemini',
    groq: 'Groq Whisper',
};

export const STT_PROVIDER_DEFAULTS: Record<
    Exclude<STTProvider, 'parakeet'>,
    {
        url: string;
        model: string;
        needsApiKey: boolean;
        description: string;
    }
> = {
    openai: {
        url: 'https://api.openai.com/v1',
        model: 'whisper-1',
        needsApiKey: true,
        description: "Modèle Whisper d'OpenAI, précis et fiable",
    },
    google_cloud: {
        url: 'https://speech.googleapis.com/v2',
        model: 'chirp_3',
        needsApiKey: true,
        description: 'Chirp 3: 200+ langues, très haute précision',
    },
    gemini: {
        url: 'https://generativelanguage.googleapis.com/v1beta',
        model: 'gemini-2.5-flash',
        needsApiKey: true,
        description:
            'Gemini multimodal: transcription + compréhension contextuelle',
    },
    groq: {
        url: 'https://api.groq.com/openai/v1',
        model: 'whisper-large-v3-turbo',
        needsApiKey: true,
        description: 'Whisper ultra-rapide (300x temps réel)',
    },
};

export const ONLINE_PROVIDERS: Exclude<STTProvider, 'parakeet'>[] = [
    'openai',
    'google_cloud',
    'gemini',
    'groq',
];

export const DEFAULT_STT_SETTINGS: STTSettings = {
    mode: 'offline',
    active_provider: 'parakeet',
    provider_configs: {},
    language: 'fr-FR',
};

export const SUPPORTED_LANGUAGES = [
    { code: 'fr-FR', label: 'Français (France)' },
    { code: 'en-US', label: 'English (US)' },
    { code: 'en-GB', label: 'English (UK)' },
    { code: 'de-DE', label: 'Deutsch' },
    { code: 'es-ES', label: 'Español' },
    { code: 'it-IT', label: 'Italiano' },
    { code: 'pt-PT', label: 'Português (Portugal)' },
    { code: 'pt-BR', label: 'Português (Brasil)' },
    { code: 'nl-NL', label: 'Nederlands' },
    { code: 'pl-PL', label: 'Polski' },
    { code: 'ru-RU', label: 'Русский' },
    { code: 'ja-JP', label: '日本語' },
    { code: 'ko-KR', label: '한국어' },
    { code: 'zh-CN', label: '中文 (简体)' },
    { code: 'ar-SA', label: 'العربية' },
];

export const useSTTSettings = () => {
    const [settings, setSettings] = useState<STTSettings>(DEFAULT_STT_SETTINGS);
    const [isLoading, setIsLoading] = useState(false);
    const [connectionStatus, setConnectionStatus] =
        useState<ConnectionStatus>('disconnected');
    const [availableModels, setAvailableModels] = useState<string[]>([]);

    const loadSettings = useCallback(async () => {
        try {
            const loaded = await invoke<STTSettings>('get_stt_settings');
            setSettings(loaded);
        } catch (error) {
            console.error('Failed to load STT settings:', error);
        }
    }, []);

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    const updateSettings = useCallback(
        async (updates: Partial<STTSettings>) => {
            const newSettings = { ...settings, ...updates };
            try {
                await invoke('set_stt_settings', { settings: newSettings });
                setSettings(newSettings);
            } catch (error) {
                console.error('Failed to save STT settings:', error);
            }
        },
        [settings]
    );

    const testConnection = useCallback(
        async (provider: STTProvider, config: STTProviderConfig) => {
            setConnectionStatus('testing');
            try {
                const result = await invoke<boolean>(
                    'test_stt_provider_connection',
                    {
                        provider,
                        config,
                    }
                );
                setConnectionStatus(result ? 'connected' : 'error');
                return result;
            } catch (error) {
                console.error('Failed to test STT connection:', error);
                setConnectionStatus('error');
                return false;
            }
        },
        []
    );

    const fetchModels = useCallback(
        async (provider: STTProvider, config: STTProviderConfig) => {
            setIsLoading(true);
            try {
                const models = await invoke<string[]>(
                    'fetch_stt_provider_models',
                    {
                        provider,
                        config,
                    }
                );
                setAvailableModels(models);
                return models;
            } catch (error) {
                console.error('Failed to fetch STT models:', error);
                return [];
            } finally {
                setIsLoading(false);
            }
        },
        []
    );

    const saveProviderConfig = useCallback(
        async (provider: STTProvider, config: STTProviderConfig) => {
            try {
                await invoke('save_stt_provider_config', { provider, config });
                setSettings((prev) => ({
                    ...prev,
                    provider_configs: {
                        ...prev.provider_configs,
                        [provider]: config,
                    },
                }));
            } catch (error) {
                console.error('Failed to save STT provider config:', error);
            }
        },
        []
    );

    const getProviderConfig = useCallback(
        (provider: STTProvider): STTProviderConfig | undefined => {
            return settings.provider_configs?.[provider];
        },
        [settings.provider_configs]
    );

    return {
        settings,
        isLoading,
        connectionStatus,
        availableModels,
        loadSettings,
        updateSettings,
        testConnection,
        fetchModels,
        saveProviderConfig,
        getProviderConfig,
        setConnectionStatus,
    };
};
