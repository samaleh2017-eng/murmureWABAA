import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

export type LLMProvider =
    | 'ollama'
    | 'openai'
    | 'anthropic'
    | 'google'
    | 'openrouter';

export interface ProviderConfig {
    url: string;
    api_key: string;
    model: string;
    available_models: string[];
    enabled: boolean;
}

export interface LLMModel {
    name: string;
    description?: string;
}

export interface LLMMode {
    name: string;
    prompt: string;
    model: string;
    shortcut: string;
    provider?: LLMProvider;
}

export interface LLMConnectSettings {
    url: string;
    model: string;
    prompt: string;
    modes: LLMMode[];
    active_mode_index: number;
    onboarding_completed: boolean;
    active_provider: LLMProvider;
    provider_configs: Record<string, ProviderConfig>;
}

export interface OllamaModel {
    name: string;
}

export type ConnectionStatus =
    | 'disconnected'
    | 'connected'
    | 'testing'
    | 'error';

export const PROVIDER_LABELS: Record<LLMProvider, string> = {
    ollama: 'Ollama (Local)',
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    google: 'Google Gemini',
    openrouter: 'OpenRouter',
};

export const PROVIDER_DEFAULTS: Record<
    LLMProvider,
    { url: string; needsApiKey: boolean }
> = {
    ollama: { url: 'http://localhost:11434/api', needsApiKey: false },
    openai: { url: 'https://api.openai.com/v1', needsApiKey: true },
    anthropic: { url: 'https://api.anthropic.com/v1', needsApiKey: true },
    google: {
        url: 'https://generativelanguage.googleapis.com/v1beta',
        needsApiKey: true,
    },
    openrouter: { url: 'https://openrouter.ai/api/v1', needsApiKey: true },
};

const DEFAULT_SETTINGS: LLMConnectSettings = {
    url: 'http://localhost:11434/api',
    model: '',
    prompt: '',
    modes: [],
    active_mode_index: 0,
    onboarding_completed: false,
    active_provider: 'ollama',
    provider_configs: {},
};

