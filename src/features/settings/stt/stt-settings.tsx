import { Page } from '@/components/page';
import { Typography } from '@/components/typography';
import { SettingsUI } from '@/components/settings-ui';
import { useTranslation } from '@/i18n';
import { useSTTSettings, STTProvider, ONLINE_PROVIDERS } from './hooks/use-stt-settings';
import { STTModeSelector } from './components/stt-mode-selector';
import { STTProviderSelector } from './components/stt-provider-selector';
import { STTProviderConfigForm } from './components/stt-provider-config-form';
import { STTLanguageSelector } from './components/stt-language-selector';
import { Mic, Monitor, Cloud, Globe } from 'lucide-react';

export const STTSettings = () => {
    const { t } = useTranslation();
    const {
        settings,
        isLoading,
        connectionStatus,
        availableModels,
        updateSettings,
        testConnection,
        saveProviderConfig,
        getProviderConfig,
        fetchModels,
    } = useSTTSettings();

    const handleModeChange = async (mode: 'offline' | 'online') => {
        const updates: Parameters<typeof updateSettings>[0] = { mode };
        if (mode === 'offline') {
            updates.active_provider = 'parakeet';
        } else if (mode === 'online' && settings.active_provider === 'parakeet') {
            updates.active_provider = 'openai';
        }
        await updateSettings(updates);
    };

    const handleProviderChange = async (provider: STTProvider) => {
        await updateSettings({ active_provider: provider });
    };

    const activeOnlineProvider = ONLINE_PROVIDERS.includes(settings.active_provider as Exclude<STTProvider, 'parakeet'>)
        ? (settings.active_provider as Exclude<STTProvider, 'parakeet'>)
        : 'openai';

    return (
        <main className="space-y-8">
            <Page.Header>
                <Typography.MainTitle className="flex items-center gap-2">
                    <Mic className="w-6 h-6 text-sky-400" />
                    {t('Speech-to-Text')}
                </Typography.MainTitle>
                <Typography.Paragraph className="text-zinc-400">
                    {t('Configure how Murmure transcribes your voice')}
                </Typography.Paragraph>
            </Page.Header>

            <SettingsUI.Container>
                <SettingsUI.Item>
                    <SettingsUI.Description>
                        <Typography.Title className="flex items-center gap-2">
                            {settings.mode === 'offline' ? (
                                <Monitor className="w-4 h-4 text-zinc-400" />
                            ) : (
                                <Cloud className="w-4 h-4 text-zinc-400" />
                            )}
                            {t('Transcription Mode')}
                        </Typography.Title>
                        <Typography.Paragraph>
                            {t('Choose between offline (local) and online (cloud) transcription')}
                        </Typography.Paragraph>
                    </SettingsUI.Description>
                </SettingsUI.Item>
                <div className="px-4 pb-4">
                    <STTModeSelector
                        value={settings.mode}
                        onChange={handleModeChange}
                    />
                </div>

                {settings.mode === 'online' && (
                    <>
                        <SettingsUI.Separator />
                        <SettingsUI.Item>
                            <SettingsUI.Description>
                                <Typography.Title>
                                    {t('Provider')}
                                </Typography.Title>
                                <Typography.Paragraph>
                                    {t('Select your cloud transcription provider')}
                                </Typography.Paragraph>
                            </SettingsUI.Description>
                            <div className="w-64">
                                <STTProviderSelector
                                    value={activeOnlineProvider}
                                    onChange={handleProviderChange}
                                />
                            </div>
                        </SettingsUI.Item>

                        <SettingsUI.Separator />
                        <SettingsUI.Item className="flex-col items-start">
                            <SettingsUI.Description className="w-full mb-4">
                                <Typography.Title>
                                    {t('Configuration')}
                                </Typography.Title>
                                <Typography.Paragraph>
                                    {t('Configure your API credentials and model')}
                                </Typography.Paragraph>
                            </SettingsUI.Description>
                            <div className="w-full">
                                <STTProviderConfigForm
                                    provider={activeOnlineProvider}
                                    config={getProviderConfig(activeOnlineProvider)}
                                    connectionStatus={connectionStatus}
                                    isLoading={isLoading}
                                    availableModels={availableModels}
                                    onSaveConfig={(config) => saveProviderConfig(activeOnlineProvider, config)}
                                    onTestConnection={testConnection}
                                    onFetchModels={fetchModels}
                                />
                            </div>
                        </SettingsUI.Item>
                    </>
                )}

                <SettingsUI.Separator />
                <SettingsUI.Item>
                    <SettingsUI.Description>
                        <Typography.Title className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-zinc-400" />
                            {t('Language')}
                        </Typography.Title>
                        <Typography.Paragraph>
                            {t('Select the language for transcription')}
                        </Typography.Paragraph>
                    </SettingsUI.Description>
                    <div className="w-64">
                        <STTLanguageSelector
                            value={settings.language}
                            onChange={(language) => updateSettings({ language })}
                        />
                    </div>
                </SettingsUI.Item>
            </SettingsUI.Container>
        </main>
    );
};
