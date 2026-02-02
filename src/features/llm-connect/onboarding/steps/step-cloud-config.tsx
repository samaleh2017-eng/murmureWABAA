import { useTranslation } from 'react-i18next';
import { Typography } from '@/components/typography';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { Page } from '@/components/page';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/select';
import { Input } from '@/components/input';
import { Eye, EyeOff, CheckCircle2, RefreshCw, AlertCircle, ExternalLink } from 'lucide-react';
import clsx from 'clsx';
import { LLMProvider, PROVIDER_LABELS, ProviderConfig } from '../../hooks/use-llm-connect';

const CLOUD_PROVIDERS: { id: LLMProvider; name: string; url: string; docsUrl: string }[] = [
    { id: 'openai', name: 'OpenAI', url: 'https://api.openai.com/v1', docsUrl: 'https://platform.openai.com/api-keys' },
    { id: 'google', name: 'Google Gemini', url: 'https://generativelanguage.googleapis.com/v1beta', docsUrl: 'https://aistudio.google.com/apikey' },
    { id: 'anthropic', name: 'Anthropic Claude', url: 'https://api.anthropic.com/v1', docsUrl: 'https://console.anthropic.com/settings/keys' },
    { id: 'openrouter', name: 'OpenRouter', url: 'https://openrouter.ai/api/v1', docsUrl: 'https://openrouter.ai/keys' },
];

interface StepCloudConfigProps {
    onNext: () => void;
    onBack: () => void;
    testProviderConnection: (provider: LLMProvider, config: ProviderConfig) => Promise<boolean>;
    saveProviderConfig: (provider: LLMProvider, config: ProviderConfig) => Promise<void>;
    setActiveProvider: (provider: LLMProvider) => Promise<void>;
    fetchProviderModels: (provider: LLMProvider, config: ProviderConfig) => Promise<string[]>;
}

export const StepCloudConfig = ({
    onNext,
    onBack,
    testProviderConnection,
    saveProviderConfig,
    setActiveProvider,
    fetchProviderModels,
}: StepCloudConfigProps) => {
    const { t } = useTranslation();
    const [selectedProvider, setSelectedProvider] = useState<LLMProvider>('openai');
    const [apiKey, setApiKey] = useState('');
    const [showApiKey, setShowApiKey] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const currentProvider = CLOUD_PROVIDERS.find((p) => p.id === selectedProvider);

    const handleTest = async () => {
        if (!apiKey.trim()) {
            setError(t('Please enter an API key'));
            return;
        }

        setIsTesting(true);
        setError(null);

        try {
            const config: ProviderConfig = {
                url: currentProvider?.url || '',
                api_key: apiKey,
                model: '',
                available_models: [],
                enabled: true,
            };

            const success = await testProviderConnection(selectedProvider, config);

            if (success) {
                setIsConnected(true);
                await saveProviderConfig(selectedProvider, config);
                await setActiveProvider(selectedProvider);
                await fetchProviderModels(selectedProvider, config);
            } else {
                setError(t('Connection failed. Check your API key.'));
            }
        } catch {
            setError(t('Connection failed.'));
        } finally {
            setIsTesting(false);
        }
    };

    const handleProviderChange = (provider: LLMProvider) => {
        setSelectedProvider(provider);
        setIsConnected(false);
        setError(null);
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col items-center max-w-2xl mx-auto space-y-8 py-8"
        >
            <div className="text-center space-y-4">
                <Typography.MainTitle>
                    {t('Configure Cloud Provider')}
                </Typography.MainTitle>
                <Typography.Paragraph className="text-zinc-400 max-w-lg mx-auto">
                    {t('Choose your provider and enter your API key to get started.')}
                </Typography.Paragraph>
            </div>

            <div className="w-full bg-zinc-800/30 border border-zinc-800 rounded-xl p-8 space-y-6">
                <div className="space-y-2">
                    <label className="text-sm text-zinc-400">{t('Provider')}</label>
                    <Select value={selectedProvider} onValueChange={handleProviderChange}>
                        <SelectTrigger className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {CLOUD_PROVIDERS.map((provider) => (
                                <SelectItem key={provider.id} value={provider.id}>
                                    {PROVIDER_LABELS[provider.id]}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-sm text-zinc-400">{t('API Key')}</label>
                        {currentProvider && (
                            <a
                                href={currentProvider.docsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1"
                            >
                                {t('Get API key')} <ExternalLink className="w-3 h-3" />
                            </a>
                        )}
                    </div>
                    <div className="relative">
                        <Input
                            type={showApiKey ? 'text' : 'password'}
                            value={apiKey}
                            onChange={(e) => {
                                setApiKey(e.target.value);
                                setIsConnected(false);
                                setError(null);
                            }}
                            placeholder={t('Enter your API key')}
                            className="w-full pr-10"
                        />
                        <button
                            type="button"
                            onClick={() => setShowApiKey(!showApiKey)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-300"
                        >
                            {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <Page.SecondaryButton
                        onClick={handleTest}
                        disabled={isTesting || !apiKey.trim()}
                        className={clsx(
                            isConnected && 'text-emerald-500 hover:bg-emerald-400/10 hover:text-emerald-300'
                        )}
                    >
                        {isTesting ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                                {t('Testing...')}
                            </>
                        ) : isConnected ? (
                            <>
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                {t('Connected')}
                            </>
                        ) : (
                            t('Test Connection')
                        )}
                    </Page.SecondaryButton>

                    {error && (
                        <div className="flex items-center gap-2 text-red-400 text-sm">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex justify-between w-full pt-4">
                <Page.SecondaryButton onClick={onBack}>
                    {t('Back')}
                </Page.SecondaryButton>
                <Page.PrimaryButton
                    onClick={onNext}
                    disabled={!isConnected}
                    size="lg"
                    className="px-8"
                >
                    {t('Next Step')}
                </Page.PrimaryButton>
            </div>
        </motion.div>
    );
};
