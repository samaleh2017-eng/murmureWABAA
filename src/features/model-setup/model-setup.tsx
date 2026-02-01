import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { SetupModeSelection } from './components/setup-mode-selection';
import { SetupModelInfo } from './components/setup-model-info';
import { SetupComplete } from './components/setup-complete';
import { SetupOnlineProvider } from './components/setup-online-provider';
import { useModelDownload } from './hooks/use-model-download';
import { STTMode } from '@/features/settings/stt/hooks/use-stt-settings';

type SetupStep = 'mode' | 'model' | 'online-provider' | 'complete';

export const ModelSetup = () => {
    const [step, setStep] = useState<SetupStep>('mode');
    const navigate = useNavigate();
    const { progress, startDownload, isModelAvailable } = useModelDownload();

    useEffect(() => {
        if (isModelAvailable === true && !progress.is_downloading) {
            navigate({ to: '/' });
        }
    }, [isModelAvailable, progress.is_downloading, navigate]);

    useEffect(() => {
        if (progress.is_complete && step === 'model') {
            setStep('complete');
        }
    }, [progress.is_complete, step]);

    const handleModeSelection = (mode: STTMode) => {
        if (mode === 'offline') {
            setStep('model');
        } else {
            setStep('online-provider');
        }
    };

    const handleOnlineProviderComplete = () => {
        navigate({ to: '/' });
    };

    const handleOnlineProviderBack = () => {
        setStep('mode');
    };

    const handleDownload = async () => {
        await startDownload();
        navigate({ to: '/' });
    };

    const handleRetry = () => {
        startDownload();
    };

    const handleComplete = () => {
        navigate({ to: '/' });
    };

    if (isModelAvailable === null) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-zinc-900">
                <div className="animate-pulse text-zinc-400">Loading...</div>
            </div>
        );
    }

    switch (step) {
        case 'mode':
            return <SetupModeSelection onModeSelect={handleModeSelection} />;
        case 'model':
            return (
                <SetupModelInfo
                    onDownload={handleDownload}
                    onRetry={handleRetry}
                    progress={progress}
                />
            );
        case 'online-provider':
            return (
                <SetupOnlineProvider
                    onComplete={handleOnlineProviderComplete}
                    onBack={handleOnlineProviderBack}
                />
            );
        case 'complete':
            return <SetupComplete onComplete={handleComplete} />;
        default:
            return null;
    }
};
