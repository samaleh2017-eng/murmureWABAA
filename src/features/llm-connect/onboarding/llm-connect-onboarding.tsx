import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { StepIntro } from './steps/step-intro';
import { StepProviderChoice, ProviderType } from './steps/step-provider-choice';
import { StepInstall } from './steps/step-install';
import { StepCloudConfig } from './steps/step-cloud-config';
import { StepModel } from './steps/step-model';
import { StepSuccess } from './steps/step-success';
import { LLMConnectSettings, OllamaModel, LLMProvider, ProviderConfig } from '../hooks/use-llm-connect';
import { ProgressBar } from '@/components/progress-bar';

interface LLMConnectOnboardingProps {
    settings: LLMConnectSettings;
    testConnection: (url?: string) => Promise<boolean>;
    pullModel: (model: string) => Promise<void>;
    updateSettings: (updates: Partial<LLMConnectSettings>) => Promise<void>;
    completeOnboarding: () => Promise<void>;
    initialStep?: number;
    models: OllamaModel[];
    fetchModels: () => Promise<OllamaModel[]>;
    isInstallOnly?: boolean;
    testProviderConnection?: (provider: LLMProvider, config: ProviderConfig) => Promise<boolean>;
    saveProviderConfig?: (provider: LLMProvider, config: ProviderConfig) => Promise<void>;
    setActiveProvider?: (provider: LLMProvider) => Promise<void>;
    fetchProviderModels?: (provider: LLMProvider, config: ProviderConfig) => Promise<string[]>;
}

type FlowStep = 'intro' | 'choice' | 'ollama-install' | 'ollama-model' | 'cloud-config' | 'success';

export const LLMConnectOnboarding = ({
    settings,
    testConnection,
    pullModel,
    updateSettings,
    completeOnboarding,
    initialStep = 0,
    models,
    fetchModels,
    isInstallOnly = false,
    testProviderConnection,
    saveProviderConfig,
    setActiveProvider,
    fetchProviderModels,
}: LLMConnectOnboardingProps) => {
    const [step, setStep] = useState<FlowStep>(initialStep === 0 ? 'intro' : 'choice');

    const handleProviderChoice = (type: ProviderType) => {
        if (type === 'local') {
            setStep('ollama-install');
        } else {
            setStep('cloud-config');
        }
    };

    const handleComplete = async () => {
        await completeOnboarding();
    };

    const getProgress = (): number => {
        const progressMap: Record<FlowStep, number> = {
            'intro': 0,
            'choice': 25,
            'ollama-install': 50,
            'ollama-model': 75,
            'cloud-config': 60,
            'success': 100,
        };
        return progressMap[step] || 0;
    };

    const renderStep = () => {
        switch (step) {
            case 'intro':
                return <StepIntro key="intro" onNext={() => setStep('choice')} />;

            case 'choice':
                return <StepProviderChoice key="choice" onSelect={handleProviderChoice} />;

            case 'ollama-install':
                return (
                    <StepInstall
                        key="ollama-install"
                        onNext={() => setStep('ollama-model')}
                        testConnection={testConnection}
                    />
                );

            case 'ollama-model':
                return (
                    <StepModel
                        key="ollama-model"
                        onNext={isInstallOnly ? handleComplete : () => setStep('success')}
                        pullModel={pullModel}
                        updateSettings={updateSettings}
                        settings={settings}
                        models={models}
                        fetchModels={fetchModels}
                        isInstallOnly={isInstallOnly}
                    />
                );

            case 'cloud-config':
                return (
                    <StepCloudConfig
                        key="cloud-config"
                        onNext={() => setStep('success')}
                        onBack={() => setStep('choice')}
                        testProviderConnection={testProviderConnection || (async () => false)}
                        saveProviderConfig={saveProviderConfig || (async () => {})}
                        setActiveProvider={setActiveProvider || (async () => {})}
                        fetchProviderModels={fetchProviderModels || (async () => [])}
                    />
                );

            case 'success':
                return <StepSuccess key="success" onComplete={handleComplete} />;

            default:
                return null;
        }
    };

    if (isInstallOnly) {
        return (
            <div className="min-h-[600px] flex flex-col">
                <div className="flex-1 relative">
                    <AnimatePresence mode="wait">
                        <StepModel
                            key="model-only"
                            onNext={handleComplete}
                            pullModel={pullModel}
                            updateSettings={updateSettings}
                            settings={settings}
                            models={models}
                            fetchModels={fetchModels}
                            isInstallOnly={true}
                        />
                    </AnimatePresence>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-[600px] flex flex-col">
            <ProgressBar progress={getProgress()} />
            <div className="flex-1 relative">
                <AnimatePresence mode="wait">{renderStep()}</AnimatePresence>
            </div>
        </div>
    );
};
