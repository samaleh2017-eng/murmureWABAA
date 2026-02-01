import { useState, useEffect } from 'react';
import { useTranslation } from '@/i18n';
import { Input } from '@/components/input';
import { Page } from '@/components/page';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/select';
import { Eye, EyeOff, RefreshCw, Plug, Check, X, Loader2 } from 'lucide-react';
import {
    LLMProvider,
    ProviderConfig,
    LLMModel,
    PROVIDER_DEFAULTS,
    ConnectionStatus,
} from '../hooks/use-llm-connect';

interface ProviderConfigFormProps {
    provider: LLMProvider;
    config: ProviderConfig | undefined;
    connectionStatus: ConnectionStatus;
    isLoading: boolean;
    providerModels: LLMModel[];
    onSaveConfig: (config: ProviderConfig) => Promise<void>;
    onTestConnection: (
        provider: LLMProvider,
        config: ProviderConfig
    ) => Promise<boolean>;
    onFetchModels: (
        provider: LLMProvider,
        config: ProviderConfig
    ) => Promise<LLMModel[]>;
}

export const ProviderConfigForm = ({
    provider,
    config,
    connectionStatus,
    isLoading,
    providerModels,
    onSaveConfig,
    onTestConnection,
    onFetchModels,
}: ProviderConfigFormProps) => {
    const { t } = useTranslation();
    const [showApiKey, setShowApiKey] = useState(false);
    const [localUrl, setLocalUrl] = useState('');
    const [localApiKey, setLocalApiKey] = useState('');
    const [localModel, setLocalModel] = useState('');
    const [isTesting, setIsTesting] = useState(false);
    const [isFetching, setIsFetching] = useState(false);

    const defaults = PROVIDER_DEFAULTS[provider];
    const needsApiKey = defaults.needsApiKey;

    useEffect(() => {
        setLocalUrl(config?.url || defaults.url);
        setLocalApiKey(config?.api_key || '');
        setLocalModel(config?.model || '');
    }, [provider, config, defaults.url]);

    const buildConfig = (): ProviderConfig => ({
        url: localUrl || defaults.url,
        api_key: localApiKey,
        model: localModel,
        available_models: config?.available_models || [],
        enabled: true,
    });

    const handleTestConnection = async () => {
        setIsTesting(true);
        try {
            const testConfig = buildConfig();
            const success = await onTestConnection(provider, testConfig);
            if (success) {
                await onSaveConfig(testConfig);
            }
        } finally {
            setIsTesting(false);
        }
    };

    const handleFetchModels = async () => {
        setIsFetching(true);
        try {
            const testConfig = buildConfig();
            const models = await onFetchModels(provider, testConfig);
            const updatedConfig: ProviderConfig = {
                ...testConfig,
                available_models: models.map((m) => m.name),
            };
            await onSaveConfig(updatedConfig);
        } catch (error) {
            console.error('Failed to fetch models:', error);
        } finally {
            setIsFetching(false);
        }
    };

    const handleModelChange = async (modelName: string) => {
        setLocalModel(modelName);
        const updatedConfig = buildConfig();
        updatedConfig.model = modelName;
        await onSaveConfig(updatedConfig);
    };

    const handleUrlBlur = async () => {
        const updatedConfig = buildConfig();
        await onSaveConfig(updatedConfig);
    };

    const handleApiKeyBlur = async () => {
        const updatedConfig = buildConfig();
        await onSaveConfig(updatedConfig);
    };

    const getStatusIcon = () => {
        if (isTesting || isLoading) {
            return <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />;
        }
        switch (connectionStatus) {
            case 'connected':
                return <Check className="h-4 w-4 text-green-500" />;
            case 'error':
                return <X className="h-4 w-4 text-red-500" />;
            case 'testing':
                return (
                    <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                );
            default:
                return <span className="h-4 w-4 rounded-full bg-zinc-600" />;
        }
    };

    const availableModels =
        providerModels.length > 0
            ? providerModels
            : (config?.available_models || []).map((name) => ({ name }));

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-400">{t('Status')}:</span>
                {getStatusIcon()}
                <span className="text-sm text-zinc-400">
                    {connectionStatus === 'connected' && t('Connected')}
                    {connectionStatus === 'error' && t('Connection failed')}
                    {connectionStatus === 'testing' && t('Testing...')}
                    {connectionStatus === 'disconnected' && t('Not connected')}
                </span>
            </div>

            <div className="space-y-3">
                <div>
                    <label className="text-sm text-zinc-400 mb-1 block">
                        {t('API URL')}
                    </label>
                    <Input
                        value={localUrl}
                        onChange={(e) => setLocalUrl(e.target.value)}
                        onBlur={handleUrlBlur}
                        placeholder={defaults.url}
                        className="w-full"
                        data-testid="provider-url-input"
                    />
                </div>

                {needsApiKey && (
                    <div>
                        <label className="text-sm text-zinc-400 mb-1 block">
                            {t('API Key')}
                        </label>
                        <div className="relative">
                            <Input
                                type={showApiKey ? 'text' : 'password'}
                                value={localApiKey}
                                onChange={(e) => setLocalApiKey(e.target.value)}
                                onBlur={handleApiKeyBlur}
                                placeholder={t('Enter your API key')}
                                className="w-full pr-10"
                                data-testid="provider-api-key-input"
                            />
                            <button
                                type="button"
                                onClick={() => setShowApiKey(!showApiKey)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-300"
                            >
                                {showApiKey ? (
                                    <EyeOff className="h-4 w-4" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                    </div>
                )}

                <div>
                    <label className="text-sm text-zinc-400 mb-1 block">
                        {t('Model')}
                    </label>
                    <div className="flex items-center gap-2">
                        <Select
                            value={localModel}
                            onValueChange={handleModelChange}
                            disabled={availableModels.length === 0}
                        >
                            <SelectTrigger
                                className="flex-1"
                                data-testid="provider-model-select"
                            >
                                <SelectValue
                                    placeholder={
                                        availableModels.length === 0
                                            ? t('Fetch models first')
                                            : t('Select a model')
                                    }
                                />
                            </SelectTrigger>
                            <SelectContent>
                                {availableModels.map((model) => (
                                    <SelectItem
                                        key={model.name}
                                        value={model.name}
                                    >
                                        {model.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Page.SecondaryButton
                            size="sm"
                            onClick={handleFetchModels}
                            disabled={
                                isFetching ||
                                (needsApiKey && localApiKey.length === 0)
                            }
                            data-testid="fetch-models-button"
                        >
                            <RefreshCw
                                className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`}
                            />
                        </Page.SecondaryButton>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
                <Page.SecondaryButton
                    size="sm"
                    onClick={handleTestConnection}
                    disabled={
                        isTesting || (needsApiKey && localApiKey.length === 0)
                    }
                    data-testid="test-provider-connection-button"
                >
                    {isTesting ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                        <Plug className="h-4 w-4 mr-2" />
                    )}
                    {t('Test Connection')}
                </Page.SecondaryButton>
            </div>
        </div>
    );
};
