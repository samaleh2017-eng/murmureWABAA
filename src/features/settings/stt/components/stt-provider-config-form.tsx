import { useState, useEffect } from 'react';
import { Eye, EyeOff, RefreshCw, Plug, Check, X, Loader2, Upload } from 'lucide-react';
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
import {
    STTProvider,
    STTProviderConfig,
    STT_PROVIDER_DEFAULTS,
    ConnectionStatus,
    GoogleAuthMethod,
} from '../hooks/use-stt-settings';
import { open } from '@tauri-apps/plugin-dialog';
import { Button } from '@/components/button';

interface STTProviderConfigFormProps {
    provider: Exclude<STTProvider, 'parakeet'>;
    config: STTProviderConfig | undefined;
    connectionStatus: ConnectionStatus;
    isLoading: boolean;
    availableModels: string[];
    onSaveConfig: (config: STTProviderConfig) => Promise<void>;
    onTestConnection: (provider: STTProvider, config: STTProviderConfig) => Promise<boolean>;
    onFetchModels: (provider: STTProvider, config: STTProviderConfig) => Promise<string[]>;
}

export const STTProviderConfigForm = ({
    provider,
    config,
    connectionStatus,
    isLoading,
    availableModels,
    onSaveConfig,
    onTestConnection,
    onFetchModels,
}: STTProviderConfigFormProps) => {
    const { t } = useTranslation();
    const [showApiKey, setShowApiKey] = useState(false);
    const [localUrl, setLocalUrl] = useState('');
    const [localApiKey, setLocalApiKey] = useState('');
    const [localModel, setLocalModel] = useState('');
    const [googleAuthMethod, setGoogleAuthMethod] = useState<GoogleAuthMethod>('api_key');
    const [googleProjectId, setGoogleProjectId] = useState('');
    const [serviceAccountPath, setServiceAccountPath] = useState('');
    const [isTesting, setIsTesting] = useState(false);
    const [isFetching, setIsFetching] = useState(false);

    const defaults = STT_PROVIDER_DEFAULTS[provider];

    useEffect(() => {
        setLocalUrl(config?.url || defaults.url);
        setLocalApiKey(config?.api_key || '');
        setLocalModel(config?.model || defaults.model);
        setGoogleAuthMethod(config?.google_auth_method || 'api_key');
        setGoogleProjectId(config?.google_project_id || '');
        setServiceAccountPath(config?.google_service_account_json || '');
    }, [provider, config, defaults.url, defaults.model]);

    const buildConfig = (): STTProviderConfig => {
        const newConfig: STTProviderConfig = {
            url: localUrl || defaults.url,
            api_key: localApiKey,
            model: localModel || defaults.model,
            available_models: availableModels.length > 0 ? availableModels : (config?.available_models || []),
            enabled: true,
        };

        if (provider === 'google_cloud') {
            newConfig.google_auth_method = googleAuthMethod;
            newConfig.google_project_id = googleProjectId;
            newConfig.google_service_account_json = serviceAccountPath;
        }

        return newConfig;
    };

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
            const updatedConfig: STTProviderConfig = {
                ...testConfig,
                available_models: models,
            };
            await onSaveConfig(updatedConfig);
        } catch (error) {
            console.error('Failed to fetch STT models:', error);
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

    const handleSelectServiceAccountFile = async () => {
        const file = await open({
            multiple: false,
            filters: [{ name: 'JSON', extensions: ['json'] }],
        });
        if (file) {
            setServiceAccountPath(file as string);
            const updatedConfig = buildConfig();
            updatedConfig.google_service_account_json = file as string;
            await onSaveConfig(updatedConfig);
        }
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
                return <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />;
            default:
                return <span className="h-4 w-4 rounded-full bg-zinc-600" />;
        }
    };

    const canTestConnection = () => {
        if (provider === 'google_cloud') {
            if (googleAuthMethod === 'api_key') {
                return localApiKey.length > 0;
            } else {
                return googleProjectId.length > 0 && serviceAccountPath.length > 0;
            }
        }
        return localApiKey.length > 0;
    };

    const displayModels = availableModels.length > 0
        ? availableModels
        : (config?.available_models || [defaults.model]);

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

            <div className="space-y-4">
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
                        data-testid="stt-provider-url-input"
                    />
                </div>

                {provider === 'google_cloud' && (
                    <div>
                        <label className="text-sm text-zinc-400 mb-1 block">
                            {t('Authentication Method')}
                        </label>
                        <Select
                            value={googleAuthMethod}
                            onValueChange={(val) => setGoogleAuthMethod(val as GoogleAuthMethod)}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="api_key">{t('API Key')}</SelectItem>
                                <SelectItem value="service_account">{t('Service Account')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {provider === 'google_cloud' && googleAuthMethod === 'service_account' ? (
                    <>
                        <div>
                            <label className="text-sm text-zinc-400 mb-1 block">
                                {t('Project ID')}
                            </label>
                            <Input
                                value={googleProjectId}
                                onChange={(e) => setGoogleProjectId(e.target.value)}
                                onBlur={handleApiKeyBlur}
                                placeholder={t('Enter your Google Cloud project ID')}
                                className="w-full"
                            />
                        </div>
                        <div>
                            <label className="text-sm text-zinc-400 mb-1 block">
                                {t('Service Account JSON File')}
                            </label>
                            <Button
                                variant="outline"
                                onClick={handleSelectServiceAccountFile}
                                className="w-full justify-start text-left"
                            >
                                <Upload className="w-4 h-4 mr-2" />
                                {serviceAccountPath || t('Select file...')}
                            </Button>
                        </div>
                    </>
                ) : (
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
                                data-testid="stt-provider-api-key-input"
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
                        {provider === 'gemini' && (
                            <p className="text-xs text-zinc-500 mt-1">
                                {t('Get your API key from Google AI Studio')}
                            </p>
                        )}
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
                        >
                            <SelectTrigger
                                className="flex-1"
                                data-testid="stt-provider-model-select"
                            >
                                <SelectValue placeholder={t('Select a model')} />
                            </SelectTrigger>
                            <SelectContent>
                                {displayModels.map((model) => (
                                    <SelectItem key={model} value={model}>
                                        {model}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Page.SecondaryButton
                            size="sm"
                            onClick={handleFetchModels}
                            disabled={isFetching || !canTestConnection()}
                            data-testid="stt-fetch-models-button"
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
                    disabled={isTesting || !canTestConnection()}
                    data-testid="stt-test-connection-button"
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
