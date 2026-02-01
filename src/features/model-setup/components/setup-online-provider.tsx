import { useState, useEffect } from 'react';
import { ArrowLeft, Check, Loader2, Plug, RefreshCw, Eye, EyeOff, Sparkles, Upload } from 'lucide-react';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Typography } from '@/components/typography';
import { useTranslation } from '@/i18n';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/select';
import {
    useSTTSettings,
    STTProvider,
    STTProviderConfig,
    STT_PROVIDER_LABELS,
    STT_PROVIDER_DEFAULTS,
    ONLINE_PROVIDERS,
    GoogleAuthMethod,
} from '@/features/settings/stt/hooks/use-stt-settings';
import { open } from '@tauri-apps/plugin-dialog';
import appIcon from '@/assets/app-icon.png';

interface SetupOnlineProviderProps {
    onComplete: () => void;
    onBack: () => void;
}

export const SetupOnlineProvider = ({ onComplete, onBack }: SetupOnlineProviderProps) => {
    const { t } = useTranslation();
    const {
        connectionStatus,
        availableModels,
        testConnection,
        fetchModels,
        saveProviderConfig,
        updateSettings,
        setConnectionStatus,
    } = useSTTSettings();

    const [selectedProvider, setSelectedProvider] = useState<Exclude<STTProvider, 'parakeet'>>('openai');
    const [localUrl, setLocalUrl] = useState('');
    const [localApiKey, setLocalApiKey] = useState('');
    const [localModel, setLocalModel] = useState('');
    const [googleAuthMethod, setGoogleAuthMethod] = useState<GoogleAuthMethod>('api_key');
    const [googleProjectId, setGoogleProjectId] = useState('');
    const [serviceAccountPath, setServiceAccountPath] = useState('');
    const [showApiKey, setShowApiKey] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [isFetching, setIsFetching] = useState(false);
    const [isConnectionValid, setIsConnectionValid] = useState(false);

    const defaults = STT_PROVIDER_DEFAULTS[selectedProvider];

    useEffect(() => {
        setLocalUrl(defaults.url);
        setLocalModel(defaults.model);
        setLocalApiKey('');
        setGoogleProjectId('');
        setServiceAccountPath('');
        setGoogleAuthMethod('api_key');
        setConnectionStatus('disconnected');
        setIsConnectionValid(false);
    }, [selectedProvider, defaults.url, defaults.model, setConnectionStatus]);

    const buildConfig = (): STTProviderConfig => {
        const config: STTProviderConfig = {
            url: localUrl || defaults.url,
            api_key: localApiKey,
            model: localModel || defaults.model,
            available_models: availableModels,
            enabled: true,
        };

        if (selectedProvider === 'google_cloud') {
            config.google_auth_method = googleAuthMethod;
            config.google_project_id = googleProjectId;
            config.google_service_account_json = serviceAccountPath;
        }

        return config;
    };

    const handleTestConnection = async () => {
        setIsTesting(true);
        try {
            const config = buildConfig();
            const success = await testConnection(selectedProvider, config);
            setIsConnectionValid(success);
            if (success) {
                await saveProviderConfig(selectedProvider, config);
            }
        } finally {
            setIsTesting(false);
        }
    };

    const handleFetchModels = async () => {
        setIsFetching(true);
        try {
            const config = buildConfig();
            await fetchModels(selectedProvider, config);
        } finally {
            setIsFetching(false);
        }
    };

    const handleSelectServiceAccountFile = async () => {
        const file = await open({
            multiple: false,
            filters: [{ name: 'JSON', extensions: ['json'] }],
        });
        if (file) {
            setServiceAccountPath(file as string);
        }
    };

    const handleComplete = async () => {
        const config = buildConfig();
        await saveProviderConfig(selectedProvider, config);
        await updateSettings({
            mode: 'online',
            active_provider: selectedProvider,
        });
        onComplete();
    };

    const canTestConnection = () => {
        if (selectedProvider === 'google_cloud') {
            if (googleAuthMethod === 'api_key') {
                return localApiKey.length > 0;
            } else {
                return googleProjectId.length > 0 && serviceAccountPath.length > 0;
            }
        }
        return localApiKey.length > 0;
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-8">
            <div className="flex flex-col items-center space-y-8 max-w-lg w-full">
                <img
                    src={appIcon}
                    alt="Murmure"
                    className="w-20 h-20 rounded-2xl"
                />

                <div className="text-center">
                    <Typography.MainTitle className="text-xl mb-2">
                        {t('Configure Cloud Provider')}
                    </Typography.MainTitle>
                    <Typography.Paragraph className="text-zinc-400">
                        {t('Choose your cloud STT provider and enter your credentials')}
                    </Typography.Paragraph>
                </div>

                <div className="w-full space-y-6">
                    <div>
                        <label className="text-sm text-zinc-400 mb-2 block">
                            {t('Provider')}
                        </label>
                        <Select
                            value={selectedProvider}
                            onValueChange={(val) => setSelectedProvider(val as Exclude<STTProvider, 'parakeet'>)}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder={t('Select provider')} />
                            </SelectTrigger>
                            <SelectContent>
                                {ONLINE_PROVIDERS.map((provider) => (
                                    <SelectItem key={provider} value={provider}>
                                        <div className="flex items-center gap-2">
                                            {provider === 'gemini' && <Sparkles className="w-4 h-4 text-purple-400" />}
                                            {STT_PROVIDER_LABELS[provider]}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-zinc-500 mt-2">
                            {defaults.description}
                        </p>
                    </div>

                    {selectedProvider === 'google_cloud' && (
                        <div>
                            <label className="text-sm text-zinc-400 mb-2 block">
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

                    {selectedProvider === 'google_cloud' && googleAuthMethod === 'service_account' ? (
                        <>
                            <div>
                                <label className="text-sm text-zinc-400 mb-2 block">
                                    {t('Project ID')}
                                </label>
                                <Input
                                    value={googleProjectId}
                                    onChange={(e) => setGoogleProjectId(e.target.value)}
                                    placeholder={t('Enter your Google Cloud project ID')}
                                    className="w-full"
                                />
                            </div>
                            <div>
                                <label className="text-sm text-zinc-400 mb-2 block">
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
                            <label className="text-sm text-zinc-400 mb-2 block">
                                {t('API Key')}
                            </label>
                            <div className="relative">
                                <Input
                                    type={showApiKey ? 'text' : 'password'}
                                    value={localApiKey}
                                    onChange={(e) => setLocalApiKey(e.target.value)}
                                    placeholder={t('Enter your API key')}
                                    className="w-full pr-10"
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
                            {selectedProvider === 'gemini' && (
                                <p className="text-xs text-zinc-500 mt-2">
                                    {t('Get your API key from Google AI Studio')}
                                </p>
                            )}
                        </div>
                    )}

                    <div>
                        <label className="text-sm text-zinc-400 mb-2 block">
                            {t('Model')}
                        </label>
                        <div className="flex items-center gap-2">
                            <Select
                                value={localModel}
                                onValueChange={setLocalModel}
                            >
                                <SelectTrigger className="flex-1">
                                    <SelectValue placeholder={defaults.model} />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableModels.length > 0 ? (
                                        availableModels.map((model) => (
                                            <SelectItem key={model} value={model}>
                                                {model}
                                            </SelectItem>
                                        ))
                                    ) : (
                                        <SelectItem value={defaults.model}>
                                            {defaults.model}
                                        </SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleFetchModels}
                                disabled={isFetching || !canTestConnection()}
                            >
                                <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                            </Button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={handleTestConnection}
                            disabled={isTesting || !canTestConnection()}
                            className="flex-1"
                        >
                            {isTesting ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : connectionStatus === 'connected' ? (
                                <Check className="h-4 w-4 text-green-500 mr-2" />
                            ) : (
                                <Plug className="h-4 w-4 mr-2" />
                            )}
                            {connectionStatus === 'connected' ? t('Connection successful') : t('Test Connection')}
                        </Button>
                    </div>

                    {connectionStatus === 'error' && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                            {t('Connection failed. Please check your credentials.')}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-4 w-full pt-4">
                    <Button
                        variant="ghost"
                        onClick={onBack}
                        className="flex items-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {t('Back')}
                    </Button>
                    <Button
                        onClick={handleComplete}
                        disabled={!isConnectionValid}
                        className="flex-1 bg-gradient-to-r from-sky-800 via-sky-700 to-sky-800 hover:from-sky-500 hover:via-sky-500 hover:to-sky-500"
                        size="lg"
                    >
                        {t('Finish Setup')}
                    </Button>
                </div>
            </div>
        </div>
    );
};
