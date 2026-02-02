import { useTranslation } from '@/i18n';
import { useState, useEffect } from 'react';
import { useLLMConnect, LLMMode } from './hooks/use-llm-connect';
import { toast } from 'react-toastify';
import { getPresetLabel, getPromptByPreset } from './llm-connect.helpers';
import { LLMConnectOnboarding } from './onboarding/llm-connect-onboarding';
import { LLMHeader } from './components/llm-header';
import { ModeTabs } from './components/mode-tabs';
import { ModeContent } from './components/mode-content';
import { LLMAdvancedSettings } from './components/llm-advanced-settings';

export const LLMConnect = () => {
    const { t, i18n } = useTranslation();
    const {
        settings,
        models,
        providerModels,
        connectionStatus,
        isLoading,
        isSettingsLoaded,
        updateSettings,
        testConnection,
        fetchModels,
        pullModel,
        testProviderConnection,
        fetchProviderModels,
        setActiveProvider,
        saveProviderConfig,
        getProviderConfig,
        getCurrentModels,
    } = useLLMConnect();

    const [showModelSelector, setShowModelSelector] = useState(false);

    const activeModeIndex = settings.active_mode_index;
    const activeMode = settings.modes[activeModeIndex];
    const activeProvider = settings.active_provider || 'ollama';
    const providerConfig = getProviderConfig(activeProvider);

    const handleTestConnection = async () => {
        const result = await testConnection();
        if (result) {
            toast.success(t('Connection successful'), { autoClose: 1500 });
            await fetchModels();
        } else {
            toast.error(t('Connection failed'));
        }
    };

    const handleProviderChange = async (provider: typeof activeProvider) => {
        try {
            await setActiveProvider(provider);
            toast.success(t('Provider changed'), { autoClose: 1500 });
        } catch {
            toast.error(t('Failed to change provider'));
        }
    };

    const handleSaveProviderConfig = async (
        provider: typeof activeProvider,
        config: Parameters<typeof saveProviderConfig>[1]
    ) => {
        try {
            await saveProviderConfig(provider, config);
        } catch {
            toast.error(t('Failed to save configuration'));
        }
    };

    const handleTestProviderConnection = async (
        provider: typeof activeProvider,
        config: Parameters<typeof testProviderConnection>[1]
    ) => {
        const result = await testProviderConnection(provider, config);
        if (result) {
            toast.success(t('Connection successful'), { autoClose: 1500 });
        } else {
            toast.error(t('Connection failed'));
        }
        return result;
    };

    const handleFetchProviderModels = async (
        provider: typeof activeProvider,
        config: Parameters<typeof fetchProviderModels>[1]
    ) => {
        try {
            const fetchedModels = await fetchProviderModels(provider, config);
            toast.success(t('Models loaded'), { autoClose: 1500 });
            return fetchedModels;
        } catch {
            toast.error(t('Failed to fetch models'));
            return [];
        }
    };

    const buildDefaultMode = (modelName: string): LLMMode => ({
        name: t(getPresetLabel('general')),
        prompt: getPromptByPreset('general', i18n.language),
        model: modelName,
        shortcut: 'Ctrl + Shift + 1',
    });

    const handleResetOnboarding = async () => {
        try {
            await updateSettings({
                onboarding_completed: false,
                model: '',
                prompt: '',
                modes: [buildDefaultMode('')],
                active_mode_index: 0,
            });
        } catch {
            toast.error(t('Failed to reset onboarding'));
        }
    };

    useEffect(() => {
        if (
            isSettingsLoaded &&
            !settings.onboarding_completed &&
            !showModelSelector &&
            settings.model === ''
        ) {
            const defaultMode = buildDefaultMode('');
            const hasOneMode = settings.modes.length === 1;
            const isDefaultMode =
                hasOneMode &&
                settings.active_mode_index === 0 &&
                settings.modes[0]?.name === defaultMode.name &&
                settings.modes[0]?.prompt === defaultMode.prompt &&
                settings.modes[0]?.model === '' &&
                settings.modes[0]?.shortcut === defaultMode.shortcut;

            if (!isDefaultMode) {
                updateSettings({
                    model: '',
                    prompt: '',
                    modes: [defaultMode],
                    active_mode_index: 0,
                });
            }
        }
    }, [
        isSettingsLoaded,
        settings.onboarding_completed,
        settings.model,
        settings.modes,
        settings.active_mode_index,
        showModelSelector,
        i18n.language,
        updateSettings,
        t,
    ]);

    if (!isSettingsLoaded || !settings.modes || settings.modes.length === 0) {
        return (
            <div className="p-8 text-center text-zinc-500">
                {t('Loading...')}
            </div>
        );
    }

    if (showModelSelector) {
        return (
            <main>
                <LLMConnectOnboarding
                    settings={settings}
                    testConnection={testConnection}
                    pullModel={pullModel}
                    updateSettings={updateSettings}
                    models={models}
                    fetchModels={fetchModels}
                    isInstallOnly={true}
                    completeOnboarding={async () => {
                        await fetchModels();
                        setShowModelSelector(false);
                    }}
                />
            </main>
        );
    }

    if (!settings.onboarding_completed) {
        return (
            <main>
                <LLMConnectOnboarding
                    settings={settings}
                    testConnection={testConnection}
                    pullModel={pullModel}
                    updateSettings={updateSettings}
                    models={models}
                    fetchModels={fetchModels}
                    testProviderConnection={testProviderConnection}
                    saveProviderConfig={saveProviderConfig}
                    setActiveProvider={setActiveProvider}
                    fetchProviderModels={async (provider, config) => {
                        const models = await fetchProviderModels(provider, config);
                        return models.map((m) => m.name);
                    }}
                    completeOnboarding={async () => {
                        await fetchModels();
                        await updateSettings({ onboarding_completed: true });
                    }}
                />
            </main>
        );
    }

    const currentModels = getCurrentModels();

    return (
        <main>
            <div className="space-y-6">
                <LLMHeader connectionStatus={connectionStatus} />

                <ModeTabs
                    modes={settings.modes}
                    activeModeIndex={activeModeIndex}
                    models={currentModels}
                    updateSettings={updateSettings}
                />

                {activeMode && (
                    <>
                        <ModeContent
                            activeMode={activeMode}
                            activeModeIndex={activeModeIndex}
                            modes={settings.modes}
                            models={currentModels}
                            isLoading={isLoading}
                            updateSettings={updateSettings}
                            onRefreshModels={handleTestConnection}
                        />

                        <LLMAdvancedSettings
                            url={settings.url}
                            activeProvider={activeProvider}
                            providerConfig={providerConfig}
                            connectionStatus={connectionStatus}
                            isLoading={isLoading}
                            providerModels={providerModels}
                            onUrlChange={(url) => updateSettings({ url })}
                            onTestConnection={handleTestConnection}
                            onInstallModel={() => setShowModelSelector(true)}
                            onResetOnboarding={handleResetOnboarding}
                            onProviderChange={handleProviderChange}
                            onSaveProviderConfig={handleSaveProviderConfig}
                            onTestProviderConnection={
                                handleTestProviderConnection
                            }
                            onFetchProviderModels={handleFetchProviderModels}
                        />
                    </>
                )}
            </div>
        </main>
    );
};
