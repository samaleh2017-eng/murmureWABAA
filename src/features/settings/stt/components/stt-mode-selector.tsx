import { Monitor, Cloud } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { STTMode } from '../hooks/use-stt-settings';

interface STTModeSelectorProps {
    value: STTMode;
    onChange: (mode: STTMode) => void;
}

export const STTModeSelector = ({ value, onChange }: STTModeSelectorProps) => {
    const { t } = useTranslation();

    return (
        <div className="flex gap-4">
            <button
                onClick={() => onChange('offline')}
                className={`flex-1 p-4 rounded-lg border transition-all ${
                    value === 'offline'
                        ? 'border-sky-500 bg-sky-500/10'
                        : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                }`}
            >
                <div className="flex items-center gap-3">
                    <div
                        className={`p-2 rounded-lg ${value === 'offline' ? 'bg-sky-500/20' : 'bg-zinc-700'}`}
                    >
                        <Monitor
                            className={`w-5 h-5 ${value === 'offline' ? 'text-sky-400' : 'text-zinc-400'}`}
                        />
                    </div>
                    <div className="text-left">
                        <div
                            className={`font-medium ${value === 'offline' ? 'text-white' : 'text-zinc-300'}`}
                        >
                            {t('Offline')}
                        </div>
                        <div className="text-xs text-zinc-500">
                            {t('Parakeet - 100% private')}
                        </div>
                    </div>
                </div>
            </button>

            <button
                onClick={() => onChange('online')}
                className={`flex-1 p-4 rounded-lg border transition-all ${
                    value === 'online'
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                }`}
            >
                <div className="flex items-center gap-3">
                    <div
                        className={`p-2 rounded-lg ${value === 'online' ? 'bg-purple-500/20' : 'bg-zinc-700'}`}
                    >
                        <Cloud
                            className={`w-5 h-5 ${value === 'online' ? 'text-purple-400' : 'text-zinc-400'}`}
                        />
                    </div>
                    <div className="text-left">
                        <div
                            className={`font-medium ${value === 'online' ? 'text-white' : 'text-zinc-300'}`}
                        >
                            {t('Online')}
                        </div>
                        <div className="text-xs text-zinc-500">
                            {t('Cloud STT - Ultra-fast')}
                        </div>
                    </div>
                </div>
            </button>
        </div>
    );
};
