import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Monitor, Cloud } from 'lucide-react';
import { useTranslation } from '@/i18n';

interface STTSettings {
    mode: 'offline' | 'online';
    active_provider: string;
}

const PROVIDER_LABELS: Record<string, string> = {
    parakeet: 'Parakeet',
    openai: 'OpenAI',
    google_cloud: 'Google Cloud',
    gemini: 'Gemini',
    groq: 'Groq',
};

export const ModelIndicator = () => {
    const { t } = useTranslation();
    const [settings, setSettings] = useState<STTSettings | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const stt = await invoke<STTSettings>('get_stt_settings');
                setSettings(stt);
            } catch (e) {
                console.error('Failed to load STT settings:', e);
            }
        };
        load();
    }, []);

    if (!settings) return null;

    const isOffline = settings.mode === 'offline';
    const providerLabel = PROVIDER_LABELS[settings.active_provider] || settings.active_provider;

    return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800/50 rounded-full border border-zinc-700/50 text-xs">
            {isOffline ? (
                <>
                    <Monitor className="w-3 h-3 text-green-400" />
                    <span className="text-zinc-300">{t('Offline')}</span>
                    <span className="text-zinc-500">•</span>
                    <span className="text-green-400">Parakeet</span>
                </>
            ) : (
                <>
                    <Cloud className="w-3 h-3 text-sky-400" />
                    <span className="text-zinc-300">{t('Online')}</span>
                    <span className="text-zinc-500">•</span>
                    <span className="text-sky-400">{providerLabel}</span>
                </>
            )}
        </div>
    );
};