export const useLLMConnect = () => {
    const { t } = useTranslation();
    const [settings, setSettings] =
        useState<LLMConnectSettings>(DEFAULT_SETTINGS);
    const [models, setModels] = useState<OllamaModel[]>([]);
    const [providerModels, setProviderModels] = useState<LLMModel[]>([]);
    const [connectionStatus, setConnectionStatus] =
        useState<ConnectionStatus>('disconnected');
    const [isLoading, setIsLoading] = useState(false);
    const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    useEffect(() => {
        const unlisten = listen<string>('llm-error', (event) => {
            toast.error(t('LLM processing failed') + ' : ' + event.payload);
        });

        return () => {
            unlisten.then((fn) => fn());
        };
    }, [t]);

    useEffect(() => {
        const unlisten = listen<LLMConnectSettings>(
            'llm-settings-updated',
            (event) => {
                setSettings(event.payload);
            }
        );

        return () => {
            unlisten.then((fn) => fn());
        };
    }, []);

    const loadSettings = async () => {
        try {
            const loadedSettings = await invoke<LLMConnectSettings>(
                'get_llm_connect_settings'
            );
            setSettings(loadedSettings);
            setIsSettingsLoaded(true);

            const activeProvider = loadedSettings.active_provider || 'ollama';
            const providerConfig =
                loadedSettings.provider_configs?.[activeProvider];

            if (activeProvider === 'ollama') {
                const urlToTest = providerConfig?.url || loadedSettings.url;
                if (urlToTest) {
                    const connected = await testConnection(urlToTest);
                    if (connected) {
                        await fetchModels(urlToTest);
                    }
                }
            } else if (providerConfig?.api_key) {
                await testProviderConnection(activeProvider, providerConfig);
                await fetchProviderModels(activeProvider, providerConfig);
            }
        } catch (error) {
            console.error('Failed to load LLM Connect settings:', error);
            setIsSettingsLoaded(true);
        }
    };

    const saveSettings = async (newSettings: LLMConnectSettings) => {
        try {
            await invoke('set_llm_connect_settings', { settings: newSettings });
            setSettings(newSettings);
        } catch (error) {
            console.error('Failed to save LLM Connect settings:', error);
            throw error;
        }
    };

    const testConnection = useCallback(
        async (url?: string) => {
            const testUrl = url || settings.url;
            setConnectionStatus('testing');

            try {
                const result = await invoke<boolean>('test_llm_connection', {
                    url: testUrl,
                });
                setConnectionStatus(result ? 'connected' : 'error');
                return result;
            } catch (error) {
                console.error('Connection test failed:', error);
                setConnectionStatus('error');
                return false;
            }
        },
        [settings.url]
    );

    const fetchModels = useCallback(
        async (url?: string) => {
            const fetchUrl = url || settings.url;
            setIsLoading(true);

            try {
                const fetchedModels = await invoke<OllamaModel[]>(
                    'fetch_ollama_models',
                    { url: fetchUrl }
                );
                setModels(fetchedModels);
                setConnectionStatus('connected');
                return fetchedModels;
            } catch (error) {
                console.error('Failed to fetch models:', error);
                setConnectionStatus('error');
                setModels([]);
                throw error;
            } finally {
                setIsLoading(false);
            }
        },
        [settings.url]
    );

    const testProviderConnection = useCallback(
        async (
            provider: LLMProvider,
            config: ProviderConfig
        ): Promise<boolean> => {
            setConnectionStatus('testing');

            try {
                const result = await invoke<boolean>(
                    'test_provider_connection',
                    {
                        provider,
                        config,
                    }
                );
                setConnectionStatus(result ? 'connected' : 'error');
                return result;
            } catch (error) {
                console.error('Provider connection test failed:', error);
                setConnectionStatus('error');
                return false;
            }
        },
        []
    );

    const fetchProviderModels = useCallback(
        async (
            provider: LLMProvider,
            config: ProviderConfig
        ): Promise<LLMModel[]> => {
            setIsLoading(true);

            try {
                const fetchedModels = await invoke<LLMModel[]>(
                    'fetch_provider_models',
                    { provider, config }
                );
                setProviderModels(fetchedModels);
                setConnectionStatus('connected');
                return fetchedModels;
            } catch (error) {
                console.error('Failed to fetch provider models:', error);
                setConnectionStatus('error');
                setProviderModels([]);
                throw error;
            } finally {
                setIsLoading(false);
            }
        },
        []
    );

    const setActiveProvider = useCallback(
        async (provider: LLMProvider) => {
            try {
                await invoke('set_active_provider', { provider });
                setSettings((prev) => ({ ...prev, active_provider: provider }));

                const config = settings.provider_configs?.[provider];
                if (provider === 'ollama') {
                    const url = config?.url || settings.url;
                    if (url) {
                        await testConnection(url);
                        await fetchModels(url);
                    }
                } else if (config?.api_key) {
                    await testProviderConnection(provider, config);
                    await fetchProviderModels(provider, config);
                } else {
                    setConnectionStatus('disconnected');
                    setProviderModels([]);
                }
            } catch (error) {
                console.error('Failed to set active provider:', error);
                throw error;
            }
        },
        [
            settings,
            testConnection,
            fetchModels,
            testProviderConnection,
            fetchProviderModels,
        ]
    );

    const saveProviderConfig = useCallback(
        async (provider: LLMProvider, config: ProviderConfig) => {
            try {
                await invoke('save_provider_config', { provider, config });
                setSettings((prev) => ({
                    ...prev,
                    provider_configs: {
                        ...prev.provider_configs,
                        [provider]: config,
                    },
                }));
            } catch (error) {
                console.error('Failed to save provider config:', error);
                throw error;
            }
        },
        []
    );

    const getProviderConfig = useCallback(
        (provider: LLMProvider): ProviderConfig | undefined => {
            return settings.provider_configs?.[provider];
        },
        [settings.provider_configs]
    );

    const getAvailableProviders = useCallback(async (): Promise<
        LLMProvider[]
    > => {
        try {
            return await invoke<LLMProvider[]>('get_available_providers');
        } catch (error) {
            console.error('Failed to get available providers:', error);
            return ['ollama', 'openai', 'anthropic', 'google', 'openrouter'];
        }
    }, []);

    const getCurrentModels = useCallback((): Array<{ name: string }> => {
        const activeProvider = settings.active_provider || 'ollama';
        if (activeProvider === 'ollama') {
            return models;
        }
        return providerModels;
    }, [settings.active_provider, models, providerModels]);

    const pullModel = useCallback(
        async (model: string) => {
            try {
                await invoke('pull_ollama_model', {
                    url: settings.url,
                    model,
                });
            } catch (error) {
                console.error('Failed to pull model:', error);
                throw error;
            }
        },
        [settings.url]
    );

    const completeOnboarding = async () => {
        await updateSettings({ onboarding_completed: true });
    };

    const updateSettings = async (updates: Partial<LLMConnectSettings>) => {
        const newSettings = { ...settings, ...updates };
        await saveSettings(newSettings);
    };

    return {
        settings,
        models,
        providerModels,
        connectionStatus,
        isLoading,
        isSettingsLoaded,
        loadSettings,
        saveSettings,
        updateSettings,
        testConnection,
        fetchModels,
        pullModel,
        completeOnboarding,
        testProviderConnection,
        fetchProviderModels,
        setActiveProvider,
        saveProviderConfig,
        getProviderConfig,
        getAvailableProviders,
        getCurrentModels,
    };
};
