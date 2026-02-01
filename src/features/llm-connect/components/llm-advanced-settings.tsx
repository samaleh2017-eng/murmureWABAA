import { useTranslation } from '@/i18n';
import { Typography } from '@/components/typography';
import { SettingsUI } from '@/components/settings-ui';
import { Input } from '@/components/input';
import { Page } from '@/components/page';
import { ProviderSelector } from './provider-selector';
import { ProviderConfigForm } from './provider-config-form';
import {
    LLMProvider,
    ProviderConfig,
    LLMModel,
    ConnectionStatus,
    PROVIDER_LABELS,
} from '../hooks/use-llm-connect';

interface LLMAdvancedSettingsProps {
    url: string;
    activeProvider: LLMProvider;
    providerConfig: ProviderConfig | undefined;
    connectionStatus: ConnectionStatus;
    isLoading: boolean;
    providerModels: LLMModel[];
    onUrlChange: (url: string) => void;
    onTestConnection: () => void;
    onInstallModel: () => void;
    onResetOnboarding: () => void;
    onProviderChange: (provider: LLMProvider) => Promise<void>;
    onSaveProviderConfig: (
        provider: LLMProvider,
        config: ProviderConfig
    ) => Promise<void>;
    onTestProviderConnection: (
        provider: LLMProvider,
        config: ProviderConfig
    ) => Promise<boolean>;
    onFetchProviderModels: (
        provider: LLMProvider,
        config: ProviderConfig
    ) => Promise<LLMModel[]>;
}

export const LLMAdvancedSettings = ({
    url,
    activeProvider,
    providerConfig,
    connectionStatus,
    isLoading,
    providerModels,
    onUrlChange,
    onTestConnection,
    onInstallModel,
    onResetOnboarding,
    onProviderChange,
    onSaveProviderConfig,
    onTestProviderConnection,
    onFetchProviderModels,
}: LLMAdvancedSettingsProps) => {
    const { t } = useTranslation();

    const isOllama = activeProvider === 'ollama';

    return (
        <SettingsUI.Container className="mb-6">
            <SettingsUI.Item>
                <SettingsUI.Description>
                    <Typography.Title>{t('LLM Provider')}</Typography.Title>
                    <Typography.Paragraph>
                        {t('Choose your LLM provider for text processing')}
                    </Typography.Paragraph>
                </SettingsUI.Description>
                <ProviderSelector
                    value={activeProvider}
                    onChange={onProviderChange}
                />
            </SettingsUI.Item>

            <SettingsUI.Separator />

            {isOllama ? (
                <SettingsUI.Item>
                    <SettingsUI.Description>
                        <Typography.Title>
                            {t('Ollama API URL')}
                        </Typography.Title>
                        <Typography.Paragraph>
                            {t('Local Ollama server address')}
                        </Typography.Paragraph>
                    </SettingsUI.Description>
                    <div className="flex items-center gap-3">
                        <Input
                            value={url}
                            onChange={(e) => onUrlChange(e.target.value)}
                            className="w-[200px]"
                            placeholder="http://localhost:11434/api"
                        />
                        <Page.SecondaryButton
                            onClick={onTestConnection}
                            size="sm"
                        >
                            {t('Test Connection')}
                        </Page.SecondaryButton>
                    </div>
                </SettingsUI.Item>
            ) : (
                <SettingsUI.Item className="flex-col items-start">
                    <SettingsUI.Description className="mb-4">
                        <Typography.Title>
                            {PROVIDER_LABELS[activeProvider]}{' '}
                            {t('Configuration')}
                        </Typography.Title>
                        <Typography.Paragraph>
                            {t('Configure your API credentials and model')}
                        </Typography.Paragraph>
                    </SettingsUI.Description>
                    <div className="w-full">
                        <ProviderConfigForm
                            provider={activeProvider}
                            config={providerConfig}
                            connectionStatus={connectionStatus}
                            isLoading={isLoading}
                            providerModels={providerModels}
                            onSaveConfig={(config) =>
                                onSaveProviderConfig(activeProvider, config)
                            }
                            onTestConnection={onTestProviderConnection}
                            onFetchModels={onFetchProviderModels}
                        />
                    </div>
                </SettingsUI.Item>
            )}

            <SettingsUI.Separator />

            {isOllama && (
                <>
                    <SettingsUI.Item>
                        <SettingsUI.Description>
                            <Typography.Title>{t('Tutorial')}</Typography.Title>
                        </SettingsUI.Description>

                        <div className="flex items-center gap-3">
                            <Page.SecondaryButton
                                onClick={onInstallModel}
                                size="sm"
                            >
                                {t('Install another model')}
                            </Page.SecondaryButton>
                            <Page.SecondaryButton
                                onClick={onResetOnboarding}
                                variant="ghost"
                                size="sm"
                                className="text-zinc-500 hover:text-zinc-300"
                            >
                                {t('Reset Tutorial')}
                            </Page.SecondaryButton>
                        </div>
                    </SettingsUI.Item>
                </>
            )}
        </SettingsUI.Container>
    );
};
